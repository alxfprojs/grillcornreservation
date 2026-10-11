'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { hashPassword, revokeAllSessions } from '@/lib/auth';
import { requirePermission } from '@/lib/rbac';
import { dollarsToCents } from '@/lib/money';
import {
  cancelReservation,
  deleteReservation,
  setStaffNotes,
  transitionReservation,
} from '@/lib/reservation-service';
import {
  addonSchema,
  contactMessageStatusSchema,
  fieldErrors,
  packageSchema,
  slotSchema,
  statusChangeSchema,
  staffNoteSchema,
  userAdminSchema,
} from '@/lib/validation';

/**
 * Admin CRUD.
 *
 * Every action re-checks the caller's permission server-side — the admin layout
 * gate is convenience, not security. Each returns a `{ error, success, fields }`
 * shape for `useActionState`, or redirects on success where there is nothing
 * useful to render.
 */

export interface AdminState {
  error?: string;
  success?: string;
  fields?: Record<string, string>;
}

const ok = (message: string): AdminState => ({ success: message });
const fail = (message: string, fields?: Record<string, string>): AdminState => ({
  error: message,
  fields,
});

/** Turn domain-layer sentinel errors into readable messages. */
function domainError(err: unknown): AdminState {
  const message = err instanceof Error ? err.message : '';
  const map: Record<string, string> = {
    NOT_FOUND: 'That record no longer exists.',
    SLOT_FULL: 'The slot does not have enough remaining seats for that change.',
    SLOT_CLOSED: 'That slot is closed.',
    INVALID_STATUS_TRANSITION: 'That status change is not allowed from the current state.',
    RESERVATION_LOCKED: 'This reservation is too far along to change.',
    LAST_ADMIN: 'You cannot remove the last active admin account.',
    SELF_DEMOTE: 'You cannot remove your own admin access.',
  };
  return fail(map[message] ?? 'Something went wrong.');
}

function booleanField(formData: FormData, name: string): boolean {
  return formData.get(name) === 'on' || formData.get(name) === 'true';
}

function intField(formData: FormData, name: string, fallback = 0): number {
  const n = Number(formData.get(name));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------

export async function savePackageAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requirePermission('catalog:manage');
  const id = String(formData.get('id') ?? '');

  const priceCents = dollarsToCents(String(formData.get('priceDollars') ?? ''));

  const parsed = packageSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    tagline: String(formData.get('tagline') ?? ''),
    description: String(formData.get('description') ?? ''),
    pricePerHead: priceCents ?? -1,
    minGuests: intField(formData, 'minGuests', 10),
    maxGuests: intField(formData, 'maxGuests', 100),
    active: booleanField(formData, 'active'),
    sortOrder: intField(formData, 'sortOrder', 0),
  });

  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrors(parsed.error));
  if (priceCents === null) {
    return fail('Check the highlighted fields.', { pricePerHead: 'Enter a price like 12.50.' });
  }

  const data = parsed.data;
  const clash = await prisma.package.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== id) return fail('Check the highlighted fields.', { slug: 'Slug already in use.' });

  try {
    if (id) {
      await prisma.package.update({ where: { id }, data });
    } else {
      await prisma.package.create({ data });
    }
  } catch (err) {
    return domainError(err);
  }

  revalidatePath('/admin/packages');
  revalidatePath('/menu');
  revalidatePath('/');
  redirect('/admin/packages?saved=1');
}

export async function deletePackageAction(formData: FormData): Promise<void> {
  await requirePermission('catalog:manage');
  const id = String(formData.get('id') ?? '');

  const inUse = await prisma.reservation.count({ where: { packageId: id } });
  if (inUse > 0) {
    // Deleting would break the foreign key on historical orders; archive instead.
    await prisma.package.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.package.delete({ where: { id } });
  }

  revalidatePath('/admin/packages');
  revalidatePath('/menu');
  revalidatePath('/');
  redirect('/admin/packages?deleted=1');
}

// ---------------------------------------------------------------------------
// Add-ons
// ---------------------------------------------------------------------------

