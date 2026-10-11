# Architecture

## Stack

| Concern      | Choice                                          | Why                                                        |
| ------------ | ----------------------------------------------- | ---------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, React 19, Turbopack)     | Server Components and Server Actions keep the whole app in one codebase with no API hop for its own UI |
| Data         | Prisma 7 + SQLite via `better-sqlite3` adapter   | Zero-setup local dev; a datasource swap moves it to Postgres |
| Styling      | Tailwind CSS 4                                   | Design tokens declared once in `globals.css`               |
| Validation   | zod 4                                            | One schema per payload, shared by the form and the API      |
| Passwords    | bcrypt (cost 12)                                 | Deliberate, well-understood cost factor                    |
| Sessions     | Opaque random token in an httpOnly cookie        | Instantly revocable, unlike a stateless JWT                |

> **Prisma 7 note.** The client no longer bundles an engine — a driver adapter is required. The
> `PrismaClient` constructor takes `{ adapter }`, and the CLI reads its config from
> `prisma7.config.ts` rather than `package.json`.

---

## Data model

SQLite has no native enums, so constrained columns are `String` and the canonical values live in
`src/lib/constants.ts`, enforced by zod at every boundary.

```
User ──┬── Session              (one row per login; deleting it revokes access)
       ├── Reservation ──┬── ReservationAddon ── Addon
       │                 ├── StatusEvent          (immutable audit trail)
       │                 └── Slot
       └── ContactMessage

Package ──── Reservation
```

| Model              | Notes                                                                          |
| ------------------ | ------------------------------------------------------------------------------ |
| `User`             | `role` is `CUSTOMER` / `STAFF` / `ADMIN`                                        |
| `Session`          | 256-bit token, 7-day expiry, cascades on user delete                            |
| `Package`          | Catering tier, `pricePerHead` in cents, with `minGuests`/`maxGuests`            |
| `Addon`            | `priceMode` is `PER_ORDER` or `PER_HEAD`                                        |
| `Slot`             | Date + service window with `capacity` and `seatsUsed`; unique per date+start    |
| `Reservation`      | Owns totals and a human-quotable `code`                                         |
| `ReservationAddon` | Join row that **snapshots** unit price at booking time                          |
| `StatusEvent`      | Append-only history of every transition, with the acting user                  |
| `ContactMessage`   | Landing-page quote requests, triaged NEW / READ / ARCHIVED                     |

### Why add-on prices are snapshotted

`ReservationAddon` stores `unitPriceCents` and `lineTotalCents` alongside the quantity rather than
recomputing from `Addon` at read time. An admin raising a price must not silently rewrite the value
of orders already placed — the quoted price is the price.

The same reasoning applies to `Reservation.subtotalCents` / `totalCents`: a total is a fact about a
specific booking, not a live query.

---

## Request lifecycle

```
browser
  │
  ├─ 1. src/proxy.ts ──── session cookie present? ──► redirect if not
  │
  ├─ 2. page / action / route handler
  │       ├─ requireUser() / requirePermission()   ← the actual security boundary
  │       ├─ zod parse
  │       └─ domain operation (lib/)
  │
  └─ 3. response + revalidated RSC payload
```

### `src/proxy.ts` is not the security boundary

The proxy runs on every matched request and deliberately does **not** touch the database — it only
checks whether the session cookie is present, and redirects anonymous visitors away from `/account`
and `/admin`.

This is a fast UX affordance. Every page, Server Action and API handler re-resolves the session and
checks permissions server-side, so a forged or stripped cookie grants nothing. (`/account` even
re-checks after the proxy, to close the window where the page renders before the redirect applies.)

### Validation is shared, not duplicated

Each payload has one zod schema in `src/lib/validation.ts`, consumed by both the Server Action
(reading `FormData`) and the API route (reading JSON). The two surfaces cannot accept different
shapes.

---

## Key decisions and trade-offs

### Atomic capacity claims

Overbooking is the one bug that would actually cost money, so seat allocation is a compare-and-set
rather than a read-then-write:

```ts
const claimed = await tx.slot.updateMany({
  where: {
    id: slotId,
    isOpen: true,
    seatsUsed: { lte: slot.capacity - partySize },   // ← the guard
  },
  data: { seatsUsed: { increment: partySize } },
});
if (claimed.count === 0) throw new Error('SLOT_FULL');
```

The condition lives in the `where` clause, so the database evaluates it as part of the write. Two
customers racing for the last seats cannot both succeed — the second gets `count === 0`.

All of this runs inside a transaction that also creates the reservation and its first
`StatusEvent`, so a failed write leaves no orphan seats.

### Archive instead of delete

Deleting a package, add-on or slot that historical orders reference would either break the foreign
key or orphan a customer's receipt. The delete paths check for references and fall back to setting
`active: false` (packages, add-ons) or `isOpen: false` (slots), returning `200` with
`{ archived: true }` so the caller can tell the difference.

### One status machine, two consumers

`src/lib/status-machine.ts` holds the transition table and is free of `server-only`, so the admin
dropdown and the server read the same definition. The UI cannot offer a move the domain layer would
reject — verified by a test that asserts `PENDING → COMPLETED` returns `422`.

### Role logic is split from session logic

`lib/roles.ts` (the role → permission table) is dependency-free and client-safe. `lib/rbac.ts` (the
`requireUser` / `requirePermission` guards) is `server-only` and pulls in Prisma.

This split is load-bearing: a Client Component that imported from `rbac.ts` would drag the
`better-sqlite3` native module into the browser bundle and fail the build with
`Can't resolve 'fs'`.

### `PATCH` validates the merged result

Sending only `minGuests: 100` to a package whose `maxGuests` is `50` must still be rejected. The
patch endpoint merges the payload with the stored row, projects the result onto exactly the schema's
fields (the stored record also carries `id` and timestamps, which `.strict()` rejects), and runs the
full schema over it. Cross-field rules therefore hold on partial updates.

### Cache Components is off

The Next 16 starter enables `cacheComponents` (PPR). It is disabled here on purpose: almost every
route reads the session cookie and per-user rows, so there is no static shell worth prerendering and
the flag would only force each read behind a Suspense boundary. Enabling it is a per-subtree
decision, not an app-wide one.

---

## Testing

`tsc --noEmit` and `eslint` both run clean. The build was verified end to end against a running
server with 70 assertions covering:

- public reads and the response envelope
- anonymous access control (401) and page-level redirects
- sign-in, session persistence and sign-out
- booking, server-side pricing, and seat consumption
- delivery address validation
- role separation (customer vs staff vs admin) on every surface
- the full status workflow, including terminal states and illegal skips
- cross-user isolation (one customer cannot read another's order)
- admin CRUD, including self-demote and self-delete guards
- honeypot behaviour
- every page rendering

---

## Things deliberately not built

- **Payments.** The flow captures the order; the copy says payment happens on delivery.
- **Email.** Confirmation banners promise a follow-up email, but no transport is wired up.
- **Image uploads.** The hero uses a CSS/SVG treatment rather than shipping binary assets.
