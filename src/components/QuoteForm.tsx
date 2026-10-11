'use client';

import { useActionState } from 'react';
import { submitQuoteAction, type QuoteState } from '@/app/actions';
import { SubmitButton } from '@/components/SubmitButton';

const initialState: QuoteState = {};

/** Landing-page quote request form. */
export function QuoteForm() {
  const [state, action] = useActionState(submitQuoteAction, initialState);

  if (state.ok) {
    return (
      <div className="card-pad text-center">
        <div className="text-3xl" aria-hidden>
          🎉
        </div>
        <h3 className="mt-2 text-lg font-semibold text-ink-900">Request received</h3>
        <p className="mt-1 text-sm text-ink-600">
          We&apos;ll get back to you within one business day with a tailored quote.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="card-pad space-y-4" noValidate>
      <div>
        <h3 className="text-lg font-semibold text-ink-900">Request a quote</h3>
        <p className="hint mt-1">For parties over 150 guests, or anything bespoke.</p>
      </div>

      {state.error ? (
        <div className="alert-error" role="alert">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name" name="name" error={state.fields?.name} defaultValue={state.values?.name} required />
        <TextField label="Email" name="email" type="email" error={state.fields?.email} defaultValue={state.values?.email} required />
        <TextField label="Phone (optional)" name="phone" type="tel" error={state.fields?.phone} />
        <TextField label="Event date (optional)" name="eventDate" type="date" error={state.fields?.eventDate} />
        <TextField label="Guest count (optional)" name="partySize" type="number" error={state.fields?.partySize} min={1} />
      </div>

      <div>
        <label className="label" htmlFor="message">
          What are you planning?
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          defaultValue={state.values?.message}
          className={`field mt-1 ${state.fields?.message ? 'field-error' : ''}`}
          placeholder="Office party, wedding reception, street festival…"
        />
        {state.fields?.message ? <p className="error-text mt-1">{state.fields.message}</p> : null}
      </div>

      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <SubmitButton className="w-full" pendingLabel="Sending…">
        Send request
      </SubmitButton>
    </form>
  );
}

function TextField({
  label,
  name,
  type = 'text',
  error,
  defaultValue,
  required,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  defaultValue?: string;
  required?: boolean;
  min?: number;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        min={min}
        required={required}
        defaultValue={defaultValue}
        className={`field mt-1 ${error ? 'field-error' : ''}`}
      />
      {error ? <p className="error-text mt-1">{error}</p> : null}
    </div>
  );
}
