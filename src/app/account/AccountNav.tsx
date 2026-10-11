'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/account', label: 'Profile' },
  { href: '/account/reservations', label: 'My reservations' },
  { href: '/book', label: 'New reservation' },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="lg:sticky lg:top-24 lg:h-fit">
      <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
        {LINKS.map((link) => {
          const active =
            link.href === '/account' ? pathname === '/account' : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-brand-100 text-brand-900'
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
  );
}
