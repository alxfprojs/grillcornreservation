'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Route-level error boundary.
 *
 * Next.js 16 renamed the `reset` prop to `retry`; `retry()` re-fetches and
 * re-renders the boundary's children, which is what we want for a transient
 * database or network failure.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Replace with your error reporter (Sentry, etc.) in production.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="text-4xl" aria-hidden>
        🌽💥
      </div>
      <h1 className="mt-4 text-2xl font-bold text-ink-900">Something went wrong</h1>
      <p className="mt-2 text-ink-600">
        We hit an unexpected error loading this page. Trying again usually fixes it.
      </p>

      {error.digest ? (
        <p className="mt-4 font-mono text-xs text-ink-500">Reference: {error.digest}</p>
      ) : null}

      <div className="mt-8 flex justify-center gap-3">
        <button type="button" onClick={() => retry()} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Go home
        </Link>
      </div>
    </div>
  );
}
