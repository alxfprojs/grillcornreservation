import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiList, apiCreated, apiErrorForThrown } from '@/lib/api';
import { authorize, readJson } from '@/lib/api-auth';
import { contactMessageSchema } from '@/lib/validation';

/**
 * GET /api/v1/messages — requires `message:manage` (STAFF or ADMIN).
 */
export async function GET(request: NextRequest) {
  const auth = await authorize('message:manage');
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 20));
  const status = params.get('status');

  const where = status ? { status } : {};

  const [items, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contactMessage.count({ where }),
  ]);

  return apiList(items, { total, page, pageSize });
}

/**
 * POST /api/v1/messages — public. The programmatic equivalent of the landing
 * page quote form, including the same honeypot protection.
 */
export async function POST(request: NextRequest) {
  const body = await readJson(request, contactMessageSchema);
  if (!body.ok) return body.response;

  // Honeypot tripped: report success so the bot learns nothing.
  if (body.data.website) return apiCreated({ received: true });

  try {
    const created = await prisma.contactMessage.create({
      data: {
        name: body.data.name,
        email: body.data.email,
        phone: body.data.phone ?? null,
        eventDate: body.data.eventDate ? new Date(`${body.data.eventDate}T00:00:00.000Z`) : null,
        partySize: body.data.partySize ?? null,
        message: body.data.message,
      },
    });
    return apiCreated(created);
  } catch (err) {
    return apiErrorForThrown(err);
  }
}