export async function saveAddonAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requirePermission('catalog:manage');
  const id = String(formData.get('id') ?? '');

  const priceCents = dollarsToCents(String(formData.get('priceDollars') ?? ''));

  const parsed = addonSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    description: String(formData.get('description') ?? ''),
    priceCents: priceCents ?? -1,
    priceMode: String(formData.get('priceMode') ?? 'PER_ORDER'),
    active: booleanField(formData, 'active'),
    sortOrder: intField(formData, 'sortOrder', 0),
  });

  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrors(parsed.error));
  if (priceCents === null) {
    return fail('Check the highlighted fields.', { priceCents: 'Enter a price like 45.00.' });
  }

  const data = parsed.data;
  const clash = await prisma.addon.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== id) return fail('Check the highlighted fields.', { slug: 'Slug already in use.' });

  try {
    if (id) {
      await prisma.addon.update({ where: { id }, data });
    } else {
      await prisma.addon.create({ data });
    }
  } catch (err) {
    return domainError(err);
  }

  revalidatePath('/admin/addons');
  revalidatePath('/');
  redirect('/admin/addons?saved=1');
}

export async function deleteAddonAction(formData: FormData): Promise<void> {
  await requirePermission('catalog:manage');
  const id = String(formData.get('id') ?? '');

  const inUse = await prisma.reservationAddon.count({ where: { addonId: id } });
  if (inUse > 0) {
    await prisma.addon.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.addon.delete({ where: { id } });
  }

  revalidatePath('/admin/addons');
  revalidatePath('/');
  redirect('/admin/addons?deleted=1');
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

export async function saveSlotAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requirePermission('schedule:manage');
  const id = String(formData.get('id') ?? '');

  const parsed = slotSchema.safeParse({
    date: String(formData.get('date') ?? ''),
    startTime: String(formData.get('startTime') ?? ''),
    endTime: String(formData.get('endTime') ?? ''),
    capacity: intField(formData, 'capacity', 50),
    isOpen: booleanField(formData, 'isOpen'),
    notes: String(formData.get('notes') ?? ''),
  });

  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrors(parsed.error));

  const date = new Date(`${parsed.data.date}T00:00:00.000Z`);

  try {
    if (id) {
      const existing = await prisma.slot.findUnique({ where: { id } });
      if (!existing) return fail('That slot no longer exists.');
      if (parsed.data.capacity < existing.seatsUsed) {
        return fail('Check the highlighted fields.', {
          capacity: `${existing.seatsUsed} seats are already booked — capacity cannot go below that.`,
        });
      }
      await prisma.slot.update({
        where: { id },
        data: {
          date,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          capacity: parsed.data.capacity,
          isOpen: parsed.data.isOpen,
          notes: parsed.data.notes ?? null,
        },
      });
    } else {
      await prisma.slot.create({
        data: {
          date,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          capacity: parsed.data.capacity,
          isOpen: parsed.data.isOpen,
          notes: parsed.data.notes ?? null,
        },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('Unique constraint')) {
      return fail('Check the highlighted fields.', { startTime: 'A slot already exists for that date and time.' });
    }
    return domainError(err);
  }

  revalidatePath('/admin/slots');
  revalidatePath('/schedule');
  revalidatePath('/');
  redirect('/admin/slots?saved=1');
}

export async function deleteSlotAction(formData: FormData): Promise<void> {
  await requirePermission('schedule:manage');
  const id = String(formData.get('id') ?? '');

  const booked = await prisma.reservation.count({ where: { slotId: id, status: { notIn: ['CANCELLED'] } } });
  if (booked > 0) {
    // Closing keeps the history intact; deleting a booked slot would orphan orders.
    await prisma.slot.update({ where: { id }, data: { isOpen: false } });
  } else {
    await prisma.slot.delete({ where: { id } });
  }

  revalidatePath('/admin/slots');
  revalidatePath('/schedule');
  revalidatePath('/');
  redirect('/admin/slots?deleted=1');
}

export async function toggleSlotAction(formData: FormData): Promise<void> {
  await requirePermission('schedule:manage');
  const id = String(formData.get('id') ?? '');
  const slot = await prisma.slot.findUnique({ where: { id } });
  if (!slot) return;

  await prisma.slot.update({ where: { id }, data: { isOpen: !slot.isOpen } });
  revalidatePath('/admin/slots');
  revalidatePath('/schedule');
  revalidatePath('/');
}

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

export async function changeReservationStatusAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const user = await requirePermission('reservation:update:any');
  const id = String(formData.get('id') ?? '');

  const parsed = statusChangeSchema.safeParse({
    status: String(formData.get('status') ?? ''),
    note: String(formData.get('note') ?? ''),
  });
  if (!parsed.success) return fail('Choose a valid status.');

  try {
    // Completed and cancelled give the seats back; intermediate moves do not.
    if (parsed.data.status === 'CANCELLED') {
      await cancelReservation(id, user.id, parsed.data.note);
    } else {
      await transitionReservation(id, parsed.data.status, user.id, parsed.data.note);
    }
  } catch (err) {
    return domainError(err);
  }

  revalidatePath('/admin/reservations');
  revalidatePath('/account/reservations');
  return ok(`Moved to ${parsed.data.status}.`);
}

