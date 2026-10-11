import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiList, apiCreated, apiErrorForThrown, apiError, ERROR_CODES } from '@/lib/api';
import { authorize, readJson } from '@/lib/api-auth';
import { slotSchema } from '@/lib/validation';
import { fromDateInputValue } from '@/lib/money';

/**
 * GET /api/v1/slots — public availability.
 *
 * Query parameters:
 *   from, to  YYYY-MM-DD bounds (defaults: today .. today+14d)
 *   openOnly  default true
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 20));

  const from =
    fromDateInputValue(params.get('from') ?? '') ?? startOfToday();
  const to =
    fromDateInputValue(params.get('to') ?? '') ??
    new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
  const openOnly = params.get('openOnly') !== 'false';

  const where = { date: { gte: from, lte: to }, ...(openOnly ? { isOpen: true } : {}) };

  const [items, total] = await Promise.all([
    prisma.slot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { reservations: true } } },
    }),
    prisma.slot.count({ where }),
  ]);

  // Surface remaining capacity so clients need not do arithmetic.
  const data = items.map((slot) => ({
    ...slot,
    seatsRemaining: Math.max(0, slot.capacity - slot.seatsUsed),
  }));

  return apiList(data, { total, page, pageSize });
}

/** POST /api/v1/slots — requires `schedule:manage` (STAFF or ADMIN). */
export async function POST(request: NextRequest) {
  const auth = await authorize('schedule:manage');
  if (!auth.ok) return auth.response;

  const body = await readJson(request, slotSchema);
  if (!body.ok) return body.response;

  // slotSchema already enforces the YYYY-MM-DD shape, so this only guards
  // against an impossible calendar date.
  const date = fromDateInputValue(body.data.date);
  if (!date) return apiError(ERROR_CODES.BAD_REQUEST, 'Invalid date.');

  try {
    const created = await prisma.slot.create({
      data: {
        date,
        startTime: body.data.startTime,
        endTime: body.data.endTime,
        capacity: body.data.capacity,
        isOpen: body.data.isOpen,
        notes: body.data.notes ?? null,
      },
    });
    return apiCreated(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('Unique constraint')) {
      return apiErrorForThrown(new Error('CONFLICT'));
    }
    return apiErrorForThrown(err);
  }
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
