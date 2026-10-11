import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatMoney } from '@/lib/money';
import { StatusBadge } from '@/components/StatusBadge';
import { RESERVATION_STATUSES, type ReservationStatus } from '@/lib/constants';

export const metadata = { title: 'Dashboard' };

export default async function AdminOverviewPage() {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [byStatus, upcoming, todayCount, newMessages, seats, revenueAgg] = await Promise.all([
    prisma.reservation.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { totalCents: true },
    }),
    prisma.reservation.findMany({
      where: { status: { in: ['CONFIRMED', 'PREPARING'] } },
      orderBy: [{ slot: { date: 'asc' } }, { slot: { startTime: 'asc' } }],
      take: 8,
      include: { slot: true, package: true, user: true },
    }),
    prisma.reservation.count({
      where: { slot: { date: { gte: startOfToday } }, status: { not: 'CANCELLED' } },
    }),
    prisma.contactMessage.count({ where: { status: 'NEW' } }),
    prisma.slot.aggregate({
      where: { isOpen: true, date: { gte: startOfToday } },
      _sum: { capacity: true, seatsUsed: true },
    }),
    prisma.reservation.aggregate({
      where: { status: { in: ['CONFIRMED', 'COMPLETED', 'OUT_FOR_DELIVERY'] } },
      _sum: { totalCents: true },
    }),
  ]);

  const counts = Object.fromEntries(
    byStatus.map((row) => [row.status, { count: row._count._all, total: row._sum.totalCents ?? 0 }]),
  ) as Partial<Record<ReservationStatus, { count: number; total: number }>>;

  const capacity = seats._sum.capacity ?? 0;
  const used = seats._sum.seatsUsed ?? 0;
  const utilisation = capacity > 0 ? Math.round((used / capacity) * 100) : 0;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Bookings from today"
          value={String(todayCount)}
          hint="Across all upcoming slots"
        />
        <Stat
          label="Confirmed revenue"
          value={formatMoney(revenueAgg._sum.totalCents ?? 0)}
          hint="Confirmed, in-flight and completed"
        />
        <Stat
          label="Seat utilisation"
          value={`${utilisation}%`}
          hint={`${used} of ${capacity} open seats`}
        />
        <Stat
          label="Unread messages"
          value={String(newMessages)}
          hint="From the landing page form"
          href="/admin/messages"
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink-900">Reservations by status</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RESERVATION_STATUSES.map((status) => {
            const entry = counts[status];
            return (
              <Link
                key={status}
                href={`/admin/reservations?status=${status}`}
                className="card flex items-center justify-between p-4 transition hover:border-brand-300"
              >
                <StatusBadge status={status} />
                <div className="text-right">
                  <div className="text-xl font-bold text-ink-900">{entry?.count ?? 0}</div>
                  {entry?.total ? (
                    <div className="hint">{formatMoney(entry.total)}</div>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">Next up</h2>
          <Link href="/admin/reservations" className="text-sm font-semibold text-brand-700 hover:underline">
            View all
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="card-pad mt-4 text-sm text-ink-600">
            Nothing confirmed or in preparation.{' '}
            <Link href="/admin/slots" className="font-semibold text-brand-700 hover:underline">
              Open more slots
            </Link>{' '}
            to take bookings.
          </div>
        ) : (
          <div className="card mt-4 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Customer</th>
                  <th>Package</th>
                  <th>Slot</th>
                  <th>Guests</th>
                  <th className="text-right">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link
                        href={`/admin/reservations/${r.id}`}
                        className="font-mono font-semibold text-brand-700 hover:underline"
                      >
                        {r.code}
                      </Link>
                    </td>
                    <td className="text-ink-800">{r.user.name}</td>
                    <td className="text-ink-600">{r.package.name}</td>
                    <td className="whitespace-nowrap text-ink-600">
                      {r.slot.date.toISOString().slice(0, 10)} {r.slot.startTime}
                    </td>
                    <td>{r.partySize}</td>
                    <td className="text-right font-medium">{formatMoney(r.totalCents)}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{label}</div>
      <div className="mt-2 text-2xl font-black text-ink-900">{value}</div>
      <div className="mt-0.5 text-xs text-ink-500">{hint}</div>
    </>
  );

  return href ? (
    <Link href={href} className="card p-4 transition hover:border-brand-300">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}
