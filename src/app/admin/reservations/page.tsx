import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { formatMoney } from '@/lib/money';
import { StatusBadge } from '@/components/StatusBadge';
import { FULFILLMENT_LABELS, RESERVATION_STATUSES, type Fulfillment } from '@/lib/constants';
import { ReservationFilters } from './ReservationFilters';

export const metadata = { title: 'Reservations · Admin' };

export default async function AdminReservationsPage(props: PageProps<'/admin/reservations'>) {
  await requirePermission('reservation:read:any');
  const params = await props.searchParams;

  const status = typeof params.status === 'string' ? params.status : undefined;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 20;

  const where = {
    ...(status && RESERVATION_STATUSES.includes(status as never) ? { status } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q } },
            { user: { email: { contains: q } } },
            { user: { name: { contains: q } } },
          ],
        }
      : {}),
  };

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { slot: true, package: true, user: true },
    }),
    prisma.reservation.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Reservations</h2>
          <p className="hint mt-0.5">
            {total} total{status ? ` · filtered by ${status}` : ''}
          </p>
        </div>
        <Link href="/admin/slots" className="btn-secondary btn-sm">
          Manage schedule
        </Link>
      </div>

      {params.deleted ? <div className="alert-success">Reservation deleted.</div> : null}

      <ReservationFilters status={status} q={q} />

      {reservations.length === 0 ? (
        <div className="card-pad text-center text-sm text-ink-600">No reservations match.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer</th>
                <th>Event</th>
                <th>Slot</th>
                <th>Guests</th>
                <th className="text-right">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link
                      href={`/admin/reservations/${r.id}`}
                      className="font-mono font-semibold text-brand-700 hover:underline"
                    >
                      {r.code}
                    </Link>
                  </td>
                  <td>
                    <div className="text-ink-900">{r.user.name}</div>
                    <div className="hint">{r.user.email}</div>
                  </td>
                  <td>
                    <div className="text-ink-800">{r.package.name}</div>
                    <div className="hint">
                      {FULFILLMENT_LABELS[r.fulfillment as Fulfillment]}
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-ink-600">
                    {r.slot.date.toISOString().slice(0, 10)}
                    <div className="hint">{r.slot.startTime}</div>
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

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-ink-600">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={`/admin/reservations?${new URLSearchParams({ ...cleanParams(params), page: String(page - 1) })}`}
                className="btn-secondary btn-sm"
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/admin/reservations?${new URLSearchParams({ ...cleanParams(params), page: String(page + 1) })}`}
                className="btn-secondary btn-sm"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

/** Drop undefined values so they don't serialise as the string "undefined". */
function cleanParams(params: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => typeof v === 'string' && v !== ''),
  ) as Record<string, string>;
}
