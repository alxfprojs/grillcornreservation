import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { demoAccountsEnabled } from '@/lib/demo-accounts';
import { AuthForm } from '../AuthForm';
import { TestAccounts } from '../TestAccounts';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  // The proxy already bounces signed-in users, but this closes the race where
  // the page renders before the proxy redirect applies.
  if (await getCurrentUser()) redirect('/account');

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-ink-900">Sign in</h1>
      <p className="mt-2 text-ink-600">Manage your catering reservations.</p>

      <div className="card-pad mt-8">
        <AuthForm mode="login" />
      </div>

      {demoAccountsEnabled() ? <TestAccounts /> : null}
    </div>
  );
}
