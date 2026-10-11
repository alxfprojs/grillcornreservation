'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/SubmitButton';
import { saveUserAction, type AdminState } from '../actions';
import { ROLES, ROLE_LABELS } from '@/lib/constants';

const initialState: AdminState = {};

export interface UserFormValues {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
}

export function UserForm({ user }: { user?: UserFormValues }) {
  const [state, action] = useActionState(saveUserAction, initialState);
  const isNew = !user;

  return (
    <form action={action} className="space-y-4" noValidate>
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      {state.error ? (
        <div className="alert-error" role="alert">
          {state.error}
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={user?.name}
          required
          className={`field mt-1 ${state.fields?.name ? 'field-error' : ''}`}
        />
        {state.fields?.name ? <p className="error-text mt-1">{state.fields.name}</p> : null}
      </div>

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={user?.email}
          required
          className={`field mt-1 ${state.fields?.email ? 'field-error' : ''}`}
        />
        {state.fields?.email ? <p className="error-text mt-1">{state.fields.email}</p> : null}
      </div>

      <div>
        <label className="label" htmlFor="phone">
          Phone (optional)
        </label>
        <input id="phone" name="phone" type="tel" defaultValue={user?.phone ?? ''} className="field mt-1" />
      </div>

      <div>
        <label className="label" htmlFor="role">
          Role
        </label>
        <select id="role" name="role" defaultValue={user?.role ?? 'CUSTOMER'} className="field mt-1">
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <p className="hint mt-1">
          Staff can manage every reservation and the schedule. Admins can also manage users and the
          catalogue.
        </p>
        {state.fields?.role ? <p className="error-text mt-1">{state.fields.role}</p> : null}
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password {isNew ? '' : '(leave blank to keep current)'}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required={isNew}
          className={`field mt-1 ${state.fields?.password ? 'field-error' : ''}`}
        />
        {state.fields?.password ? <p className="error-text mt-1">{state.fields.password}</p> : null}
        {isNew ? (
          <p className="hint mt-1">
            At least 10 characters with an uppercase letter, lowercase letter and a number.
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={user?.isActive ?? true}
          className="h-4 w-4 rounded border-ink-300 accent-brand-600"
        />
        <span className="text-sm text-ink-800">Account is active</span>
      </label>

      <SubmitButton pendingLabel="Saving…">{isNew ? 'Create user' : 'Save changes'}</SubmitButton>
    </form>
  );
}
