import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiOk, apiErrorForThrown, apiError, ERROR_CODES } from '@/lib/api';
import { authorize, readJson } from '@/lib/api-auth';
import { can } from '@/lib/rbac';
import { statusChangeSchema } from '@/lib/validation';
import { cancelReservation, transitionReservation } from '@/lib/reservation-service';

/** GET /api/v1/reservations/:id/status — the full status history. */
export async function GET(_request: NextRequest, ctx: RouteContext<'/api/v1/reservations/[id]/status'>) {
  const auth = await authorize();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return apiError(ERROR_CODES.NOT_FOUND, 'Reservation not found.');

  if (reservation.userId !== auth.user.id && !can(auth.user.role, 'reservation:read:any')) {
    return apiError(ERROR_CODES.NOT_FOUND, 'Reservation not found.');
  }

  const events = await prisma.statusEvent.findMany({
    where: { reservationId: id },
    orderBy: { createdAt: 'desc' },
  });

  return apiOk(events, { currentStatus: reservation.status });
}

/**
 * PATCH /api/v1/reservations/:id/status
 *
 * Staff and admins advance a reservation through the workflow. Customers may
 * only move their own order to CANCELLED, and only while it is still editable.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/v1/reservations/[id]/status'>) {
  const auth = await authorize();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await readJson(request, statusChangeSchema);
  if (!body.ok) return body.response;

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return apiError(ERROR_CODES.NOT_FOUND, 'Reservation not found.');

  const isOwner = reservation.userId === auth.user.id;
  const isStaff = can(auth.user.role, 'reservation:update:any');

  if (!isOwner && !isStaff) {
    return apiError(ERROR_CODES.NOT_FOUND, 'Reservation not found.');
  }

  // A customer may cancel, nothing else.
  if (!isStaff && body.data.status !== 'CANCELLED') {
    return apiError(ERROR_CODES.FORBIDDEN, 'You can only cancel a reservation.');
  }

  try {
    if (body.data.status === 'CANCELLED') {
      await cancelReservation(id, auth.user.id, body.data.note ?? 'Cancelled');
    } else {
      await transitionReservation(id, body.data.status, auth.user.id, body.data.note);
    }
  } catch (err) {
    return apiErrorForThrown(err);
  }

  const updated = await prisma.reservation.findUnique({ where: { id } });
  return apiOk(updated);
}
