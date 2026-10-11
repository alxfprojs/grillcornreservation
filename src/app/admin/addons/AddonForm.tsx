'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/SubmitButton';
import { saveAddonAction, type AdminState } from '../actions';
import { ADDON_PRICE_MODES } from '@/lib/constants';

const initialState: AdminState = {};

export interface AddonFormValues {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  priceMode: string;
  active: boolean;
  sortOrder: number;
}

export function AddonForm({ addon }: { addon?: AddonFormValues }) {
  const [state, action] = useActionState(saveAddonAction, initialState);

  return (
    <form action={action} className="space-y-4" noValidate>
      {addon ? <input type="hidden" name="id" value={addon.id} /> : null}
      {state.error ? (
        <div className="alert-error" role="alert">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            defaultValue={addon?.name}
            required
            className={`field mt-1 ${state.fields?.name ? 'field-error' : ''}`}
          />
          {state.fields?.name ? <p className="error-text mt-1">{state.fields.name}</p> : null}
        </div>
        <div>
          <label className="label" htmlFor="slug">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            defaultValue={addon?.slug}
            required
            className={`field mt-1 ${state.fields?.slug ? 'field-error' : ''}`}
          />
          {state.fields?.slug ? <p className="error-text mt-1">{state.fields.slug}</p> : null}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={addon?.description}
          required
          className={`field mt-1 ${state.fields?.description ? 'field-error' : ''}`}
        />
        {state.fields?.description ? (
          <p className="error-text mt-1">{state.fields.description}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="priceDollars">
            Price (USD)
          </label>
          <input
            id="priceDollars"
            name="priceDollars"
            type="number"
            step="0.01"
            min="0"
            defaultValue={addon ? (addon.priceCents / 100).toFixed(2) : '0.00'}
            required
            className={`field mt-1 ${state.fields?.priceCents ? 'field-error' : ''}`}
          />
          {state.fields?.priceCents ? <p className="error-text mt-1">{state.fields.priceCents}</p> : null}
        </div>

        <div>
          <label className="label" htmlFor="priceMode">
            Charged
          </label>
          <select
            id="priceMode"
            name="priceMode"
            defaultValue={addon?.priceMode ?? 'PER_ORDER'}
            className="field mt-1"
          >
            {ADDON_PRICE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode === 'PER_HEAD' ? 'Per guest' : 'Per order'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="sortOrder">
            Sort order
          </label>
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min="0"
            defaultValue={String(addon?.sortOrder ?? 0)}
            className="field mt-1"
          />
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="active"
          defaultChecked={addon?.active ?? true}
          className="h-4 w-4 rounded border-ink-300 accent-brand-600"
        />
        <span className="text-sm text-ink-800">Available to customers</span>
      </label>

      <SubmitButton pendingLabel="Saving…">{addon ? 'Save changes' : 'Create add-on'}</SubmitButton>
    </form>
  );
}
