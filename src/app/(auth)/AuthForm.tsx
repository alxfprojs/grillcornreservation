'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { loginAction, registerAction, type AuthState } from './actions';
import { SubmitButton } from '@/components/SubmitButton';

const initialState: AuthState = {};

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login';
  const action = isLogin ? loginAction : registerAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <Suspense fallback={<p className="text-sm text-ink-500">Loading…</p>}>
      <AuthFormInner mode={mode} state={state} formAction={formAction} />
    </Suspense>
  );
}

function AuthFormInner({
  mode,
  state,
  formAction,
}: {
  mode: 'login' | 'register';
  state: AuthState;
  formAction: (payload: FormData) => void;
}) {
  const isLogin = mode === 'login';
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.error ? (
        <div className="alert-error" role="alert">
          {state.error}
        </div>
      ) : null}

      {!isLogin ? (
        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          error={state.fields?.name}
          defaultValue={state.values?.name}
          required
        />
      ) : null}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={state.fields?.email}
        defaultValue={state.values?.email}
        required
      />

      {!isLogin ? (
        <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" error={state.fields?.phone} />
      ) : null}

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          className={`field mt-1 ${state.fields?.password ? 'field-error' : ''}`}
        />
        {state.fields?.password ? (
          <p className="error-text mt-1">{state.fields.password}</p>
        ) : isLogin ? null : (
          <p className="hint mt-1">
            At least 10 characters, with an uppercase letter, a lowercase letter and a number.
          </p>
        )}
      </div>

      <SubmitButton className="w-full" pendingLabel={isLogin ? 'Signing in…' : 'Creating account…'}>
        {isLogin ? 'Sign in' : 'Create account'}
      </SubmitButton>

      <p className="text-center text-sm text-ink-600">
        {isLogin ? (
          <>
            New here?{' '}
            <Link href="/register" className="font-semibold text-brand-700 hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-brand-700 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  error,
  autoComplete,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  autoComplete?: string;
  defaultValue?: string;
  required?: boolean;
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
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        className={`field mt-1 ${error ? 'field-error' : ''}`}
      />
      {error ? <p className="error-text mt-1">{error}</p> : null}
    </div>
  );
}
