# API — `/api/v1`

Version `v1`. The major version lives in the path so a future `v2` can run alongside it without
breaking existing clients.

Base URL: `http://localhost:3000/api/v1`

> The in-app `/docs` page renders the same reference, and `GET /api/v1/meta` returns it in machine
> readable form.

---

## Conventions

### Response envelope

Every response uses the same shape, so a client needs one parser.

**Single resource**

```json
{
  "data": { "id": "clx...", "name": "Clásico" },
  "meta": { "apiVersion": "v1", "appVersion": "1.0.0" }
}
```

**Collection**

```json
{
  "data": [ ... ],
  "meta": {
    "apiVersion": "v1",
    "appVersion": "1.0.0",
    "total": 4, "page": 1, "pageSize": 20, "totalPages": 1
  }
}
```

**Error**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body failed validation.",
    "fields": { "partySize": "Minimum party size is 10." }
  }
}
```

Every response also carries `X-App-Version` and `X-API-Version` headers, and `Cache-Control: no-store`.

### Error codes

| Status | Code               | Meaning                                             |
| ------ | ------------------ | --------------------------------------------------- |
| 400    | `BAD_REQUEST`      | Malformed body or query                             |
| 401    | `UNAUTHENTICATED`  | No valid session                                    |
| 403    | `FORBIDDEN`        | Signed in, but the role lacks the permission       |
| 404    | `NOT_FOUND`        | Missing, or hidden from this caller                 |
| 409    | `CONFLICT`         | Duplicate, or lost a race (e.g. slot filled)        |
| 422    | `VALIDATION_ERROR` | Body failed schema or a domain rule                 |
| 422    | `UNPROCESSABLE`    | Schema is valid but the action is not allowed       |
| 500    | `INTERNAL`         | Unexpected server error                             |

A `404` is returned instead of a `403` when a customer requests someone else's reservation, so the
API does not confirm that the record exists.

### Authentication

`POST /api/v1/auth/login` sets an httpOnly, `SameSite=Lax` session cookie. Send it on subsequent
requests with a cookie jar:

```bash
curl -c jar.txt -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"customer@grillcorn.test","password":"Customer!2345"}'
```

### Money

All money fields are **integer cents** (`pricePerHead`, `totalCents`, `priceCents`, …). There are no
floats anywhere in the pricing path.

### Dates

`YYYY-MM-DD` for calendar dates (slot dates), ISO 8601 for timestamps. Slot dates are stored as
midnight UTC.

---

## Endpoints

### Meta

| Method | Path            | Access   | Description                          |
| ------ | --------------- | -------- | ------------------------------------ |
| `GET`  | `/meta`         | Public   | Version, enums and resource index    |

### Auth

| Method | Path            | Access     | Description                        |
| ------ | --------------- | ---------- | ---------------------------------- |
| `POST` | `/auth/register`| Public     | Create a CUSTOMER account, sign in |
| `POST` | `/auth/login`   | Public     | Sign in                            |
| `POST` | `/auth/logout`  | Signed in  | Revoke the current session         |
| `GET`  | `/auth/me`      | Public     | Current user + effective permissions |

`/auth/me` always returns `200`; an anonymous caller gets `data.user === null` rather than a `401`,
so clients can render a signed-out state without exception handling.

### Packages

| Method   | Path           | Access  | Description                          |
| -------- | -------------- | ------- | ------------------------------------ |
| `GET`    | `/packages`    | Public  | List. `page`, `pageSize`, `includeInactive` |
| `POST`   | `/packages`    | Admin   | Create                               |
| `GET`    | `/packages/:id`| Public  | Fetch one                            |
| `PATCH`  | `/packages/:id`| Admin   | Update                               |
| `DELETE` | `/packages/:id`| Admin   | Delete, or archive if referenced     |

`includeInactive=true` is honoured only for staff and admins.

`PATCH` merges the payload with the stored record and validates **the result**, so cross-field rules
(here: `maxGuests >= minGuests`) hold even when only one side of the pair is sent.

Deleting a package that historical orders reference returns `200` with
`{ archived: true }` instead of removing it, because the orders would otherwise lose their link.

### Add-ons

Identical shape to packages, at `/addons`. `priceMode` is `PER_ORDER` or `PER_HEAD`; a `PER_HEAD`
add-on with `quantity: 2` on a 25-guest order bills 50 units.

### Slots

| Method   | Path         | Access | Description                                     |
| -------- | ------------ | ------ | ----------------------------------------------- |
| `GET`    | `/slots`     | Public | Availability. `from`, `to`, `openOnly`          |
| `POST`   | `/slots`     | Staff  | Create                                          |
| `GET`    | `/slots/:id` | Public | Fetch one, with `seatsRemaining`                |
| `PATCH`  | `/slots/:id` | Staff  | Update, open or close                           |
| `DELETE` | `/slots/:id` | Staff  | Delete, or close if it has active reservations  |

`GET /slots` defaults to today + 14 days and adds a computed `seatsRemaining` so clients do not
repeat the arithmetic.

Capacity cannot be reduced below the seats already booked (`422`).

### Reservations

| Method   | Path                       | Access      | Description                        |
| -------- | -------------------------- | ----------- | ---------------------------------- |
| `GET`    | `/reservations`            | Any         | Own orders; all orders for staff   |
| `POST`   | `/reservations`            | Any         | Create                             |
| `GET`    | `/reservations/:id`        | Owner/staff | With add-ons and full history      |
| `PATCH`  | `/reservations/:id`        | Owner/staff | Edit while PENDING or CONFIRMED    |
| `DELETE` | `/reservations/:id`        | Staff       | Permanently delete                 |
| `GET`    | `/reservations/:id/status` | Owner/staff | Status history                     |
| `PATCH`  | `/reservations/:id/status` | Owner/staff | Advance or cancel                  |

Collections support `status`, `page` and `pageSize`; the response `meta.scope` is `"own"` or `"all"`
so a client can tell which view it got.

Staff-only `staffNotes` is stripped from responses served to customers.

**Create**

```jsonc
{
  "slotId": "clx...",
  "packageId": "clx...",
  "partySize": 25,
  "fulfillment": "DELIVERY",        // or "PICKUP"
  "addressLine1": "2100 Mission St", // required when fulfillment is DELIVERY
  "city": "San Francisco",
  "state": "CA",
  "postalCode": "94110",
  "contactPhone": "+1 555 0100",
  "notes": "Loading dock on B",
  "addOns": [{ "addonId": "clx...", "quantity": 1 }]
}
```

The server prices the order; client-supplied totals are ignored. `meta.code` carries the
human-quotable confirmation code (`GC-7F3K2Q`).

**Status**

```jsonc
{ "status": "CONFIRMED", "note": "Confirmed by phone" }
```

Legal transitions:

| From              | To                                   |
| ----------------- | ------------------------------------ |
| `PENDING`         | `CONFIRMED`, `CANCELLED`             |
| `CONFIRMED`       | `PREPARING`, `CANCELLED`             |
| `PREPARING`       | `OUT_FOR_DELIVERY`, `COMPLETED`, `CANCELLED` |
| `OUT_FOR_DELIVERY`| `COMPLETED`, `CANCELLED`             |
| `COMPLETED`       | — terminal                           |
| `CANCELLED`       | — terminal                           |

Anything else is `422`. A customer may only set `CANCELLED`, and only on their own order. Cancelling
returns the seats to the slot.

### Users

| Method   | Path         | Access | Description                              |
| -------- | ------------ | ------ | ---------------------------------------- |
| `GET`    | `/users`     | Admin  | List. `role` filter supported             |
| `POST`   | `/users`     | Admin  | Create with any role                     |
| `GET`    | `/users/:id` | Admin  | Fetch one                                |
| `PATCH`  | `/users/:id` | Admin  | Update role, status, password            |
| `DELETE` | `/users/:id` | Admin  | Delete                                   |

`passwordHash` is never returned. Changing a password or deactivating an account revokes that
user's sessions immediately. The API refuses to let an admin delete or demote their own account, and
refuses to remove the last active admin (`409`).

### Messages

| Method | Path        | Access | Description                          |
| ------ | ----------- | ------ | ------------------------------------ |
| `GET`  | `/messages` | Staff  | List quote requests                  |
| `POST` | `/messages` | Public | Submit a quote request               |

`POST` accepts an optional `website` honeypot field. A filled value returns `201 { received: true }`
without storing anything, so a bot learns nothing.

---

## Example session

```bash
BASE=http://localhost:3000/api/v1

# 1. Sign in
curl -c jar.txt -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"customer@grillcorn.test","password":"Customer!2345"}'

# 2. Find a slot with room
SLOT=$(curl -s "$BASE/slots?openOnly=true" | jq -r '.data[0].id')
PKG=$(curl  -s $BASE/packages       | jq -r '.data[0].id')

# 3. Book
curl -b jar.txt -X POST $BASE/reservations -H 'Content-Type: application/json' -d "{
  \"slotId\": \"$SLOT\",
  \"packageId\": \"$PKG\",
  \"partySize\": 25,
  \"fulfillment\": \"PICKUP\",
  \"addOns\": []
}"

# 4. Cancel it again
ID=$(curl -b jar.txt $BASE/reservations | jq -r '.data[0].id')
curl -b jar.txt -X PATCH $BASE/reservations/$ID/status \
  -H 'Content-Type: application/json' -d '{"status":"CANCELLED"}'
```
