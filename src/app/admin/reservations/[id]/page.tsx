import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { formatDateOnly, formatDateTime, formatMoney } from '@/lib/money';
import { StatusBadge } from '@/components/StatusBadge';
import { FULFILLMENT_LABELS, type Fulfillment } from '@/lib/constants';
import { DangerZone, StaffNotesForm, StatusControl } from '../ReservationControls';

export const metadata = { title: 'Reservation · Admin' };

export default async function AdminReservationDetailPage(
  props: PageProps<'/admin/reservations/[id]'>,
) {
  await requirePermission('reservation:read:any');
  const { id } = await props.params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      slot: true,
      package: true,
      user: true,
      addons: { include: { addon: true } },
      events: { orderBy: { createdAt: 'desc' }, include: { actor: true } },
    },
  });

  if (!reservation) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/reservations"
        className="text-sm font-medium text-brand-700 hover:underline"
      >
        &larr; Reservations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-mono text-2xl font-bold text-ink-900">{reservation.code}</h2>
          <p className="mt-1 text-sm text-ink-600">
            {reservation.user.name} &middot; {reservation.user.email}
            {reservation.user.phone ? ` · ${reservation.user.phone}` : ''}
          </p>
        </div>
        <StatusBadge status={reservation.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="card-pad">
            <h3 className="font-semibold text-ink-900">Order</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
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
                  label="Delivery address"
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
              {reservation.notes ? (
                <Detail label="Customer notes" value={reservation.notes} multiline />
              ) : null}
            </dl>
          </section>

          <section className="card-pad">
            <h3 className="font-semibold text-ink-900">Charges</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <MoneyRow
                label={`${reservation.package.name} × ${reservation.partySize}`}
                value={reservation.subtotalCents}
              />
              {reservation.addons.map((line) => (
                <MoneyRow
                  key={line.id}
                  label={`${line.addon.name} × ${line.quantity} (${line.addon.priceMode === 'PER_HEAD' ? 'per guest' : 'per order'})`}
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
          </section>

          <section className="card-pad">
            <h3 className="font-semibold text-ink-900">Audit trail</h3>
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
                        {event.actor ? (
                          <span className="text-ink-500"> by {event.actor.name}</span>
                        ) : null}
                      </p>
                      {event.note ? <p className="text-ink-600">{event.note}</p> : null}
                      <p className="hint">{formatDateTime(event.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <DangerZone reservationId={reservation.id} code={reservation.code} />
        </div>

        <div className="space-y-6">
          <section className="card-pad">
            <h3 className="font-semibold text-ink-900">Status</h3>
            <div className="mt-4">
              <StatusControl reservationId={reservation.id} currentStatus={reservation.status} />
            </div>
          </section>

          <section className="card-pad">
            <h3 className="font-semibold text-ink-900">Internal notes</h3>
            <div className="mt-4">
              <StaffNotesForm reservationId={reservation.id} notes={reservation.staffNotes} />
            </div>
          </section>
        </div>
      </div>
    </div>
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
