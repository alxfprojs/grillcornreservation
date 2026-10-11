/**
 * Release history, newest first.
 *
 * Kept in code so the `/docs` and `/changelog` pages stay in step with the
 * `VERSION` in `src/lib/version.ts`. `CHANGELOG.md` is generated from this.
 */

export interface Release {
  version: string;
  date: string;
  stage: 'Initial release' | 'Feature' | 'Fix' | 'Change' | 'Breaking';
  changes: string[];
}

export const CHANGELOG: readonly Release[] = [
  {
    version: '1.0.0',
    date: '2026-10-11',
    stage: 'Initial release',
    changes: [
      'Public landing page with live package pricing, add-on list, next-available slots and a quote request form.',
      'Booking flow: slot selection, package and guest count, add-ons, delivery or pickup, and a server-priced running total.',
      'Customer area: profile, password change, reservation history, reservation detail with a full status timeline, and self-service cancellation.',
      'Staff dashboard: overview metrics, reservation list with search and status filters, per-order status workflow and internal notes.',
      'Admin CRUD for catering packages, add-ons, booking slots and user accounts, with archive-instead-of-delete when a record is referenced by historical orders.',
      'Contact message inbox with NEW / READ / ARCHIVED triage.',
      'Database-backed session authentication with bcrypt password hashing, httpOnly SameSite=Lax cookies, and instant session revocation.',
      'Three roles (CUSTOMER, STAFF, ADMIN) enforced by a capability-based permission matrix checked on every server request.',
      'Versioned REST API at /api/v1 with a consistent response envelope, typed error codes and a machine-readable /api/v1/meta index.',
      'Atomic seat-capacity claims so concurrent bookings cannot oversell a slot.',
      'In-app documentation, API reference, permission matrix, workflow table and changelog.',
      'Seed script creating demo accounts, a realistic menu, three weeks of slots and reservations across every lifecycle state.',
    ],
  },
];