export async function saveStaffNotesAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requirePermission('reservation:update:any');
  const id = String(formData.get('id') ?? '');

  const parsed = staffNoteSchema.safeParse({ staffNotes: String(formData.get('staffNotes') ?? '') });
  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrors(parsed.error));

  try {
    await setStaffNotes(id, parsed.data.staffNotes ?? null);
  } catch (err) {
    return domainError(err);
  }

  revalidatePath(`/admin/reservations/${id}`);
  return ok('Internal note saved.');
}

export async function deleteReservationAction(formData: FormData): Promise<void> {
  await requirePermission('reservation:update:any');
  const id = String(formData.get('id') ?? '');

  try {
    await deleteReservation(id);
  } catch {
    // Fall through to the redirect; the list has already been revalidated.
  }

  revalidatePath('/admin/reservations');
  redirect('/admin/reservations?deleted=1');
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function saveUserAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const actor = await requirePermission('user:manage');
  const id = String(formData.get('id') ?? '');

  const parsed = userAdminSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    role: String(formData.get('role') ?? 'CUSTOMER'),
    isActive: booleanField(formData, 'isActive'),
    password: String(formData.get('password') ?? ''),
  });

  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrors(parsed.error));

  const { password, ...profile } = parsed.data;
  if (!id && !password) {
    return fail('Check the highlighted fields.', { password: 'A new account needs a password.' });
  }

  // Guard rails: never let the last admin lock everyone out.
  if (id === actor.id) {
    if (profile.role !== 'ADMIN') return fail('You cannot remove your own admin access.', { role: 'Set your own role to Admin.' });
    if (!profile.isActive) return fail('You cannot deactivate your own account.', { isActive: 'You cannot deactivate yourself.' });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (existing?.role === 'ADMIN' && (profile.role !== 'ADMIN' || !profile.isActive)) {
    const admins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
    if (admins <= 1) return fail('At least one active admin account must remain.');
  }

  const clash = await prisma.user.findUnique({ where: { email: profile.email } });
  if (clash && clash.id !== id) return fail('Check the highlighted fields.', { email: 'That email is already registered.' });

  try {
    if (id) {
      await prisma.user.update({
        where: { id },
        data: {
          ...profile,
          phone: profile.phone ?? null,
          ...(password ? { passwordHash: await hashPassword(password) } : {}),
        },
      });
      // A password change or a deactivation must not leave live sessions behind.
      if (password || !profile.isActive) await revokeAllSessions(id);
    } else {
      await prisma.user.create({
        data: {
          ...profile,
          phone: profile.phone ?? null,
          passwordHash: await hashPassword(password!),
        },
      });
    }
  } catch (err) {
    return domainError(err);
  }

  revalidatePath('/admin/users');
  redirect('/admin/users?saved=1');
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('user:manage');
  const id = String(formData.get('id') ?? '');

  if (id === actor.id) return; // never delete your own account

  const target = await prisma.user.findUnique({ where: { id } });
  if (target?.role === 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
    if (admins <= 1) return;
  }

  // Reservations cascade with the user; status history keeps its actor as null.
  await prisma.user.delete({ where: { id } }).catch(() => {});

  revalidatePath('/admin/users');
  redirect('/admin/users?deleted=1');
}

// ---------------------------------------------------------------------------
// Contact messages
// ---------------------------------------------------------------------------

export async function setMessageStatusAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requirePermission('message:manage');
  const id = String(formData.get('id') ?? '');

  const parsed = contactMessageStatusSchema.safeParse({ status: String(formData.get('status') ?? '') });
  if (!parsed.success) return fail('Invalid status.');

  await prisma.contactMessage.update({ where: { id }, data: { status: parsed.data.status } });
  revalidatePath('/admin/messages');
  return ok('Updated.');
}

export async function deleteMessageAction(formData: FormData): Promise<void> {
  await requirePermission('message:manage');
  const id = String(formData.get('id') ?? '');
  await prisma.contactMessage.delete({ where: { id } }).catch(() => {});

  revalidatePath('/admin/messages');
  redirect('/admin/messages?deleted=1');
}
