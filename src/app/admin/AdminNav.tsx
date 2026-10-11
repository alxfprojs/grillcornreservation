'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isAdminRole } from '@/lib/roles';
import type { Role } from '@/lib/constants';

const LINKS: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/reservations', label: 'Reservations' },
  { href: '/admin/slots', label: 'Schedule' },
  { href: '/admin/messages', label: 'Messages' },
  { href: '/admin/packages', label: 'Packages', adminOnly: true },
  { href: '/admin/addons', label: 'Add-ons', adminOnly: true },
  { href: '/admin/users', label: 'Users', adminOnly: true },
];

export function AdminNav({ role, children }: { role: Role; children: React.ReactNode }) {
  const pathname = usePathname();
  const visible = LINKS.filter((l) => !l.adminOnly || isAdminRole(role));

  return (
    <>
      <header className="mb-8 border-b border-ink-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">Staff dashboard</h1>
        <p className="mt-1 text-sm text-ink-600">
          Signed in as <span className="font-medium text-ink-800">{role}</span>
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[13rem_1fr]">
        <nav aria-label="Dashboard" className="lg:sticky lg:top-24 lg:h-fit">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:pb-0">
            {visible.map((link) => {
              const active =
                link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                      active
                        ? 'bg-ink-900 text-white'
                        : 'text-ink-700 hover:bg-ink-100 hover:text-ink-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
