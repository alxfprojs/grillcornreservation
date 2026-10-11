import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { formatDateOnly } from '@/lib/money';
import { SlotForm } from './SlotForm';
import { ConfirmSubmit } from '../packages/PackageForm';
import { deleteSlotAction, toggleSlotAction } from '../actions';

export const metadata = { title: 'Schedule · Admin' };

export default async function AdminSlotsPage(props: PageProps<'/admin/slots'>) {
  await requirePermission('schedule:manage');
  const { saved, deleted, edit: editingId } = await props.searchParams;

  const slots = await prisma.slot.findMany({
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    take: 100,
  });

  const editing = editingId ? slots.find((s) => s.id === editingId) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">Booking schedule</h2>
        <p className="hint mt-0.5">
          {slots.length} slots &middot; capacity is the maximum guests across all reservations in that
          window
        </p>
      </div>

      {saved ? <div className="alert-success">Slot saved.</div> : null}
      {deleted ? <div className="alert-success">Slot removed.</div> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="card overflow-x-auto self-start">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Window</th>
                <th>Seats</th>
                <th>Bookings</th>
                <th>State</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const remaining = slot.capacity - slot.seatsUsed;
                return (
                  <tr key={slot.id} className={editing?.id === slot.id ? 'bg-brand-50' : undefined}>
                    <td className="whitespace-nowrap font-medium text-ink-900">
                      {formatDateOnly(slot.date)}
                    </td>
                    <td className="whitespace-nowrap text-ink-600">
                      {slot.startTime}–{slot.endTime}
                    </td>
                    <td>
                      <div className="font-medium text-ink-900">
                        {slot.seatsUsed}/{slot.capacity}
                      </div>
                      <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className={`h-full ${
                            remaining <= 0 ? 'bg-red-500' : remaining < 10 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (slot.seatsUsed / Math.max(1, slot.capacity)) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="text-ink-600">{remaining <= 0 ? 'Full' : `${remaining} free`}</td>
                    <td>
                      <span
                        className={`badge ${
                          slot.isOpen
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-ink-100 text-ink-600 ring-ink-200'
                        }`}
                      >
                        {slot.isOpen ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/slots?edit=${slot.id}#form`}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100"
                        >
                          Edit
                        </Link>
                        <ConfirmSubmit
                          action={toggleSlotAction}
                          id={slot.id}
                          label={slot.isOpen ? 'Close' : 'Open'}
                          pendingLabel="…"
                          message={slot.isOpen ? 'Close this slot to new bookings?' : 'Reopen this slot for bookings?'}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-ink-100 disabled:opacity-60"
                        />
                        <ConfirmSubmit
                          action={deleteSlotAction}
                          id={slot.id}
                          label="Delete"
                          pendingLabel="…"
                          message={`Delete the ${formatDateOnly(slot.date)} ${slot.startTime} slot? Booked slots are closed rather than deleted.`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {slots.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink-600">
              No slots yet. Add one to start taking bookings.
            </p>
          ) : null}
        </div>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card-pad" id="form">
            <h3 className="font-semibold text-ink-900">
              {editing ? `Edit ${formatDateOnly(editing.date)}` : 'New slot'}
            </h3>
            {editing ? (
              <Link
                href="/admin/slots#form"
                className="hint mt-1 inline-block hover:text-ink-800 hover:underline"
              >
                Cancel editing
              </Link>
            ) : null}
            <div className="mt-4">
              <SlotForm slot={editing} key={editing?.id ?? 'new'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
