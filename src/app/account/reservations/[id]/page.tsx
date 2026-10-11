import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isStaffRole } from '@/lib/rbac';
import { formatDateOnly, formatDateTime, formatMoney } from '@/lib/money';
import { StatusBadge } from '@/components/StatusBadge';
import { FULFILLMENT_LABELS, type Fulfillment } from '@/lib/constants';
import { isEditable } from '@/lib/reservations';
import { cancelOwnReservationAction } from '../../actions';

export const metadata = { title: 'Reservation' };

export default async function ReservationDetailPage(props: PageProps<'/account/reservations/[id]'>) {
  const { id } = await props.params;
  const query = await props.searchParams;
  const justCreated = query.created === '1';
  const justCancelled = query.cancelled === '1';

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/account/reservations/${id}`);

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      slot: true,
      package: true,
      addons: { include: { addon: true } },
      events: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  if (!reservation) notFound();

  // Customers only ever see their own orders; staff and admins may look up any.
  const isOwner = reservation.userId === user.id;
  if (!isOwner && !isStaffRole(user.role)) notFound();

  const editable = isOwner && isEditable(reservation.status as never);

  return (
    <section>
      <Link
        href={isOwner ? '/account/reservations' : '/admin/reservations'}
        className="text-sm font-medium text-brand-700 hover:underline"
      >
        &larr; Back to reservations
      </Link>

      {justCreated ? (
        <div className="alert-success mt-4" role="status">
          <strong>Reservation received.</strong> We&apos;ll email you to confirm shortly. Your code is{' '}
          <span className="font-mono font-semibold">{reservation.code}</span>.
        </div>
      ) : null}
      {justCancelled ? (
        <div className="alert-success mt-4" role="status">
          This reservation has been cancelled.
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-mono text-2xl font-bold text-ink-900">{reservation.code}</h2>
          <p className="mt-1 text-sm text-ink-600">
            Placed {formatDateTime(reservation.createdAt)}
          </p>
        </div>
        <StatusBadge status={reservation.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-pad">
          <h3 className="font-semibold text-ink-900">Event</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <Detail label="Package" value={reservation.package.name} />
            <Detail label="Guests" value={String(reservation.partySize)} />
            <Detail
              label="Slot"
              value={`${formatDateOnly(reservation.slot.date)}, ${reservation.slot.startTime}–${reservation.slot.endTime}`}
            />
            <Detail
              label="Fulfillment"
              value={FULFILLMENT_LABELS[reservation.fulfillment as Fulfillment]}
            />
            {reservation.fulfillment === 'DELIVERY' && reservation.addressLine1 ? (
              <Detail
                label="Deliver to"
                value={[
                  reservation.addressLine1,
                  reservation.addressLine2,
                  [reservation.city, reservation.state, reservation.postalCode]
                    .filter(Boolean)
                    .join(', '),
                ]
                  .filter(Boolean)
                  .join('\n')}
                multiline
              />
            ) : null}
            {reservation.notes ? <Detail label="Your notes" value={reservation.notes} multiline /> : null}
          </dl>
        </div>

        <div className="card-pad">
          <h3 className="font-semibold text-ink-900">Total</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <MoneyRow
              label={`${reservation.package.name} × ${reservation.partySize}`}
              value={reservation.subtotalCents}
            />
            {reservation.addons.map((line) => (
              <MoneyRow
                key={line.id}
                label={`${line.addon.name} × ${line.quantity}`}
                value={line.lineTotalCents}
              />
            ))}
            {reservation.deliveryCents > 0 ? (
              <MoneyRow label="Delivery" value={reservation.deliveryCents} />
            ) : null}
            <div className="flex items-baseline justify-between border-t border-ink-200 pt-3 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatMoney(reservation.totalCents)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="card-pad mt-6">
        <h3 className="font-semibold text-ink-900">History</h3>
        {reservation.events.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">No status changes recorded.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {reservation.events.map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                <div>
                  <p className="text-ink-800">
                    {event.fromStatus ? `${event.fromStatus} → ` : ''}
                    <span className="font-medium">{event.toStatus}</span>
                  </p>
                  {event.note ? <p className="text-ink-600">{event.note}</p> : null}
                  <p className="hint">{formatDateTime(event.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {editable ? (
        <div className="card-pad mt-6 border-red-200">
          <h3 className="font-semibold text-ink-900">Cancel this reservation</h3>
          <p className="mt-1 text-sm text-ink-600">
            Cancelling immediately releases your seats back to the schedule and cannot be undone.
          </p>
          <form action={cancelOwnReservationAction} className="mt-4">
            <input type="hidden" name="id" value={reservation.id} />
            <button
              type="submit"
              className="btn-danger btn-sm"
              aria-describedby="cancel-warning"
            >
              Cancel reservation
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function Detail({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{label}</dt>
      <dd className={`mt-0.5 text-ink-900 ${multiline ? 'whitespace-pre-line' : ''}`}>{value}</dd>
    </div>
  );
}

function MoneyRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-600">{label}</dt>
      <dd className="font-medium text-ink-900">{formatMoney(value)}</dd>
    </div>
  );
}
