'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { formatMoney } from '@/lib/money';
import { quoteAction } from './actions';

/**
 * Authoritative running total.
 *
 * The inline arithmetic in the summary is a fast approximation for feedback;
 * this re-prices the selection server-side so the number shown is the number
 * charged (it also catches a party size that violates the package limits).
 */
export function LiveQuote({
  packageId,
  partySize,
  fulfillment,
  addOns,
}: {
  packageId: string;
  partySize: number;
  fulfillment: string;
  addOns: { addonId: string; quantity: number }[];
}) {
  const [result, setResult] = useState<{ total: number; problem: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!packageId || !partySize) return;

    // Debounced, and every setState happens inside the timer callback rather
    // than synchronously in the effect body (which would cascade renders).
    const timer = setTimeout(() => {
      startTransition(async () => {
        const response = await quoteAction({ packageId, partySize, fulfillment, addOns });
        if ('error' in response && response.error) {
          setResult({
            total: 0,
            problem:
              response.error === 'UNAVAILABLE'
                ? 'This selection cannot be priced right now.'
                : 'Check your selections.',
          });
        } else if ('prices' in response && response.prices) {
          setResult({ total: response.prices.totalCents, problem: null });
        }
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [packageId, partySize, fulfillment, addOns]);

  if (result?.problem) {
    return <p className="error-text mt-4">{result.problem}</p>;
  }
  if (!result) return null;

  return (
    <div className="mt-4 flex items-baseline justify-between border-t border-ink-200 pt-4">
      <span className="text-sm font-semibold text-ink-900">Total</span>
      <span className="text-2xl font-black text-ink-900" aria-live="polite">
        {formatMoney(result.total)}
        {isPending ? <span className="ml-1 text-xs font-normal text-ink-400">updating…</span> : null}
      </span>
    </div>
  );
}
