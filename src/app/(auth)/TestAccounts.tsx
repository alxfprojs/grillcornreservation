'use client';

import { useState } from 'react';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { ROLE_LABELS } from '@/lib/constants';

/**
 * Sign-in helper listing the seeded accounts. Clicking a row fills the form.
 * Only rendered in non-production environments (see `demoAccountsEnabled`).
 */
export function TestAccounts() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard can be blocked; the credentials are visible on screen anyway.
    }
  }

  return (
    <div className="card mt-6 border-dashed">
      <div className="border-b border-dashed border-ink-200 px-5 py-3">
        <h2 className="text-sm font-semibold text-ink-900">Demo accounts</h2>
        <p className="hint mt-0.5">
          Seeded by <code className="font-mono">npm run db:seed</code>. Click a credential to copy.
        </p>
      </div>

      <ul className="divide-y divide-ink-100">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.email} className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="badge bg-brand-100 text-brand-800 ring-brand-300">
                {ROLE_LABELS[account.role]}
              </span>
              <span className="hint truncate">{account.summary}</span>
            </div>

            <dl className="mt-2 space-y-1 font-mono text-xs">
              <div className="flex items-center gap-2">
                <dt className="w-16 shrink-0 text-ink-500">email</dt>
                <dd className="flex-1 truncate text-ink-800">{account.email}</dd>
                <button
                  type="button"
                  onClick={() => copy(account.email)}
                  className="rounded px-1.5 py-0.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                  aria-label={`Copy email for ${account.role}`}
                >
                  {copied === account.email ? '✓' : 'copy'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <dt className="w-16 shrink-0 text-ink-500">password</dt>
                <dd className="flex-1 truncate text-ink-800">{account.password}</dd>
                <button
                  type="button"
                  onClick={() => copy(account.password)}
                  className="rounded px-1.5 py-0.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                  aria-label={`Copy password for ${account.role}`}
                >
                  {copied === account.password ? '✓' : 'copy'}
                </button>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
