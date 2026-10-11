import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Menu',
  description: 'Catering packages and add-ons for fire-roasted corn.',
};

export default async function MenuPage() {
  const [user, packages, addons] = await Promise.all([
    getCurrentUser(),
    prisma.package.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { pricePerHead: 'asc' }],
    }),
    prisma.addon.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { priceCents: 'asc' }],
    }),
  ]);

  const cta = user ? '/book' : '/register';

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">The menu</h1>
        <p className="mt-2 max-w-2xl text-ink-600">
          Everything is grilled to order, so packages are priced per guest. Add-ons are optional and
          can be added to any package at checkout.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink-900">Packages</h2>
        {packages.length === 0 ? (
          <p className="mt-4 text-sm text-ink-600">
            The menu is being updated.{' '}
            <Link href="/#quote" className="font-semibold text-brand-700 hover:underline">
              Send a quote request
            </Link>
            .
          </p>
        ) : (
          <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <article key={pkg.id} className="card flex flex-col p-6">
                <h3 className="text-lg font-semibold text-ink-900">{pkg.name}</h3>
                <p className="mt-1 text-sm font-medium text-brand-700">{pkg.tagline}</p>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-ink-900">
                    {formatMoney(pkg.pricePerHead)}
                  </span>
                  <span className="text-sm text-ink-500">/ guest</span>
                </p>
                <p className="mt-4 flex-1 text-sm whitespace-pre-line text-ink-600">
                  {pkg.description}
                </p>
                <dl className="mt-5 space-y-1 border-t border-ink-100 pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Serves</dt>
                    <dd className="font-medium text-ink-800">
                      {pkg.minGuests}–{pkg.maxGuests} guests
                    </dd>
                  </div>
                </dl>
                <Link href={cta} className="btn-primary mt-5 w-full">
                  Book {pkg.name}
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold text-ink-900">Add-ons</h2>
        <p className="mt-1 text-sm text-ink-600">Available with any package.</p>

        {addons.length === 0 ? (
          <p className="mt-4 text-sm text-ink-600">No add-ons published right now.</p>
        ) : (
          <div className="card mt-5 divide-y divide-ink-100 overflow-hidden">
            {addons.map((addon) => (
              <div key={addon.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink-900">{addon.name}</h3>
                  <p className="mt-0.5 text-sm text-ink-600">{addon.description}</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-ink-900">{formatMoney(addon.priceCents)}</div>
                  <div className="hint">
                    {addon.priceMode === 'PER_HEAD' ? 'per guest' : 'per order'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
