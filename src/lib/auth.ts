import 'server-only';
import { compare, hash } from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { prisma } from './prisma';
import { SESSION_COOKIE_NAME, SESSION_TTL_DAYS, type Role } from './constants';
import type { SessionUser } from './session-user';

export type { SessionUser };

/**
 * Database-backed session auth.
 *
 * Design notes:
 * - Passwords are bcrypt hashes (cost 12).
 * - A session is a random 256-bit token stored in the DB and mirrored into an
 *   httpOnly cookie. The raw token never touches the client-side JS.
 * - Storing sessions server-side (rather than a stateless JWT) means an admin
 *   can revoke access instantly, and a role change takes effect on the next
 *   request rather than at token expiry.
 */

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, digest: string): Promise<boolean> {
  return compare(plain, digest);
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({ data: { token, userId, expiresAt } });

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: await isSecureRequest(),
    path: '/',
    expires: expiresAt,
  });
}

/**
 * Mark the session cookie `Secure` whenever the request actually arrived over
 * HTTPS, including behind a TLS-terminating proxy (which sets
 * `x-forwarded-proto`). Gating this on `NODE_ENV` instead would break
 * `next start` on plain-HTTP localhost, and a real deployment reached over HTTP
 * would silently fail to persist the session.
 */
async function isSecureRequest(): Promise<boolean> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-proto');
  if (forwarded) return forwarded.split(',')[0]?.trim() === 'https';

  const host = h.get('host') ?? '';
  // `next dev` / `next start` default to http://localhost.
  if (host.startsWith('localhost:') || host.startsWith('127.0.0.1:') || host === 'localhost') {
    return false;
  }
  return process.env.NODE_ENV === 'production';
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  store.delete(SESSION_COOKIE_NAME);
}

/** Remove every session belonging to a user (password change, deactivate, delete). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * Resolve the current user from the session cookie.
 * Returns null when there is no valid, unexpired session or the user is disabled.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    // Opportunistic cleanup of an expired row.
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    phone: session.user.phone,
    role: session.user.role as Role,
  };
}

/**
 * Look up the user by email and verify the password.
 * Returns null on any failure, and does not reveal whether the email exists.
 */
export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Always run a bcrypt comparison so a missing account and a wrong password
  // take roughly the same time (avoids user enumeration by timing).
  const digest = user?.passwordHash ?? DUMMY_HASH;
  const ok = await verifyPassword(password, digest);

  if (!user || !ok || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role as Role,
  };
}

/** A real bcrypt hash of a value nobody can guess, used for timing equalisation. */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO1sYw7Zi4uXbIi2JfO5s0Qz3vK1lN3G5S';
