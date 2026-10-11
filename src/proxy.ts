import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

/**
 * Coarse route gating (Next.js 16 `proxy` convention, Node.js runtime).
 *
 * This runs on every matched request and only checks *whether a session cookie
 * is present* — it deliberately does not hit the database. It is a UX-level
 * redirect, not a security boundary: every page, server action and API handler
 * re-checks the session and permissions server-side. A user who forges or
 * strips the cookie still cannot read or mutate anything.
 *
 * Pages that need real authorization call `requirePermission()`.
 */

const PROTECTED_PREFIXES = ['/account', '/admin'] as const;

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (isProtected(pathname) && !hasSessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Signed-in users have no reason to see the auth screens.
  if (hasSessionCookie && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/account', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals, the image optimizer and static files.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
