import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatDateOnly, toDateInputValue } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Availability',
  description: 'Check open catering slots and remaining capacity.',
};

export default async function SchedulePage(props: PageProps<'/schedule'>) {
  const params = await props.searchParams;
  const user = await getCurrentUser();

  const requested = typeof params.date === 'string' ? params.date : undefined;

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  // Default view: the next 14 days, with an optional `?date=YYYY-MM-DD` filter.
  let where: { date: { gte: Date; lte?: Date } } = { date: { gte: startOfToday } };
  if (requested && /^\d{4}-\d{2}-\d{2}$/.test(requested)) {
    const day = new Date(`${requested}T00:00:00.000Z`);
    where = { date: { gte: day, lte: day } };
  } else {
    where.date.lte = new Date(startOfToday.getTime() + 14 * 24 * 60 * 60 * 1000);
  }

  const slots = await prisma.slot.findMany({
    where,
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  // Group by day for a compact calendar-ish view.
  const byDay = new Map<string, typeof slots>();
  for (const slot of slots) {
    const key = toDateInputValue(slot.date);
    byDay.set(key, [...(byDay.get(key) ?? []), slot]);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">Availability</h1>
        <p className="mt-2 text-ink-600">
          Live capacity per service window. Slots close automatically once they fill.
        </p>
      </header>

      <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className="label" htmlFor="date">
            Jump to a date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={requested}
            className="field mt-1"
            min={toDateInputValue(startOfToday)}
          />
        </div>
        <button type="submit" className="btn-secondary">
          Show
        </button>
        {requested ? (
          <Link href="/schedule" className="btn-ghost">
            Show next 14 days
          </Link>
        ) : null}
      </form>

      {byDay.size === 0 ? (
        <div className="card-pad mt-8 text-center text-sm text-ink-600">
          No slots published for this range.{' '}
          <Link href="/#quote" className="font-semibold text-brand-700 hover:underline">
            Request a date
          </Link>
          .
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {[...byDay.entries()].map(([day, daySlots]) => (
            <section key={day}>
              <h2 className="text-lg font-semibold text-ink-900">
                {formatDateOnly(new Date(`${day}T00:00:00.000Z`))}
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {daySlots.map((slot) => {
                  const remaining = slot.capacity - slot.seatsUsed;
                  const full = remaining <= 0;
                  return (
                    <li
                      key={slot.id}
                      className={`card flex items-center justify-between gap-4 p-4 ${
                        !slot.isOpen ? 'opacity-60' : ''
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-ink-900">
                          {slot.startTime}–{slot.endTime}
                        </p>
                        <p className="hint mt-0.5">
                          {slot.seatsUsed} of {slot.capacity} seats booked
                          {slot.notes ? ` · ${slot.notes}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        {!slot.isOpen ? (
                          <span className="badge bg-ink-100 text-ink-600 ring-ink-200">Closed</span>
                        ) : full ? (
                          <span className="badge bg-red-50 text-red-700 ring-red-200">Full</span>
                        ) : (
                          <span className="badge bg-emerald-50 text-emerald-700 ring-emerald-200">
                            {remaining} left
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="card-pad mt-10 text-center">
        <p className="text-sm text-ink-700">
          Found a slot that works?{' '}
          <Link href={user ? '/book' : '/register'} className="font-semibold text-brand-700 hover:underline">
            {user ? 'Book it now' : 'Create an account to book'}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
