import { z } from 'zod';
import {
  ADDON_PRICE_MODES,
  FULFILLMENT_TYPES,
  PARTY_SIZE_MAX,
  PARTY_SIZE_MIN,
  ROLES,
  RESERVATION_STATUSES,
} from './constants';

/** Shared primitives. */
const trimmedString = (min: number, max: number) =>
  z.string().trim().min(min, `Must be at least ${min} characters.`).max(max, `Must be at most ${max} characters.`);

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.');

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(200)
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v), {
    message: 'Include an uppercase letter, a lowercase letter and a number.',
  });

export const roleSchema = z.enum(ROLES);
export const statusSchema = z.enum(RESERVATION_STATUSES);
export const fulfillmentSchema = z.enum(FULFILLMENT_TYPES);
export const priceModeSchema = z.enum(ADDON_PRICE_MODES);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes.');

export const partySizeSchema = z
  .number()
  .int()
  .min(PARTY_SIZE_MIN, `Minimum party size is ${PARTY_SIZE_MIN}.`)
  .max(PARTY_SIZE_MAX, `Maximum party size is ${PARTY_SIZE_MAX}.`);

export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM.');

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerSchema = z
  .object({
    name: trimmedString(2, 80),
    email: emailSchema,
    password: passwordSchema,
    phone: optionalTrimmed(32),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Enter your password.').max(200),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    name: trimmedString(2, 80),
    phone: optionalTrimmed(32),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: passwordSchema,
  })
  .strict();

/** Admin user management. `password` is required on create, optional on update. */
export const userAdminSchema = z
  .object({
    name: trimmedString(2, 80),
    email: emailSchema,
    phone: optionalTrimmed(32),
    role: roleSchema,
    isActive: z.boolean().default(true),
    password: passwordSchema.optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Packages / add-ons
// ---------------------------------------------------------------------------

const packageBaseSchema = z
  .object({
    name: trimmedString(2, 80),
    slug: slugSchema,
    tagline: trimmedString(2, 120),
    description: trimmedString(10, 2000),
    pricePerHead: z.number().int().min(0).max(100_000),
    minGuests: z.number().int().min(1).max(500),
    maxGuests: z.number().int().min(1).max(5000),
    active: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(9999).default(0),
  })
  .strict();

const guestsOrdered = (v: { minGuests?: number; maxGuests?: number }) =>
  v.minGuests === undefined || v.maxGuests === undefined || v.maxGuests >= v.minGuests;

const guestsOrderMessage = { message: 'Max guests must be at least the minimum.', path: ['maxGuests'] };

/** Full create/update payload. */
export const packageSchema = packageBaseSchema.refine(
  (v) => v.maxGuests >= v.minGuests,
  guestsOrderMessage,
);

/** PATCH payload. The cross-field rule only runs when both bounds are supplied. */
export const packagePatchSchema = packageBaseSchema
  .partial()
  .refine(guestsOrdered, guestsOrderMessage);

export const addonSchema = z
  .object({
    name: trimmedString(2, 80),
    slug: slugSchema,
    description: trimmedString(4, 500),
    priceCents: z.number().int().min(0).max(1_000_000),
    priceMode: priceModeSchema,
    active: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(9999).default(0),
  })
  .strict();

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

const slotBaseSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.'),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
    capacity: z.number().int().min(1).max(100_000),
    isOpen: z.boolean().default(true),
    notes: optionalTrimmed(280),
  })
  .strict();

const windowOrdered = (v: { startTime?: string; endTime?: string }) =>
  v.startTime === undefined || v.endTime === undefined || v.endTime > v.startTime;

const windowOrderMessage = { message: 'End time must be after start time.', path: ['endTime'] };

/** Full create/update payload. */
export const slotSchema = slotBaseSchema.refine(windowOrdered, windowOrderMessage);

/** PATCH payload; the window rule only applies when both times are present. */
export const slotPatchSchema = slotBaseSchema.partial().refine(windowOrdered, windowOrderMessage);

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

export const addOnLineSchema = z
  .object({
    addonId: trimmedString(1, 64),
    quantity: z.number().int().min(1).max(999),
  })
  .strict();

export const createReservationSchema = z
  .object({
    slotId: trimmedString(1, 64),
    packageId: trimmedString(1, 64),
    partySize: partySizeSchema,
    fulfillment: fulfillmentSchema,
    addressLine1: optionalTrimmed(160),
    addressLine2: optionalTrimmed(160),
    city: optionalTrimmed(80),
    state: optionalTrimmed(80),
    postalCode: optionalTrimmed(20),
    contactPhone: optionalTrimmed(32),
    notes: optionalTrimmed(1000),
    addOns: z.array(addOnLineSchema).max(25).default([]),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.fulfillment === 'DELIVERY') {
      const missing = (
        [
          ['addressLine1', v.addressLine1],
          ['city', v.city],
          ['state', v.state],
          ['postalCode', v.postalCode],
        ] as const
      ).filter(([, val]) => !val);
      for (const [field] of missing) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: 'Delivery orders need a complete address.',
        });
      }
    }
  });

export const updateReservationSchema = z
  .object({
    partySize: partySizeSchema.optional(),
    fulfillment: fulfillmentSchema.optional(),
    addressLine1: optionalTrimmed(160),
    addressLine2: optionalTrimmed(160),
    city: optionalTrimmed(80),
    state: optionalTrimmed(80),
    postalCode: optionalTrimmed(20),
    contactPhone: optionalTrimmed(32),
    notes: optionalTrimmed(1000),
    addOns: z.array(addOnLineSchema).max(25).optional(),
  })
  .strict();

export const statusChangeSchema = z
  .object({
    status: statusSchema,
    note: optionalTrimmed(500),
  })
  .strict();

export const staffNoteSchema = z
  .object({
    staffNotes: optionalTrimmed(1000),
  })
  .strict();

// ---------------------------------------------------------------------------
// Contact messages
// ---------------------------------------------------------------------------

export const contactMessageSchema = z
  .object({
    name: trimmedString(2, 80),
    email: emailSchema,
    phone: optionalTrimmed(32),
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
      .optional()
      .or(z.literal(''))
      .transform((v) => (v === '' ? undefined : v)),
    partySize: z
      .number()
      .int()
      .min(1)
      .max(5000)
      .optional()
      .or(z.coerce.number().int().min(1).max(5000).optional()),
    message: trimmedString(10, 2000),
    // Honeypot. Not range-validated — a filled value is detected explicitly so
    // the caller can return a benign success instead of a validation error.
    website: z.string().max(200).optional(),
  })
  .strict();

export const contactMessageStatusSchema = z
  .object({
    status: z.enum(['NEW', 'READ', 'ARCHIVED']),
  })
  .strict();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flatten a ZodError into `{ field: message }` for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
