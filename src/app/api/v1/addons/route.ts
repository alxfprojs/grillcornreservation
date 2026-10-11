import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiList, apiCreated, apiErrorForThrown } from '@/lib/api';
import { authorize, readJson } from '@/lib/api-auth';
import { addonSchema } from '@/lib/validation';

/** GET /api/v1/addons — public; `?includeInactive=true` for staff and admins. */
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
    prisma.addon.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { priceCents: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.addon.count({ where }),
  ]);

  return apiList(items, { total, page, pageSize });
}

/** POST /api/v1/addons — requires `catalog:manage` (ADMIN). */
export async function POST(request: NextRequest) {
  const auth = await authorize('catalog:manage');
  if (!auth.ok) return auth.response;

  const body = await readJson(request, addonSchema);
  if (!body.ok) return body.response;

  try {
    return apiCreated(await prisma.addon.create({ data: body.data }));
  } catch (err) {
    return apiErrorForThrown(err);
  }
}
