import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiList, apiCreated, apiErrorForThrown, apiError, ERROR_CODES } from '@/lib/api';
import { authorize, readJson } from '@/lib/api-auth';
import { userAdminSchema, emailSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/auth';

/** GET /api/v1/users — requires `user:manage` (ADMIN). */
export async function GET(request: NextRequest) {
  const auth = await authorize('user:manage');
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 20));
  const role = params.get('role');

  const where = role ? { role } : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      // Never expose password hashes.
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { reservations: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return apiList(items, { total, page, pageSize });
}

/** POST /api/v1/users — requires `user:manage` (ADMIN). */
export async function POST(request: NextRequest) {
  const auth = await authorize('user:manage');
  if (!auth.ok) return auth.response;

  const body = await readJson(request, userAdminSchema);
  if (!body.ok) return body.response;

  if (!body.data.password) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, 'A password is required to create a user.', {
      password: 'Required.',
    });
  }

  try {
    const created = await prisma.user.create({
      data: {
        name: body.data.name,
        email: emailSchema.parse(body.data.email),
        phone: body.data.phone ?? null,
        role: body.data.role,
        isActive: body.data.isActive,
        passwordHash: await hashPassword(body.data.password),
      },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    return apiCreated(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('Unique constraint')) {
      return apiError(ERROR_CODES.CONFLICT, 'That email is already registered.');
    }
    return apiErrorForThrown(err);
  }
}
