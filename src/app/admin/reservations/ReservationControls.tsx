'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { SubmitButton } from '@/components/SubmitButton';
import {
  changeReservationStatusAction,
  deleteReservationAction,
  saveStaffNotesAction,
  type AdminState,
} from '../actions';
import { STATUS_LABELS } from '@/lib/constants';
import { allowedTransitions } from '@/lib/status-machine';

const initialState: AdminState = {};

/**
 * Status workflow controls.
 *
 * The options come from the same `allowedTransitions` table the server uses, so
 * the UI can only offer moves the domain layer will accept.
 */
export function StatusControl({
  reservationId,
  currentStatus,
}: {
  reservationId: string;
  currentStatus: string;
}) {
  const [state, action] = useActionState(changeReservationStatusAction, initialState);
  const allowed = allowedTransitions(currentStatus);

  if (allowed.length === 0) {
    return (
      <p className="text-sm text-ink-600">
        This reservation is in a terminal state and can no longer be changed.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={reservationId} />
      {state.error ? (
        <div className="alert-error" role="alert">
          {state.error}
        </div>
      ) : null}
      {state.success ? <div className="alert-success">{state.success}</div> : null}

      <div>
        <label className="label" htmlFor="status">
          Move to
        </label>
        <select id="status" name="status" className="field mt-1" defaultValue={allowed[0]}>
          {allowed.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="note">
          Note (optional)
        </label>
        <input id="note" name="note" placeholder="e.g. confirmed by phone" className="field mt-1" />
      </div>

      <SubmitButton pendingLabel="Updating…">Update status</SubmitButton>
    </form>
  );
}

export function StaffNotesForm({
  reservationId,
  notes,
}: {
  reservationId: string;
  notes: string | null;
}) {
  const [state, action] = useActionState(saveStaffNotesAction, initialState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={reservationId} />
      {state.error ? (
        <div className="alert-error" role="alert">
          {state.error}
        </div>
      ) : null}
      {state.success ? <div className="alert-success">{state.success}</div> : null}

      <div>
        <label className="label" htmlFor="staffNotes">
          Internal note
        </label>
        <textarea
          id="staffNotes"
          name="staffNotes"
          rows={4}
          defaultValue={notes ?? ''}
          placeholder="Only staff and admins can see this."
          className="field mt-1"
        />
      </div>

      <SubmitButton variant="secondary" pendingLabel="Saving…">
        Save note
      </SubmitButton>
    </form>
  );
}

export function DangerZone({ reservationId, code }: { reservationId: string; code: string }) {
  return (
    <div className="card-pad border-red-200">
      <h3 className="font-semibold text-ink-900">Delete permanently</h3>
      <p className="mt-1 text-sm text-ink-600">
        Removes the record, its add-on lines and its history, and releases the seats. This cannot be
        undone.
      </p>
      <form
        action={deleteReservationAction}
        onSubmit={(e) => {
          if (!confirm(`Permanently delete reservation ${code}? This cannot be undone.`)) {
            e.preventDefault();
          }
        }}
        className="mt-4"
      >
        <input type="hidden" name="id" value={reservationId} />
        <DangerSubmit />
      </form>
    </div>
  );
}

function DangerSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-danger btn-sm">
      {pending ? 'Deleting…' : 'Delete reservation'}
    </button>
  );
}
