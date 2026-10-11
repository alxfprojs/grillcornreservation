import 'server-only';
import type { z } from 'zod';
import { requireUser, requirePermission, type Permission } from './rbac';
import { apiError, apiErrorForThrown, ERROR_CODES } from './api';
import type { SessionUser } from './auth';

/**
 * Small helpers for Route Handlers.
 *
 * Server Actions and API routes share the same authorization primitives. These
 * wrappers turn the sentinel errors thrown by `lib/rbac.ts` into typed results
 * so handlers read linearly:
 *
 *   const auth = await authorize('catalog:manage');
 *   if (!auth.ok) return auth.response;
 *   // auth.user is non-null here
 */

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: Response };

/** Require a signed-in user, optionally holding a specific permission. */
export async function authorize(permission?: Permission): Promise<AuthResult> {
  try {
    const user = permission ? await requirePermission(permission) : await requireUser();
    return { ok: true, user };
  } catch (err) {
    const forbidden = err instanceof Error && err.message === 'FORBIDDEN';
    return {
      ok: false,
      response: apiError(
        forbidden ? ERROR_CODES.FORBIDDEN : ERROR_CODES.UNAUTHENTICATED,
        forbidden
          ? 'Your account does not have access to this resource.'
          : 'Sign in to continue.',
      ),
    };
  }
}

/** Parse and validate a JSON body, returning a typed result or a 4xx response. */
export async function readJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: apiError(ERROR_CODES.BAD_REQUEST, 'Request body must be valid JSON.'),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: apiErrorForThrown(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}
