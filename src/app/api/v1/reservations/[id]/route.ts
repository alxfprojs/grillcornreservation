import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiOk, apiErrorForThrown, apiError, ERROR_CODES } from '@/lib/api';
import { authorize, readJson } from '@/lib/api-auth';
import { can } from '@/lib/rbac';
import { updateReservationSchema } from '@/lib/validation';
import { updateReservation, deleteReservation } from '@/lib/reservation-service';

/** GET /api/v1/reservations/:id — owner, staff or admin only. */
export async function GET(_request: NextRequest, ctx: RouteContext<'/api/v1/reservations/[id]'>) {
  const auth = await authorize();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      slot: true,
      package: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
      addons: { include: { addon: true } },
      events: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!reservation) return apiError(ERROR_CODES.NOT_FOUND, 'Reservation not found.');

  // Customers must not see other people's orders or internal staff notes.
  if (reservation.userId !== auth.user.id && !can(auth.user.role, 'reservation:read:any')) {
    return apiError(ERROR_CODES.NOT_FOUND, 'Reservation not found.');
  }
  if (!can(auth.user.role, 'reservation:read:any')) {
    return apiOk({ ...reservation, staffNotes: undefined });
  }

  return apiOk(reservation);
}

/** PATCH /api/v1/reservations/:id — owner (while PENDING/CONFIRMED) or staff. */
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/v1/reservations/[id]'>) {
  const auth = await authorize();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await readJson(request, updateReservationSchema);
  if (!body.ok) return body.response;

  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) return apiError(ERROR_CODES.NOT_FOUND, 'Reservation not found.');

  const isOwner = existing.userId === auth.user.id;
  const isStaff = can(auth.user.role, 'reservation:update:any');
  if (!isOwner && !isStaff) {
    return apiError(ERROR_CODES.NOT_FOUND, 'Reservation not found.');
  }

  try {
    const updated = await updateReservation(id, body.data);
    return apiOk(updated);
  } catch (err) {
    return apiErrorForThrown(err);
  }
}

/** DELETE /api/v1/reservations/:id — requires `reservation:update:any` (staff/admin). */
export async function DELETE(_request: NextRequest, ctx: RouteContext<'/api/v1/reservations/[id]'>) {
  const auth = await authorize('reservation:update:any');
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  try {
    await deleteReservation(id);
    return apiOk({ id, deleted: true });
  } catch (err) {
    return apiErrorForThrown(err);
  }
}
