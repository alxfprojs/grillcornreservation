'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/SubmitButton';
import {
  changePasswordAction,
  updateProfileAction,
  type AccountState,
} from './actions';

const initialState: AccountState = {};

export function ProfileForms({
  name,
  phone,
  email,
}: {
  name: string;
  phone: string | null;
  email: string;
}) {
  const [profile, profileAction] = useActionState(updateProfileAction, initialState);
  const [password, passwordAction] = useActionState(changePasswordAction, initialState);

  return (
    <div className="space-y-6">
      <section className="card-pad">
        <h2 className="text-lg font-semibold text-ink-900">Profile</h2>
        <form action={profileAction} className="mt-5 space-y-4" noValidate>
          {profile.error ? (
            <div className="alert-error" role="alert">
              {profile.error}
            </div>
          ) : null}
          {profile.success ? <div className="alert-success">{profile.success}</div> : null}

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" value={email} disabled className="field mt-1" />
            <p className="hint mt-1">Email changes are handled by an administrator.</p>
          </div>

          <div>
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              name="name"
              defaultValue={name}
              required
              className={`field mt-1 ${profile.fields?.name ? 'field-error' : ''}`}
            />
            {profile.fields?.name ? <p className="error-text mt-1">{profile.fields.name}</p> : null}
          </div>

          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={phone ?? ''}
              className="field mt-1"
            />
          </div>

          <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
        </form>
      </section>

      <section className="card-pad">
        <h2 className="text-lg font-semibold text-ink-900">Change password</h2>
        <form action={passwordAction} className="mt-5 space-y-4" noValidate>
          {password.error ? (
            <div className="alert-error" role="alert">
              {password.error}
            </div>
          ) : null}

          <div>
            <label className="label" htmlFor="currentPassword">
              Current password
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              className={`field mt-1 ${password.fields?.currentPassword ? 'field-error' : ''}`}
            />
            {password.fields?.currentPassword ? (
              <p className="error-text mt-1">{password.fields.currentPassword}</p>
            ) : null}
          </div>

          <div>
            <label className="label" htmlFor="newPassword">
              New password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              className={`field mt-1 ${password.fields?.newPassword ? 'field-error' : ''}`}
            />
            {password.fields?.newPassword ? (
              <p className="error-text mt-1">{password.fields.newPassword}</p>
            ) : (
              <p className="hint mt-1">
                At least 10 characters with an uppercase letter, lowercase letter and a number.
              </p>
            )}
          </div>

          <SubmitButton variant="secondary" pendingLabel="Updating…">
            Update password
          </SubmitButton>
          <p className="hint">Changing your password signs you out of every device.</p>
        </form>
      </section>
    </div>
  );
}
