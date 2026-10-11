import { STATUS_LABELS, STATUS_STYLES, type ReservationStatus } from '@/lib/constants';

/** Colored status pill used across the account and admin screens. */
export function StatusBadge({ status }: { status: string }) {
  const key = (status in STATUS_LABELS ? status : 'PENDING') as ReservationStatus;
  return <span className={`badge ${STATUS_STYLES[key]}`}>{STATUS_LABELS[key]}</span>;
}
