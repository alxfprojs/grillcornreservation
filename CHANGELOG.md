# Changelog

All notable changes to Grill & Corn Catering.

This file is generated from `src/lib/changelog-data.ts` by `npm run changelog`.
Edit that file, not this one.

Current version: **1.0.0** · HTTP API: **v1**

Versions follow [semantic versioning](https://semver.org/). Breaking changes to the
HTTP API ship under a new path (`/api/v2`) rather than altering `/api/v1`.

---

## v1.0.0 — 2026-10-11

_Initial release_

- Public landing page with live package pricing, add-on list, next-available slots and a quote request form.
- Booking flow: slot selection, package and guest count, add-ons, delivery or pickup, and a server-priced running total.
- Customer area: profile, password change, reservation history, reservation detail with a full status timeline, and self-service cancellation.
- Staff dashboard: overview metrics, reservation list with search and status filters, per-order status workflow and internal notes.
- Admin CRUD for catering packages, add-ons, booking slots and user accounts, with archive-instead-of-delete when a record is referenced by historical orders.
- Contact message inbox with NEW / READ / ARCHIVED triage.
- Database-backed session authentication with bcrypt password hashing, httpOnly SameSite=Lax cookies, and instant session revocation.
- Three roles (CUSTOMER, STAFF, ADMIN) enforced by a capability-based permission matrix checked on every server request.
- Versioned REST API at /api/v1 with a consistent response envelope, typed error codes and a machine-readable /api/v1/meta index.
- Atomic seat-capacity claims so concurrent bookings cannot oversell a slot.
- In-app documentation, API reference, permission matrix, workflow table and changelog.
- Seed script creating demo accounts, a realistic menu, three weeks of slots and reservations across every lifecycle state.
