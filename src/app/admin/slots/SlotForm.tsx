'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/SubmitButton';
import { saveSlotAction, type AdminState } from '../actions';
import { toDateInputValue } from '@/lib/money';

const initialState: AdminState = {};

export interface SlotFormValues {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  isOpen: boolean;
  notes: string | null;
}

export function SlotForm({ slot }: { slot?: SlotFormValues }) {
  const [state, action] = useActionState(saveSlotAction, initialState);

  return (
    <form action={action} className="space-y-4" noValidate>
      {slot ? <input type="hidden" name="id" value={slot.id} /> : null}
      {state.error ? (
        <div className="alert-error" role="alert">
          {state.error}
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor="date">
          Date
        </label>
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={slot ? toDateInputValue(slot.date) : undefined}
          required
          className={`field mt-1 ${state.fields?.date ? 'field-error' : ''}`}
        />
        {state.fields?.date ? <p className="error-text mt-1">{state.fields.date}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="startTime">
            Start (24h)
          </label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            defaultValue={slot?.startTime ?? '17:00'}
            required
            className={`field mt-1 ${state.fields?.startTime ? 'field-error' : ''}`}
          />
          {state.fields?.startTime ? <p className="error-text mt-1">{state.fields.startTime}</p> : null}
        </div>
        <div>
          <label className="label" htmlFor="endTime">
            End (24h)
          </label>
          <input
            id="endTime"
            name="endTime"
            type="time"
            defaultValue={slot?.endTime ?? '21:00'}
            required
            className={`field mt-1 ${state.fields?.endTime ? 'field-error' : ''}`}
          />
          {state.fields?.endTime ? <p className="error-text mt-1">{state.fields.endTime}</p> : null}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="capacity">
          Capacity (guests)
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min="1"
          defaultValue={String(slot?.capacity ?? 60)}
          required
          className={`field mt-1 ${state.fields?.capacity ? 'field-error' : ''}`}
        />
        {state.fields?.capacity ? <p className="error-text mt-1">{state.fields.capacity}</p> : null}
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Internal note (optional)
        </label>
        <input id="notes" name="notes" defaultValue={slot?.notes ?? ''} className="field mt-1" />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isOpen"
          defaultChecked={slot?.isOpen ?? true}
          className="h-4 w-4 rounded border-ink-300 accent-brand-600"
        />
        <span className="text-sm text-ink-800">Open for bookings</span>
      </label>

      <SubmitButton pendingLabel="Saving…">{slot ? 'Save changes' : 'Add slot'}</SubmitButton>
    </form>
  );
}
