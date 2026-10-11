import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiOk, apiErrorForThrown, apiError, ERROR_CODES } from '@/lib/api';
import { authorize, readJson } from '@/lib/api-auth';
import { packagePatchSchema, packageSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/** GET /api/v1/packages/:id */
export async function GET(_request: NextRequest, ctx: RouteContext<'/api/v1/packages/[id]'>) {
  const { id } = await ctx.params;

  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) return apiError(ERROR_CODES.NOT_FOUND, 'Package not found.');

  if (!pkg.active) {
    const auth = await authorize('catalog:manage');
    if (!auth.ok) return apiError(ERROR_CODES.NOT_FOUND, 'Package not found.');
  }

  return apiOk(pkg);
}

/**
 * PATCH /api/v1/packages/:id — requires `catalog:manage` (ADMIN).
 *
 * The patch is merged with the stored record and the *merged* result is run
 * through the full schema, so cross-field rules (max guests >= min guests)
 * still hold when only one side of the pair is being changed.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/v1/packages/[id]'>) {
  const auth = await authorize('catalog:manage');
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await readJson(request, packagePatchSchema);
  if (!body.ok) return body.response;

  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing) return apiError(ERROR_CODES.NOT_FOUND, 'Package not found.');

  // Project onto exactly the fields the strict schema accepts; the stored
  // record also carries id/createdAt/updatedAt, which `.strict()` rejects.
  const patch = stripUndefined(body.data);
  const merged = {
    name: patch.name ?? existing.name,
    slug: patch.slug ?? existing.slug,
    tagline: patch.tagline ?? existing.tagline,
    description: patch.description ?? existing.description,
    pricePerHead: patch.pricePerHead ?? existing.pricePerHead,
    minGuests: patch.minGuests ?? existing.minGuests,
    maxGuests: patch.maxGuests ?? existing.maxGuests,
    active: patch.active ?? existing.active,
    sortOrder: patch.sortOrder ?? existing.sortOrder,
  };

  const validated = packageSchema.safeParse(merged);
  if (!validated.success) {
    return apiError(
      ERROR_CODES.VALIDATION_ERROR,
      'The resulting package failed validation.',
      flatten(validated.error),
    );
  }

  try {
    return apiOk(
      await prisma.package.update({
        where: { id },
        data: {
          name: validated.data.name,
          slug: validated.data.slug,
          tagline: validated.data.tagline,
          description: validated.data.description,
          pricePerHead: validated.data.pricePerHead,
          minGuests: validated.data.minGuests,
          maxGuests: validated.data.maxGuests,
          active: validated.data.active,
          sortOrder: validated.data.sortOrder,
        },
      }),
    );
  } catch (err) {
    return apiErrorForThrown(err);
  }
}

/** DELETE /api/v1/packages/:id — requires `catalog:manage` (ADMIN). */
export async function DELETE(_request: NextRequest, ctx: RouteContext<'/api/v1/packages/[id]'>) {
  const auth = await authorize('catalog:manage');
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  try {
    const inUse = await prisma.reservation.count({ where: { packageId: id } });
    if (inUse > 0) {
      // Referenced by historical orders: archive rather than break the FK.
      return apiOk(
        await prisma.package.update({ where: { id }, data: { active: false } }),
        { archived: true, reason: 'package is referenced by existing reservations' },
      );
    }
    await prisma.package.delete({ where: { id } });
    return apiOk({ id, deleted: true });
  } catch (err) {
    return apiErrorForThrown(err);
  }
}

function stripUndefined<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

function flatten(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
