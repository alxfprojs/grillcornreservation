'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { authenticate, createSession, destroySession, hashPassword } from '@/lib/auth';
import { emailSchema, fieldErrors, loginSchema, registerSchema } from '@/lib/validation';
import { isAdminRole, isStaffRole } from '@/lib/rbac';
import type { Role } from '@/lib/constants';

/**
 * Server Actions for authentication.
 *
 * Every action follows the same contract: return a `{ error, fields }` shape
 * for recoverable problems and let the client render it via `useActionState`.
 * Control-flow redirects throw, so nothing after them runs.
 */

export interface AuthState {
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
}

function safeNext(next: unknown, fallback = '/account'): string {
  // Only allow same-origin relative paths — blocks open-redirects.
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error), values: raw };
  }

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    // Deliberately vague: do not disclose whether the account exists.
    return {
      error: 'That email and password combination did not match an account.',
      values: { email: raw.email },
    };
  }

  await createSession(user.id);

  redirect(safeNext(formData.get('next')));
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    password: String(formData.get('password') ?? ''),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error), values: raw };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return {
      error: 'An account with that email already exists.',
      fields: { email: 'Already registered — try signing in instead.' },
      values: raw,
    };
  }

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      // New signups are always customers; promotion is an admin action.
      role: 'CUSTOMER',
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (user) await createSession(user.id);

  revalidatePath('/login');
  redirect(safeNext(formData.get('next')));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  revalidatePath('/', 'layout');
  redirect('/');
}

/**
 * Create a user programmatically. Used by the admin UI and the API rather than
 * the public sign-up form, so it accepts an explicit role. Input shape is
 * validated by the caller's schema.
 */
export async function registerUser(input: {
  name: string;
  email: string;
  phone?: string | undefined;
  password: string;
  role?: Role;
}) {
  const role = input.role ?? 'CUSTOMER';
  if (!isAdminRole(role) && !isStaffRole(role) && role !== 'CUSTOMER') {
    throw new Error('INVALID_ROLE');
  }

  return prisma.user.create({
    data: {
      name: input.name,
      email: emailSchema.parse(input.email),
      phone: input.phone ?? null,
      role,
      passwordHash: await hashPassword(input.password),
    },
    select: { id: true, email: true, name: true, role: true },
  });
}
