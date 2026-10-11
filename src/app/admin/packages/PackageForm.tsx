'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { SubmitButton } from '@/components/SubmitButton';
import { savePackageAction, type AdminState } from '../actions';

const initialState: AdminState = {};

export interface PackageFormValues {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  pricePerHead: number;
  minGuests: number;
  maxGuests: number;
  active: boolean;
  sortOrder: number;
}

/**
 * Create/edit form for a catering package.
 *
 * Prices are entered in dollars for the operator's benefit; the action
 * converts to integer cents before writing.
 */
export function PackageForm({ pkg }: { pkg?: PackageFormValues }) {
  const [state, action] = useActionState(savePackageAction, initialState);

  return (
    <form action={action} className="space-y-4" noValidate>
      {pkg ? <input type="hidden" name="id" value={pkg.id} /> : null}
      {state.error ? (
        <div className="alert-error" role="alert">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Text name="name" label="Name" defaultValue={pkg?.name} error={state.fields?.name} required />
        <Text
          name="slug"
          label="Slug"
          defaultValue={pkg?.slug}
          error={state.fields?.slug}
          hint="Lowercase letters, numbers and dashes."
          required
        />
      </div>

      <Text
        name="tagline"
        label="Tagline"
        defaultValue={pkg?.tagline}
        error={state.fields?.tagline}
        required
      />

      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={pkg?.description}
          required
          className={`field mt-1 ${state.fields?.description ? 'field-error' : ''}`}
        />
        {state.fields?.description ? (
          <p className="error-text mt-1">{state.fields.description}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Text
          name="priceDollars"
          label="Price per head (USD)"
          type="number"
          step="0.01"
          min="0"
          defaultValue={pkg ? (pkg.pricePerHead / 100).toFixed(2) : '0.00'}
          error={state.fields?.pricePerHead}
          required
        />
        <Text
          name="minGuests"
          label="Minimum guests"
          type="number"
          min="1"
          defaultValue={String(pkg?.minGuests ?? 10)}
          error={state.fields?.minGuests}
          required
        />
        <Text
          name="maxGuests"
          label="Maximum guests"
          type="number"
          min="1"
          defaultValue={String(pkg?.maxGuests ?? 200)}
          error={state.fields?.maxGuests}
          required
        />
      </div>

      <Text
        name="sortOrder"
        label="Sort order"
        type="number"
        min="0"
        defaultValue={String(pkg?.sortOrder ?? 0)}
        error={state.fields?.sortOrder}
        hint="Lower numbers appear first."
      />

      <Toggle name="active" label="Visible on the public menu" defaultChecked={pkg?.active ?? true} />

      <SubmitButton pendingLabel="Saving…">{pkg ? 'Save changes' : 'Create package'}</SubmitButton>
    </form>
  );
}

function Text({
  name,
  label,
  type = 'text',
  defaultValue,
  error,
  hint,
  required,
  step,
  min,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  step?: string;
  min?: string;
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
        step={step}
        min={min}
        defaultValue={defaultValue}
        required={required}
        className={`field mt-1 ${error ? 'field-error' : ''}`}
      />
      {error ? <p className="error-text mt-1">{error}</p> : hint ? <p className="hint mt-1">{hint}</p> : null}
    </div>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-ink-300 accent-brand-600"
      />
      <span className="text-sm text-ink-800">{label}</span>
    </label>
  );
}

/**
 * Destructive submit with a confirmation prompt and a pending state.
 * Shared by every admin list view.
 */
export function ConfirmSubmit({
  action,
  id,
  label,
  message,
  pendingLabel = 'Working…',
  className = 'rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60',
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  label: string;
  message: string;
  pendingLabel?: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <PendingButton className={className} pendingLabel={pendingLabel}>
        {label}
      </PendingButton>
    </form>
  );
}

function PendingButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
