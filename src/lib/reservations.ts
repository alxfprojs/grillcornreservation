import 'server-only';
import { prisma } from './prisma';
import { DELIVERY_FEE_CENTS, type Fulfillment } from './constants';
import {
  allowedTransitions,
  canTransition,
  customerCanSetStatus,
  isEditable,
  isTerminal,
} from './status-machine';

/**
 * Reservation domain rules: pricing and re-exports of the status machine.
 *
 * The transition table itself lives in `status-machine.ts` so client components
 * can read it too; the pricing helpers here need the database and stay
 * server-only.
 */

export {
  allowedTransitions,
  canTransition,
  customerCanSetStatus,
  isEditable,
  isTerminal,
};

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export interface PriceLine {
  /** package price x party size */
  subtotalCents: number;
  addonsCents: number;
  deliveryCents: number;
  totalCents: number;
}

export interface AddonPricingInput {
  addonId: string;
  quantity: number;
}

/**
 * Compute totals from current catalog prices.
 *
 * Unit prices are snapshotted onto `ReservationAddon` at booking time, so a
 * later price edit never rewrites the value of an existing order.
 */
export async function priceReservation(
  packageId: string,
  partySize: number,
  fulfillment: Fulfillment,
  addOns: AddonPricingInput[],
): Promise<PriceLine> {
  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) throw new Error('PACKAGE_NOT_FOUND');
  if (!pkg.active) throw new Error('PACKAGE_INACTIVE');
  if (partySize < pkg.minGuests || partySize > pkg.maxGuests) {
    throw new Error('PARTY_SIZE_OUT_OF_RANGE');
  }

  const subtotalCents = pkg.pricePerHead * partySize;

  let addonsCents = 0;
  if (addOns.length > 0) {
    const ids = [...new Set(addOns.map((a) => a.addonId))];
    const catalog = await prisma.addon.findMany({ where: { id: { in: ids }, active: true } });
    const byId = new Map(catalog.map((a) => [a.id, a]));

    for (const line of addOns) {
      const addon = byId.get(line.addonId);
      if (!addon) throw new Error('ADDON_NOT_FOUND');
      const units = addon.priceMode === 'PER_HEAD' ? line.quantity * partySize : line.quantity;
      addonsCents += addon.priceCents * units;
    }
  }

  const deliveryCents = fulfillment === 'DELIVERY' ? DELIVERY_FEE_CENTS : 0;

  return {
    subtotalCents,
    addonsCents,
    deliveryCents,
    totalCents: subtotalCents + addonsCents + deliveryCents,
  };
}

/** Unit price + line total for a single add-on, given the party size. */
export function priceAddonLine(
  priceCents: number,
  priceMode: string,
  quantity: number,
  partySize: number,
): { unitPriceCents: number; lineTotalCents: number } {
  const units = priceMode === 'PER_HEAD' ? quantity * partySize : quantity;
  return { unitPriceCents: priceCents, lineTotalCents: priceCents * units };
}
