import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { formatMoney, formatDateOnly } from '@/lib/money';
import { StatusBadge } from '@/components/StatusBadge';
import { FULFILLMENT_LABELS, type Fulfillment } from '@/lib/constants';

export const metadata = { title: 'My reservations' };

export default async function MyReservationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account/reservations');

  const reservations = await prisma.reservation.findMany({
    // Scope from the session, never from the URL.
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { slot: true, package: true },
  });

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink-900">My reservations</h2>
        <Link href="/book" className="btn-primary btn-sm">
          New reservation
        </Link>
      </div>

      {reservations.length === 0 ? (
        <div className="card-pad mt-6 text-center">
          <div className="text-3xl" aria-hidden>
            🌽
          </div>
          <h3 className="mt-3 font-semibold text-ink-900">No reservations yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-600">
            Pick a package, choose a slot, and we&apos;ll have hot corn at your door.
          </p>
          <Link href="/book" className="btn-primary mt-4">
            Book catering
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {reservations.map((r) => {
            const slot = r.slot;
            return (
              <li key={r.id}>
                <Link
                  href={`/account/reservations/${r.id}`}
                  className="card flex flex-wrap items-center justify-between gap-4 p-4 transition hover:border-brand-300 hover:shadow"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-ink-900">{r.code}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-700">{r.package.name}</p>
                    <p className="hint mt-0.5">
                      {formatDateOnly(slot.date)} &middot; {slot.startTime}–{slot.endTime} &middot;{' '}
                      {FULFILLMENT_LABELS[r.fulfillment as Fulfillment]} &middot; {r.partySize} guests
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-ink-900">{formatMoney(r.totalCents)}</div>
                    <div className="hint">View details &rarr;</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
