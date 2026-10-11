import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiList, apiCreated, apiErrorForThrown } from '@/lib/api';
import { authorize, readJson } from '@/lib/api-auth';
import { packageSchema } from '@/lib/validation';

/**
 * GET /api/v1/packages
 *
 * Public. Anonymous callers only see active packages; staff and admins can pass
 * `?includeInactive=true` to include hidden entries.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 20));

  const auth = await authorize();
  const includeInactive =
    params.get('includeInactive') === 'true' &&
    auth.ok &&
    (auth.user.role === 'STAFF' || auth.user.role === 'ADMIN');

  const where = includeInactive ? {} : { active: true };

  const [items, total] = await Promise.all([
    prisma.package.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { pricePerHead: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.package.count({ where }),
  ]);

  return apiList(items, { total, page, pageSize });
}

/** POST /api/v1/packages — requires `catalog:manage` (ADMIN). */
export async function POST(request: NextRequest) {
  const auth = await authorize('catalog:manage');
  if (!auth.ok) return auth.response;

  const body = await readJson(request, packageSchema);
  if (!body.ok) return body.response;

  try {
    const created = await prisma.package.create({ data: body.data });
    return apiCreated(created);
  } catch (err) {
    return apiErrorForThrown(err);
  }
}
