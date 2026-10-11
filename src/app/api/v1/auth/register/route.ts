import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiCreated, apiErrorForThrown, apiError, ERROR_CODES } from '@/lib/api';
import { createSession, hashPassword } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';

const bodySchema = registerSchema;

/**
 * POST /api/v1/auth/register
 *
 * Creates a customer account and signs the caller in. New accounts are always
 * CUSTOMER — role escalation is only possible through the authenticated admin
 * endpoints, never through public sign-up.
 */
export async function POST(request: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (err) {
    return apiErrorForThrown(err);
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return apiError(ERROR_CODES.CONFLICT, 'An account with that email already exists.');
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        role: 'CUSTOMER',
        passwordHash: await hashPassword(body.password),
      },
      select: { id: true, email: true, name: true, phone: true, role: true },
    });

    await createSession(user.id);
    return apiCreated({ user });
  } catch (err) {
    return apiErrorForThrown(err);
  }
}
