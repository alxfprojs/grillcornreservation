import Link from 'next/link';
import type { SessionUser } from '@/lib/session-user';
import { ROLE_LABELS } from '@/lib/constants';
import { VERSION } from '@/lib/version';
import { logoutAction } from '@/app/(auth)/actions';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/schedule', label: 'Availability' },
  { href: '/docs', label: 'Docs' },
];

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-brand-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-ink-900">
          <span aria-hidden className="text-xl">
            🌽
          </span>
          <span className="text-lg">Grill &amp; Corn</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 sm:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-100 hover:text-ink-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link href="/book" className="btn-primary btn-sm">
                Book catering
              </Link>
              {isStaff ? (
                <Link href="/admin" className="btn-secondary btn-sm">
                  Dashboard
                </Link>
              ) : null}
              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold text-ink-900">{user.name}</div>
                <div className="text-xs text-ink-500">{ROLE_LABELS[user.role]}</div>
              </div>
              <form action={logoutAction}>
                <SubmitSignOut />
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary btn-sm">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary btn-sm">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav
        className="flex items-center gap-1 overflow-x-auto border-t border-ink-200 px-4 py-2 sm:hidden"
        aria-label="Main mobile"
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap text-ink-700 hover:bg-ink-100"
          >
            {link.label}
          </Link>
        ))}
        {isStaff ? (
          <Link
            href="/admin"
            className="rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap text-ink-700 hover:bg-ink-100"
          >
            Dashboard
          </Link>
        ) : null}
      </nav>
    </header>
  );
}

function SubmitSignOut() {
  return (
    <button
      type="submit"
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
    >
      Sign out
    </button>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-ink-900">Grill &amp; Corn Catering</div>
          <div className="mt-1">Fire-roasted elote, delivered hot across the city.</div>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <div className="flex gap-4">
            <Link href="/docs" className="hover:text-ink-900">
              Documentation
            </Link>
            <Link href="/api/v1/meta" className="hover:text-ink-900">
              API v1
            </Link>
            <Link href="/changelog" className="hover:text-ink-900">
              Changelog
            </Link>
          </div>
          <div className="text-xs text-ink-400">v{VERSION}</div>
        </div>
      </div>
    </footer>
  );
}
