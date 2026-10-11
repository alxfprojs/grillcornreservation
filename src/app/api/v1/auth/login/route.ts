import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, apiErrorForThrown, apiError, ERROR_CODES } from '@/lib/api';
import { authenticate, createSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';

/**
 * POST /api/v1/auth/login
 *
 * Exchanges credentials for a session cookie (httpOnly, SameSite=Lax).
 * Responses never disclose whether the email exists.
 */
export async function POST(request: NextRequest) {
  let body: z.infer<typeof loginSchema>;
  try {
    body = loginSchema.parse(await request.json());
  } catch (err) {
    return apiErrorForThrown(err);
  }

  const user = await authenticate(body.email, body.password);
  if (!user) {
    return apiError(
      ERROR_CODES.UNAUTHENTICATED,
      'That email and password combination did not match an account.',
    );
  }

  await createSession(user.id);
  return apiOk({ user });
}
