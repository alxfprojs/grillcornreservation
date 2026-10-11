'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RESERVATION_STATUSES, STATUS_LABELS } from '@/lib/constants';

/** Status filter + search for the reservations table. */
export function ReservationFilters({
  status,
  q,
}: {
  status?: string;
  q: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(q);

  function apply(next: { status?: string; q?: string }) {
    const params = new URLSearchParams();
    const mergedStatus = 'status' in next ? next.status : status;
    const mergedQ = 'q' in next ? next.q : q;
    if (mergedStatus) params.set('status', mergedStatus);
    if (mergedQ) params.set('q', mergedQ);
    router.push(`/admin/reservations${params.size ? `?${params}` : ''}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-44 flex-1">
        <label className="label" htmlFor="status">
          Status
        </label>
        <select
          id="status"
          value={status ?? ''}
          onChange={(e) => apply({ status: e.target.value || undefined })}
          className="field mt-1"
        >
          <option value="">All statuses</option>
          {RESERVATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <form
        className="flex flex-1 items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: search || undefined });
        }}
      >
        <div className="min-w-40 flex-1">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Code, name or email"
            className="field mt-1"
          />
        </div>
        <button type="submit" className="btn-secondary">
          Search
        </button>
        {status || q ? (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              router.push('/admin/reservations');
            }}
            className="btn-ghost"
          >
            Clear
          </button>
        ) : null}
      </form>
    </div>
  );
}
