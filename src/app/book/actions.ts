'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/rbac';
import { createReservation } from '@/lib/reservation-service';
import { priceReservation } from '@/lib/reservations';
import { createReservationSchema, fieldErrors } from '@/lib/validation';

/**
 * Booking submission.
 *
 * The form posts to this action; on success we redirect to the confirmation
 * page carrying the reservation code. On failure we return field errors so the
 * form can re-render in place without losing the user's input.
 */

export interface BookingState {
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string | number>;
}

/** Multi-select of add-ons arrives as repeated `addonId` + `quantity` pairs. */
const addOnsFromForm = (formData: FormData) => {
  const ids = formData.getAll('addonIds').map(String).filter(Boolean);
  const quantities = formData.getAll('addonQuantities').map(Number);
  return ids.map((addonId, i) => ({
    addonId,
    quantity: Number.isFinite(quantities[i]) && quantities[i] > 0 ? Math.floor(quantities[i]) : 1,
  }));
};

export async function createReservationAction(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const user = await requireUser();

  const raw = {
    slotId: String(formData.get('slotId') ?? ''),
    packageId: String(formData.get('packageId') ?? ''),
    partySize: Number(formData.get('partySize') ?? 0),
    fulfillment: String(formData.get('fulfillment') ?? ''),
    addressLine1: String(formData.get('addressLine1') ?? ''),
    addressLine2: String(formData.get('addressLine2') ?? ''),
    city: String(formData.get('city') ?? ''),
    state: String(formData.get('state') ?? ''),
    postalCode: String(formData.get('postalCode') ?? ''),
    contactPhone: String(formData.get('contactPhone') ?? ''),
    notes: String(formData.get('notes') ?? ''),
  };

  const parsed = createReservationSchema.safeParse({
    ...raw,
    addOns: addOnsFromForm(formData),
  });

  if (!parsed.success) {
    return { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error), values: raw };
  }

  let reservation;
  try {
    reservation = await createReservation({ ...parsed.data, userId: user.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'SLOT_FULL' || message === 'SLOT_CLOSED') {
      return {
        error: 'Sorry — that slot just filled up. Pick another time and try again.',
        fields: { slotId: message === 'SLOT_FULL' ? 'No seats left in this slot.' : 'This slot is closed.' },
        values: raw,
      };
    }
    if (message === 'PARTY_SIZE_OUT_OF_RANGE') {
      return {
        error: 'That party size is outside the selected package limits.',
        fields: { partySize: 'Try a different guest count or package.' },
        values: raw,
      };
    }
    if (message === 'PACKAGE_INACTIVE' || message === 'PACKAGE_NOT_FOUND' || message === 'ADDON_NOT_FOUND') {
      return { error: 'Part of your selection is no longer available. Please review the page.', values: raw };
    }
    throw err;
  }

  revalidatePath('/account/reservations');
  revalidatePath('/schedule');
  redirect(`/account/reservations/${reservation.id}?created=1`);
}

/** Live price quote for the booking form, used to show a running total. */
export async function quoteAction(input: unknown) {
  const user = await requireUser();
  void user;

  const schema = z.object({
    packageId: z.string().min(1),
    partySize: z.number().int().min(1).max(5000),
    fulfillment: z.enum(['DELIVERY', 'PICKUP']),
    addOns: z
      .array(z.object({ addonId: z.string().min(1), quantity: z.number().int().min(1).max(999) }))
      .max(25)
      .default([]),
  });

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: 'INVALID' };


  try {
    const prices = await priceReservation(
      parsed.data.packageId,
      parsed.data.partySize,
      parsed.data.fulfillment,
      parsed.data.addOns,
    );
    return { prices };
  } catch {
    return { error: 'UNAVAILABLE' };
  }
}
