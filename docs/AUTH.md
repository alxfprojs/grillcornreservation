# Authentication and authorization

## Sessions

Login creates a row in `Session` and mirrors its token into an httpOnly cookie.

- The token is 32 random bytes, base64url-encoded — not a JWT, and not derived from user data.
- Only the hash-bearing row lives in the database; the raw token exists solely in the cookie.
- Sessions expire after 7 days.
- Deleting a row revokes access on the very next request.

### Why the database and not a stateless JWT

A signed JWT cannot be withdrawn before it expires. Storing the session server-side means:

- an admin deactivating an account takes effect immediately;
- a password change can revoke every other device at once;
- a role change applies on the next request rather than at token expiry.

The cost is one indexed lookup per authenticated request, which is negligible at this scale.

### Cookie attributes

```ts
{
  httpOnly: true,    // unreadable from client-side JS
  sameSite: 'lax',   // not sent on cross-site POSTs
  secure: <protocol-based>, // see below
  path: '/',
  expires: <+7 days>,
}
```

`secure` is decided from the request rather than from `NODE_ENV`:

1. If `x-forwarded-proto` is present, use it — this is what a TLS-terminating proxy sets.
2. Otherwise, treat `localhost` / `127.0.0.1` as insecure so `next start` works over plain HTTP.
3. Otherwise fall back to `NODE_ENV === 'production'`.

Gating on `NODE_ENV` alone silently breaks sessions on a plain-HTTP deployment while looking
correct in development.

---

## Passwords

- **bcrypt**, cost factor 12.
- Policy: at least 10 characters with an uppercase letter, a lowercase letter and a number. Enforced
  by `passwordSchema` on sign-up, admin creation and password change.
- `authenticate()` always runs a bcrypt comparison, even when no account matches, using a dummy
  hash — so a missing account and a wrong password take roughly the same time and cannot be told
  apart by an attacker. Error messages are identical for both cases.

---

## Roles

Three roles, checked by capability rather than by name.

| Role       | Summary                                                        |
| ---------- | -------------------------------------------------------------- |
| `CUSTOMER` | Browses, books, and manages their own reservations             |
| `STAFF`    | Runs the schedule and every reservation; triages the inbox     |
| `ADMIN`    | Full CRUD over the catalogue and user accounts                 |

Public sign-up **always** creates a `CUSTOMER`. Promotion is only possible through an authenticated
admin endpoint, so a caller cannot grant themselves rights by registering with a different payload.

### Permission matrix

Defined once in `src/lib/roles.ts`:

| Permission                | Customer | Staff | Admin |
| ------------------------- | :------: | :---: | :---: |
| `reservation:create`      |    ✓     |   ✓   |   ✓   |
| `reservation:read:own`    |    ✓     |   ✓   |   ✓   |
| `reservation:read:any`    |          |   ✓   |   ✓   |
| `reservation:update:own`  |    ✓     |   ✓   |   ✓   |
| `reservation:update:any`  |          |   ✓   |   ✓   |
| `reservation:cancel:own`  |    ✓     |   ✓   |   ✓   |
| `schedule:manage`         |          |   ✓   |   ✓   |
| `message:manage`          |          |   ✓   |   ✓   |
| `catalog:manage`          |          |       |   ✓   |
| `user:manage`             |          |       |   ✓   |

The `/docs` page renders this table by reading the same exported map, so the documentation cannot
drift from the enforcement.

---

## Enforcement

Two layers, on purpose.

### 1. `src/proxy.ts` — routing only

Runs before rendering, checks only whether the session cookie is **present**, and redirects
anonymous visitors away from `/account` and `/admin`. It never queries the database.

**This is not a security boundary.** It saves a wasted render; it grants nothing.

### 2. Server-side guards — the real boundary

Every page, Server Action and API handler calls one of:

```ts
const user = await requireUser();                   // must be signed in
const user = await requirePermission('catalog:manage'); // must hold a capability
```

Both throw the sentinel errors `UNAUTHENTICATED` / `FORBIDDEN`, which `apiErrorForThrown()` maps to
`401` / `403` and the Server Actions map to a form error.

Ownership is always derived from the session, never from the payload:

```ts
// Safe — the customer can only ever cancel their own order.
const reservation = await prisma.reservation.findFirst({
  where: { id, userId: user.id },
});
```

### Object-level checks

Being allowed to read `/api/v1/reservations` is not the same as being allowed to read a *particular*
reservation. Handlers that take an id re-check ownership and return `404` (not `403`) for another
customer's row, so the API does not confirm that it exists.

| Action                          | Rule                                        |
| ------------------------------- | ------------------------------------------- |
| Read a reservation              | Owner, or `reservation:read:any`            |
| Edit a reservation              | Owner while `PENDING`/`CONFIRMED`, or staff |
| Change status                   | Staff, or owner setting only `CANCELLED`    |
| See `staffNotes`                | `reservation:read:any` only                 |

### Guards against locking yourself out

- An admin cannot delete their own account.
- An admin cannot remove their own admin role.
- An admin cannot deactivate their own account.
- The last active admin cannot be demoted, deactivated or deleted (`409`).

---

## Test accounts

Seeded by `npm run db:seed`. Also listed on the sign-in page outside production, and on `/docs`.

| Role       | Email                      | Password        |
| ---------- | -------------------------- | --------------- |
| Admin      | `admin@grillcorn.test`     | `Admin!2345`    |
| Staff      | `staff@grillcorn.test`     | `Staff!2345`    |
| Customer   | `customer@grillcorn.test`  | `Customer!2345` |
| Customer 2 | `dana@grillcorn.test`      | `Customer!2345` |

The second customer exists so order-ownership isolation can be verified by hand: sign in as
`customer@` and try to open an order belonging to `dana@`.

> Never deploy these. The sign-in page only renders the list when
> `NODE_ENV !== 'production'`, and `demoAccountsEnabled()` can be forced off with
> `SHOW_DEMO_ACCOUNTS=false`.

---

## Adding a role

1. Add the value to `ROLES` in `src/lib/constants.ts`.
2. Add an entry to `ROLE_PERMISSIONS` in `src/lib/roles.ts`.
3. Add a label to `ROLE_LABELS` if it needs a display name.

No call site changes: checks are capability-based, so existing call sites keep working and a new role
inherits exactly the capabilities listed for it.
