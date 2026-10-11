import 'server-only';
import { randomBytes } from 'node:crypto';
import { prisma } from './prisma';
import type { Prisma } from '@/generated/prisma/client';
import { type Fulfillment, type ReservationStatus } from './constants';
import { canTransition, priceAddonLine, priceReservation } from './reservations';

/**
 * Write-side reservation operations shared by the UI (Server Actions) and the
 * REST API, so both paths enforce identical rules.
 *
 * Slot capacity is guarded with a conditional `updateMany` rather than
 * read-then-write. SQLite serialises writes, and the `where` clause makes the
 * check-and-set atomic, so two customers racing for the last seats cannot both
 * win.
 */

export interface ReservationInput {
  userId: string;
  slotId: string;
  packageId: string;
  partySize: number;
  fulfillment: Fulfillment;
  addressLine1?: string | undefined;
  addressLine2?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  postalCode?: string | undefined;
  contactPhone?: string | undefined;
  notes?: string | undefined;
  addOns: { addonId: string; quantity: number }[];
}

/** Short, human-quotable confirmation code, e.g. `GC-7F3K2Q`. */
function generateCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
  const bytes = randomBytes(6);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `GC-${out}`;
}

export async function createReservation(input: ReservationInput) {
  const slot = await prisma.slot.findUnique({ where: { id: input.slotId } });
  if (!slot) throw new Error('SLOT_NOT_FOUND');
  if (!slot.isOpen) throw new Error('SLOT_CLOSED');
  if (slot.date.getTime() < startOfTodayMs()) throw new Error('SLOT_CLOSED');

  const prices = await priceReservation(
    input.packageId,
    input.partySize,
    input.fulfillment,
    input.addOns,
  );

  const addonCatalog = await prisma.addon.findMany({
    where: { id: { in: input.addOns.map((a) => a.addonId) } },
  });
  const addonById = new Map(addonCatalog.map((a) => [a.id, a]));

  return prisma.$transaction(async (tx) => {
    // Atomic seat reservation: only succeeds if enough capacity remains.
    const claimed = await tx.slot.updateMany({
      where: {
        id: input.slotId,
        isOpen: true,
        seatsUsed: { lte: slot.capacity - input.partySize },
      },
      data: { seatsUsed: { increment: input.partySize } },
    });

    if (claimed.count === 0) throw new Error('SLOT_FULL');

    // Retry on the astronomically unlikely code collision.
    let code = generateCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await tx.reservation.findUnique({ where: { code } });
      if (!clash) break;
      code = generateCode();
    }

    const reservation = await tx.reservation.create({
      data: {
        code,
        userId: input.userId,
        slotId: input.slotId,
        packageId: input.packageId,
        partySize: input.partySize,
        fulfillment: input.fulfillment,
        addressLine1: input.addressLine1 ?? null,
        addressLine2: input.addressLine2 ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        postalCode: input.postalCode ?? null,
        contactPhone: input.contactPhone ?? null,
        notes: input.notes ?? null,
        status: 'PENDING',
        subtotalCents: prices.subtotalCents,
        addonsCents: prices.addonsCents,
        deliveryCents: prices.deliveryCents,
        totalCents: prices.totalCents,
        addons: {
          create: input.addOns.map((line) => {
            const addon = addonById.get(line.addonId);
            if (!addon) throw new Error('ADDON_NOT_FOUND');
            const { unitPriceCents, lineTotalCents } = priceAddonLine(
              addon.priceCents,
              addon.priceMode,
              line.quantity,
              input.partySize,
            );
            return { addonId: addon.id, quantity: line.quantity, unitPriceCents, lineTotalCents };
          }),
        },
        events: {
          create: { toStatus: 'PENDING', actorId: input.userId, note: 'Reservation created' },
        },
      },
      include: { slot: true, package: true, addons: { include: { addon: true } } },
    });

    return reservation;
  });
}

/**
 * Release or re-claim seats when a reservation's party size changes or it is
 * cancelled / deleted. Any failure restores the original seat count.
 */
async function releaseSeats(tx: Prisma.TransactionClient, slotId: string, partySize: number) {
  await tx.slot.updateMany({
    where: { id: slotId, seatsUsed: { gte: partySize } },
    data: { seatsUsed: { decrement: partySize } },
  });
}

export async function cancelReservation(id: string, actorId: string, note?: string) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({ where: { id } });
    if (!reservation) throw new Error('NOT_FOUND');
    if (reservation.status === 'CANCELLED') throw new Error('INVALID_STATUS_TRANSITION');
    if (reservation.status === 'COMPLETED') throw new Error('RESERVATION_LOCKED');

    // Cancelling never seats anyone.
    await releaseSeats(tx, reservation.slotId, reservation.partySize);

    const updated = await tx.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await tx.statusEvent.create({
      data: {
        reservationId: id,
        fromStatus: reservation.status,
        toStatus: 'CANCELLED',
        actorId,
        note: note ?? 'Cancelled',
      },
    });

    return updated;
  });
}

