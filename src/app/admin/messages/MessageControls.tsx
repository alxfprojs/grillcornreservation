'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { setMessageStatusAction, deleteMessageAction, type AdminState } from '../actions';
import { CONTACT_MESSAGE_STATUSES } from '@/lib/constants';

const initialState: AdminState = {};

/** Inline status selector for one message row. */
export function MessageStatusControl({ id, status }: { id: string; status: string }) {
  const [state, action] = useActionState(setMessageStatusAction, initialState);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {state.error ? <span className="error-text">{state.error}</span> : null}
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="field w-28 py-1 text-xs"
        aria-label="Message status"
      >
        {CONTACT_MESSAGE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </form>
  );
}

export function MessageDeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteMessageAction}
      onSubmit={(e) => {
        if (!confirm('Delete this message?')) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <DeleteSubmit />
    </form>
  );
}

function DeleteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
    >
      {pending ? '…' : 'Delete'}
    </button>
  );
}
