/**
 * Canonical values for the constrained strings in `prisma/schema.prisma`.
 *
 * SQLite has no native enums, so these are the single source of truth for the
 * domain. They are re-used by the zod schemas in `validation.ts` so the UI,
 * the API and the database can never drift apart.
 */

export const ROLES = ['CUSTOMER', 'STAFF', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: 'Customer',
  STAFF: 'Staff',
  ADMIN: 'Admin',
};

/** Reservation lifecycle. Transitions are validated in `lib/reservations.ts`. */
export const RESERVATION_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  OUT_FOR_DELIVERY: 'Out for delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/** Statuses a customer may move a reservation to themselves. */
export const CUSTOMER_SELF_SERVICE_STATUSES = ['CANCELLED'] as const;

/** Tailwind classes per status, for badges. */
export const STATUS_STYLES: Record<ReservationStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-900 ring-amber-300',
  CONFIRMED: 'bg-sky-100 text-sky-900 ring-sky-300',
  PREPARING: 'bg-orange-100 text-orange-900 ring-orange-300',
  OUT_FOR_DELIVERY: 'bg-violet-100 text-violet-900 ring-violet-300',
  COMPLETED: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  CANCELLED: 'bg-stone-200 text-stone-700 ring-stone-300',
};

export const FULFILLMENT_TYPES = ['DELIVERY', 'PICKUP'] as const;
export type Fulfillment = (typeof FULFILLMENT_TYPES)[number];

export const FULFILLMENT_LABELS: Record<Fulfillment, string> = {
  DELIVERY: 'Delivery',
  PICKUP: 'Pickup',
};

export const ADDON_PRICE_MODES = ['PER_ORDER', 'PER_HEAD'] as const;
export type AddonPriceMode = (typeof ADDON_PRICE_MODES)[number];

export const CONTACT_MESSAGE_STATUSES = ['NEW', 'READ', 'ARCHIVED'] as const;
export type ContactMessageStatus = (typeof CONTACT_MESSAGE_STATUSES)[number];

/** Flat delivery fee charged on DELIVERY reservations, in cents. */
export const DELIVERY_FEE_CENTS = 2500;

export const PARTY_SIZE_MIN = 10;
export const PARTY_SIZE_MAX = 500;

/** Session lifetime: 7 days. */
export const SESSION_TTL_DAYS = 7;

export const SESSION_COOKIE_NAME = 'gc_session';