export async function transitionReservation(
  id: string,
  to: ReservationStatus,
  actorId: string,
  note?: string,
) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({ where: { id } });
    if (!reservation) throw new Error('NOT_FOUND');

    const from = reservation.status as ReservationStatus;
    if (!canTransition(from, to)) throw new Error('INVALID_STATUS_TRANSITION');

    const updated = await tx.reservation.update({ where: { id }, data: { status: to } });

    await tx.statusEvent.create({
      data: { reservationId: id, fromStatus: from, toStatus: to, actorId, note },
    });

    return updated;
  });
}

export async function setStaffNotes(id: string, staffNotes: string | null) {
  return prisma.reservation.update({ where: { id }, data: { staffNotes } });
}

/**
 * Edit an editable reservation. Recomputes totals and reconciles slot capacity
 * in a single transaction, rolling back if the new party size will not fit.
 */
export async function updateReservation(
  id: string,
  changes: {
    partySize?: number;
    fulfillment?: Fulfillment;
    addressLine1?: string | undefined;
    addressLine2?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    postalCode?: string | undefined;
    contactPhone?: string | undefined;
    notes?: string | undefined;
    addOns?: { addonId: string; quantity: number }[];
  },
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.reservation.findUnique({
      where: { id },
      include: { addons: true, slot: true },
    });
    if (!existing) throw new Error('NOT_FOUND');
    if (existing.status !== 'PENDING' && existing.status !== 'CONFIRMED') {
      throw new Error('RESERVATION_LOCKED');
    }

    const partySize = changes.partySize ?? existing.partySize;
    const fulfillment = changes.fulfillment ?? (existing.fulfillment as Fulfillment);
    const addOns = changes.addOns ?? existing.addons.map((a) => ({ addonId: a.addonId, quantity: a.quantity }));

    // --- reconcile capacity ------------------------------------------------
    const delta = partySize - existing.partySize;
    if (delta > 0) {
      const claimed = await tx.slot.updateMany({
        where: { id: existing.slotId, seatsUsed: { lte: existing.slot.capacity - partySize } },
        data: { seatsUsed: { increment: delta } },
      });
      if (claimed.count === 0) throw new Error('SLOT_FULL');
    } else if (delta < 0) {
      await releaseSeats(tx, existing.slotId, -delta);
    }

    // --- reprice -----------------------------------------------------------
    const prices = await priceReservation(existing.packageId, partySize, fulfillment, addOns);

    const addonCatalog = await prisma.addon.findMany({
      where: { id: { in: addOns.map((a) => a.addonId) } },
    });
    const addonById = new Map(addonCatalog.map((a) => [a.id, a]));

    await tx.reservationAddon.deleteMany({ where: { reservationId: id } });
    for (const line of addOns) {
      const addon = addonById.get(line.addonId);
      if (!addon) throw new Error('ADDON_NOT_FOUND');
      const { unitPriceCents, lineTotalCents } = priceAddonLine(
        addon.priceCents,
        addon.priceMode,
        line.quantity,
        partySize,
      );
      await tx.reservationAddon.create({
        data: { reservationId: id, addonId: addon.id, quantity: line.quantity, unitPriceCents, lineTotalCents },
      });
    }

    return tx.reservation.update({
      where: { id },
      data: {
        partySize,
        fulfillment,
        addressLine1: changes.addressLine1 ?? existing.addressLine1,
        addressLine2: changes.addressLine2 ?? existing.addressLine2,
        city: changes.city ?? existing.city,
        state: changes.state ?? existing.state,
        postalCode: changes.postalCode ?? existing.postalCode,
        contactPhone: changes.contactPhone ?? existing.contactPhone,
        notes: changes.notes ?? existing.notes,
        subtotalCents: prices.subtotalCents,
        addonsCents: prices.addonsCents,
        deliveryCents: prices.deliveryCents,
        totalCents: prices.totalCents,
      },
      include: { slot: true, package: true, addons: { include: { addon: true } } },
    });
  });
}

/** Permanently remove a reservation and give its seats back. */
export async function deleteReservation(id: string) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({ where: { id } });
    if (!reservation) throw new Error('NOT_FOUND');

    if (reservation.status !== 'CANCELLED') {
      await releaseSeats(tx, reservation.slotId, reservation.partySize);
    }
    return tx.reservation.delete({ where: { id } });
  });
}

function startOfTodayMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}
