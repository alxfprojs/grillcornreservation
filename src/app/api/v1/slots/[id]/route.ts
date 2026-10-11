import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiOk, apiErrorForThrown, apiError, ERROR_CODES } from '@/lib/api';
import { authorize, readJson } from '@/lib/api-auth';
import { slotPatchSchema, slotSchema } from '@/lib/validation';
import { fromDateInputValue, toDateInputValue } from '@/lib/money';

/** GET /api/v1/slots/:id */
export async function GET(_request: NextRequest, ctx: RouteContext<'/api/v1/slots/[id]'>) {
  const { id } = await ctx.params;

  const slot = await prisma.slot.findUnique({
    where: { id },
    include: { _count: { select: { reservations: true } } },
  });
  if (!slot) return apiError(ERROR_CODES.NOT_FOUND, 'Slot not found.');

  return apiOk({ ...slot, seatsRemaining: Math.max(0, slot.capacity - slot.seatsUsed) });
}

/**
 * PATCH /api/v1/slots/:id — requires `schedule:manage`.
 *
 * Like the package endpoint, the patch is merged with the stored record before
 * validation so the "end after start" rule is checked against the result.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/v1/slots/[id]'>) {
  const auth = await authorize('schedule:manage');
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await readJson(request, slotPatchSchema);
  if (!body.ok) return body.response;

  try {
    const existing = await prisma.slot.findUnique({ where: { id } });
    if (!existing) return apiError(ERROR_CODES.NOT_FOUND, 'Slot not found.');

    // Project onto exactly the fields the strict schema accepts; the stored
    // record also carries id/seatsUsed/timestamps.
    const patch = stripUndefined(body.data);
    const merged = {
      date: patch.date ?? toDateInputValue(existing.date),
      startTime: patch.startTime ?? existing.startTime,
      endTime: patch.endTime ?? existing.endTime,
      capacity: patch.capacity ?? existing.capacity,
      isOpen: patch.isOpen ?? existing.isOpen,
      notes: patch.notes ?? existing.notes ?? undefined,
    };

    const validated = slotSchema.safeParse(merged);
    if (!validated.success) {
      return apiError(
        ERROR_CODES.VALIDATION_ERROR,
        'The resulting slot failed validation.',
        flattenIssues(validated.error),
      );
    }

    if (validated.data.capacity < existing.seatsUsed) {
      return apiError(
        ERROR_CODES.UNPROCESSABLE,
        `Capacity cannot drop below the ${existing.seatsUsed} seats already booked.`,
      );
    }

    const updated = await prisma.slot.update({
      where: { id },
      data: {
        date: fromDateInputValue(validated.data.date) ?? existing.date,
        startTime: validated.data.startTime,
        endTime: validated.data.endTime,
        capacity: validated.data.capacity,
        isOpen: validated.data.isOpen,
        notes: validated.data.notes ?? null,
      },
    });

    return apiOk(updated);
  } catch (err) {
    return apiErrorForThrown(err);
  }
}

function stripUndefined<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

function flattenIssues(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** DELETE /api/v1/slots/:id — requires `schedule:manage`. Booked slots close instead. */
export async function DELETE(_request: NextRequest, ctx: RouteContext<'/api/v1/slots/[id]'>) {
  const auth = await authorize('schedule:manage');
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  try {
    const booked = await prisma.reservation.count({
      where: { slotId: id, status: { not: 'CANCELLED' } },
    });
    if (booked > 0) {
      return apiOk(
        await prisma.slot.update({ where: { id }, data: { isOpen: false } }),
        { closed: true, reason: 'slot has active reservations' },
      );
    }
    await prisma.slot.delete({ where: { id } });
    return apiOk({ id, deleted: true });
  } catch (err) {
    return apiErrorForThrown(err);
  }
}
