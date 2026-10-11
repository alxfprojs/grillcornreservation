import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { QuoteForm } from '@/components/QuoteForm';

export default async function HomePage() {
  const [user, packages, addons, nextSlots] = await Promise.all([
    getCurrentUser(),
    prisma.package.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { pricePerHead: 'asc' }],
      take: 3,
    }),
    prisma.addon.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' }, take: 4 }),
    prisma.slot.findMany({
      where: { isOpen: true, date: { gte: startOfToday() } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 3,
      select: { id: true, date: true, startTime: true, endTime: true, capacity: true, seatsUsed: true },
    }),
  ]);

  // The primary call to action: a signed-in user goes straight to the booking
  // form, everyone else is sent to sign up first.
  const ctaHref = user ? '/book' : '/register';
  const ctaLabel = user ? 'Book catering' : 'Create an account to book';

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-100 to-brand-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="badge bg-ember-100 text-ember-700 ring-ember-300">
              Fire-roasted &middot; Delivered hot
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-ink-900 sm:text-5xl">
              Corn so good
              <br />
              your guests will talk about it.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-700">
              We char sweet corn over an open flame, roll it in chile-lime butter and ship it to
              your door still sizzling. Pick a package, choose a slot, and we handle the rest.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={ctaHref} className="btn-primary px-6 py-3 text-base">
                {ctaLabel} &rarr;
              </Link>
              <Link href="/menu" className="btn-secondary px-6 py-3 text-base">
                See the menu
              </Link>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-ink-200 pt-6">
              <Stat value="4.9/5" label="Average rating" />
              <Stat value="20 min" label="Grill to door" />
              <Stat value="500" label="Max per event" />
            </dl>
          </div>

          {/* Decorative cob — pure CSS/SVG, no image assets required. */}
          <div className="relative mx-auto hidden aspect-square w-full max-w-sm lg:block">
            <div className="absolute inset-0 rounded-full bg-brand-300/40 blur-3xl" />
            <div className="relative grid h-full place-items-center text-[10rem]" aria-hidden>
              🌽
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight text-ink-900">How it works</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            {
              n: '1',
              title: 'Choose a package',
              body: 'Every tier is priced per guest and includes the corn, the butter, the lime and the trays.',
            },
            {
              n: '2',
              title: 'Lock in a slot',
              body: 'Pick a service window that suits you. Capacity is limited so the grill never runs cold.',
            },
            {
              n: '3',
              title: 'We grill, you eat',
              body: 'We deliver hot or meet you at pickup, then text when your order is on the way.',
            },
          ].map((step) => (
            <li key={step.n} className="card-pad">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                {step.n}
              </div>
              <h3 className="mt-4 font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* -------------------------------------------------------------- Packages */}
      {packages.length > 0 ? (
        <section className="border-y border-ink-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink-900">
                  Catering packages
                </h2>
                <p className="mt-2 text-ink-600">Per-guest pricing. No hidden fees.</p>
              </div>
              <Link href="/menu" className="btn-secondary">
                Full menu
              </Link>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {packages.map((pkg) => (
                <div key={pkg.id} className="card flex flex-col p-6">
                  <h3 className="text-lg font-semibold text-ink-900">{pkg.name}</h3>
                  <p className="hint mt-1">{pkg.tagline}</p>
                  <p className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-brand-700">
                      {formatMoney(pkg.pricePerHead)}
                    </span>
                    <span className="text-sm text-ink-500">/ guest</span>
                  </p>
                  <p className="mt-4 flex-1 text-sm text-ink-600">{pkg.description}</p>
                  <p className="mt-4 text-xs text-ink-500">
                    {pkg.minGuests}–{pkg.maxGuests} guests
                  </p>
                  <Link href={ctaHref} className="btn-secondary mt-4 w-full">
                    Book this
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------ Add-ons + slots */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink-900">Add-ons</h2>
          <p className="mt-2 text-ink-600">Top up any package.</p>
          <ul className="mt-6 space-y-3">
            {addons.map((addon) => (
              <li key={addon.id} className="card flex items-start justify-between gap-4 p-4">
                <div>
                  <h3 className="font-semibold text-ink-900">{addon.name}</h3>
                  <p className="mt-0.5 text-sm text-ink-600">{addon.description}</p>
                  <p className="hint mt-1">
                    {addon.priceMode === 'PER_HEAD' ? 'per guest' : 'per order'}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-ink-900">
                  {formatMoney(addon.priceCents)}
                </span>
              </li>
            ))}
            {addons.length === 0 ? <EmptyNote label="No add-ons published yet." /> : null}
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink-900">Next available</h2>
          <p className="mt-2 text-ink-600">Live capacity from the booking schedule.</p>
          <ul className="mt-6 space-y-3">
            {nextSlots.map((slot) => {
              const remaining = Math.max(0, slot.capacity - slot.seatsUsed);
              return (
                <li key={slot.id} className="card flex items-center justify-between gap-4 p-4">
                  <div>
                    <h3 className="font-semibold text-ink-900">
                      {new Intl.DateTimeFormat('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      }).format(slot.date)}
                    </h3>
                    <p className="hint mt-0.5">
                      {slot.startTime}–{slot.endTime}
                    </p>
                  </div>
                  <span
                    className={`badge shrink-0 ${
                      remaining === 0
                        ? 'bg-red-50 text-red-700 ring-red-200'
                        : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    }`}
                  >
                    {remaining === 0 ? 'Full' : `${remaining} seats left`}
                  </span>
                </li>
              );
            })}
            {nextSlots.length === 0 ? (
              <EmptyNote label="No open slots published. Send us a quote request and we will open one up." />
            ) : null}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------------- Quote CTA */}
      <section className="border-t border-ink-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-900">
              Need something custom?
            </h2>
            <p className="mt-4 text-ink-600">
              Corporate offsites, weddings, street festivals — if it involves corn and a crowd, we
              can do it. Tell us the details and a human will reply within one business day.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-ink-700">
              {[
                'Vegan, gluten-free and nut-free options',
                'Branding and signage for corporate clients',
                'On-site grilling for festivals and weddings',
                'Split delivery across multiple addresses',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 text-brand-600">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <QuoteForm />
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-2xl font-black text-ink-900">{value}</dt>
      <dd className="mt-0.5 text-xs font-medium tracking-wide text-ink-500 uppercase">{label}</dd>
    </div>
  );
}

function EmptyNote({ label }: { label: string }) {
  return <li className="rounded-lg border border-dashed border-ink-200 p-4 text-sm text-ink-500">{label}</li>;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
