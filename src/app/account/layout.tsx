import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/constants';
import { isStaffRole } from '@/lib/rbac';
import { AccountNav } from './AccountNav';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // The proxy redirects anonymous visitors, but re-check here so a tampered
  // cookie can never render the account shell.
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account');

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">
          Welcome back, {user.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          {user.email} &middot; {ROLE_LABELS[user.role]}
          {isStaffRole(user.role) ? (
            <>
              {' '}
              &middot;{' '}
              <a href="/admin" className="font-semibold text-brand-700 hover:underline">
                Open the staff dashboard
              </a>
            </>
          ) : null}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
        <AccountNav />
        <div>{children}</div>
      </div>
    </div>
  );
}
