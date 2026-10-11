import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiOk, apiErrorForThrown, apiError, ERROR_CODES } from '@/lib/api';
import { authorize, readJson } from '@/lib/api-auth';
import { addonSchema } from '@/lib/validation';

/** GET /api/v1/addons/:id */
export async function GET(_request: NextRequest, ctx: RouteContext<'/api/v1/addons/[id]'>) {
  const { id } = await ctx.params;

  const addon = await prisma.addon.findUnique({ where: { id } });
  if (!addon) return apiError(ERROR_CODES.NOT_FOUND, 'Add-on not found.');

  if (!addon.active) {
    const auth = await authorize('catalog:manage');
    if (!auth.ok) return apiError(ERROR_CODES.NOT_FOUND, 'Add-on not found.');
  }

  return apiOk(addon);
}

/** PATCH /api/v1/addons/:id — requires `catalog:manage` (ADMIN). */
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/v1/addons/[id]'>) {
  const auth = await authorize('catalog:manage');
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await readJson(request, addonSchema.partial());
  if (!body.ok) return body.response;

  try {
    return apiOk(await prisma.addon.update({ where: { id }, data: body.data }));
  } catch (err) {
    return apiErrorForThrown(err);
  }
}

/** DELETE /api/v1/addons/:id — requires `catalog:manage` (ADMIN). */
export async function DELETE(_request: NextRequest, ctx: RouteContext<'/api/v1/addons/[id]'>) {
  const auth = await authorize('catalog:manage');
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  try {
    const inUse = await prisma.reservationAddon.count({ where: { addonId: id } });
    if (inUse > 0) {
      return apiOk(
        await prisma.addon.update({ where: { id }, data: { active: false } }),
        { archived: true, reason: 'add-on is referenced by existing reservations' },
      );
    }
    await prisma.addon.delete({ where: { id } });
    return apiOk({ id, deleted: true });
  } catch (err) {
    return apiErrorForThrown(err);
  }
}
