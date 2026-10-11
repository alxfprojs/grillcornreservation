import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiOk, apiErrorForThrown, apiError, ERROR_CODES } from '@/lib/api';
import { authorize, readJson } from '@/lib/api-auth';
import { userAdminSchema } from '@/lib/validation';
import { hashPassword, revokeAllSessions } from '@/lib/auth';

/** GET /api/v1/users/:id — requires `user:manage` (ADMIN). */
export async function GET(_request: NextRequest, ctx: RouteContext<'/api/v1/users/[id]'>) {
  const auth = await authorize('user:manage');
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { reservations: true, sessions: true } },
    },
  });
  if (!user) return apiError(ERROR_CODES.NOT_FOUND, 'User not found.');

  return apiOk(user);
}

/** PATCH /api/v1/users/:id — requires `user:manage` (ADMIN). */
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/v1/users/[id]'>) {
  const auth = await authorize('user:manage');
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await readJson(request, userAdminSchema.partial());
  if (!body.ok) return body.response;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return apiError(ERROR_CODES.NOT_FOUND, 'User not found.');

  // Guard rails so an admin cannot lock everyone out of the system.
  if (id === auth.user.id) {
    if (body.data.role && body.data.role !== 'ADMIN') {
      return apiError(ERROR_CODES.FORBIDDEN, 'You cannot remove your own admin access.');
    }
    if (body.data.isActive === false) {
      return apiError(ERROR_CODES.FORBIDDEN, 'You cannot deactivate your own account.');
    }
  }

  const { password, ...profile } = body.data;
  const nextRole = profile.role ?? existing.role;
  const nextActive = profile.isActive ?? existing.isActive;

  if (existing.role === 'ADMIN' && (nextRole !== 'ADMIN' || !nextActive)) {
    const admins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
    if (admins <= 1) {
      return apiError(ERROR_CODES.CONFLICT, 'At least one active admin account must remain.');
    }
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(profile.name !== undefined ? { name: profile.name } : {}),
        ...(profile.email !== undefined ? { email: profile.email } : {}),
        ...(profile.phone !== undefined ? { phone: profile.phone ?? null } : {}),
        ...(profile.role !== undefined ? { role: profile.role } : {}),
        ...(profile.isActive !== undefined ? { isActive: profile.isActive } : {}),
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
      select: { id: true, email: true, name: true, phone: true, role: true, isActive: true },
    });

    // A credential change or deactivation must drop live sessions.
    if (password || nextActive === false) {
      await revokeAllSessions(id);
    }

    return apiOk(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('Unique constraint')) {
      return apiError(ERROR_CODES.CONFLICT, 'That email is already registered.');
    }
    return apiErrorForThrown(err);
  }
}

/** DELETE /api/v1/users/:id — requires `user:manage` (ADMIN). Never deletes yourself. */
export async function DELETE(_request: NextRequest, ctx: RouteContext<'/api/v1/users/[id]'>) {
  const auth = await authorize('user:manage');
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (id === auth.user.id) {
    return apiError(ERROR_CODES.FORBIDDEN, 'You cannot delete your own account.');
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return apiError(ERROR_CODES.NOT_FOUND, 'User not found.');

  if (existing.role === 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
    if (admins <= 1) {
      return apiError(ERROR_CODES.CONFLICT, 'At least one active admin account must remain.');
    }
  }

  try {
    await prisma.user.delete({ where: { id } });
    return apiOk({ id, deleted: true });
  } catch (err) {
    return apiErrorForThrown(err);
  }
}
