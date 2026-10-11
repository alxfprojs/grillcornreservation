'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { hashPassword, revokeAllSessions, verifyPassword } from '@/lib/auth';
import { requireUser } from '@/lib/rbac';
import { cancelReservation } from '@/lib/reservation-service';
import {
  changePasswordSchema,
  fieldErrors,
  updateProfileSchema,
} from '@/lib/validation';

export interface AccountState {
  error?: string;
  success?: string;
  fields?: Record<string, string>;
}

/** Update the signed-in user's own profile. */
export async function updateProfileAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const user = await requireUser();

  const raw = {
    name: String(formData.get('name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error) };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone ?? null },
  });

  revalidatePath('/account', 'layout');
  return { success: 'Profile updated.' };
}

/** Change password, then revoke every other session. */
export async function changePasswordAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get('currentPassword') ?? ''),
    newPassword: String(formData.get('newPassword') ?? ''),
  });

  if (!parsed.success) {
    return { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error) };
  }

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record) return { error: 'Account not found.' };

  if (!(await verifyPassword(parsed.data.currentPassword, record.passwordHash))) {
    return { error: 'That current password is not correct.', fields: { currentPassword: 'Incorrect.' } };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  // Sign out everywhere, then send the user back to sign in.
  await revokeAllSessions(user.id);
  redirect('/login?changed=1');
}

/** Customer-initiated cancellation. */
export async function cancelOwnReservationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');

  // Ownership check: derive the scope from the session, never the form.
  const reservation = await prisma.reservation.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!reservation) throw new Error('NOT_FOUND');

  await cancelReservation(id, user.id, 'Cancelled by customer');

  revalidatePath('/account/reservations');
  redirect(`/account/reservations/${id}?cancelled=1`);
}
