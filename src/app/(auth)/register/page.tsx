import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AuthForm } from '../AuthForm';

export const metadata: Metadata = { title: 'Create account' };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/account');

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-ink-900">Create your account</h1>
      <p className="mt-2 text-ink-600">
        Book catering, track your orders and rebook in a couple of clicks.
      </p>

      <div className="card-pad mt-8">
        <AuthForm mode="register" />
      </div>
    </div>
  );
}
