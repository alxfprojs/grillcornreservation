import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiList, apiCreated, apiErrorForThrown, ERROR_CODES, apiError } from '@/lib/api';
import { authorize, readJson } from '@/lib/api-auth';
import { can } from '@/lib/rbac';
import { createReservationSchema, statusSchema } from '@/lib/validation';
import { createReservation } from '@/lib/reservation-service';
import type { Prisma } from '@/generated/prisma/client';

/**
 * GET /api/v1/reservations
 *
 * Customers see only their own orders. Staff and admins see everything.
 * Supports `?status=`, `?from=`, `?to=` and pagination.
 */
export async function GET(request: NextRequest) {
  const auth = await authorize();
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 20));

  const status = params.get('status');
  const readAll = can(auth.user.role, 'reservation:read:any');

  const where: Prisma.ReservationWhereInput = {
    ...(readAll ? {} : { userId: auth.user.id }),
    ...(status && statusSchema.safeParse(status).success ? { status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        slot: { select: { id: true, date: true, startTime: true, endTime: true } },
        package: { select: { id: true, name: true, slug: true, pricePerHead: true } },
        addons: { include: { addon: { select: { id: true, name: true, slug: true } } } },
      },
    }),
    prisma.reservation.count({ where }),
  ]);

  return apiList(items, { total, page, pageSize, scope: readAll ? 'all' : 'own' });
}

/** POST /api/v1/reservations — create a booking for the signed-in customer. */
export async function POST(request: NextRequest) {
  const auth = await authorize('reservation:create');
  if (!auth.ok) return auth.response;

  const body = await readJson(request, createReservationSchema);
  if (!body.ok) return body.response;

  try {
    const reservation = await createReservation({ ...body.data, userId: auth.user.id });
    return apiCreated(reservation, { code: reservation.code });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'SLOT_FULL' || message === 'SLOT_CLOSED') {
      return apiError(ERROR_CODES.CONFLICT, 'That slot is no longer available.');
    }
    return apiErrorForThrown(err);
  }
}
