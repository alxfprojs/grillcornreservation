import {
  CUSTOMER_SELF_SERVICE_STATUSES,
  RESERVATION_STATUSES,
  type ReservationStatus,
} from './constants';

/**
 * The reservation status state machine.
 *
 * Deliberately free of any server-only imports so both Server Components,
 * Server Actions and Client Components can share one definition of the legal
 * transitions. Keeping a single table is what stops the admin UI from offering
 * a move the server will reject.
 */

/** Allowed forward/backward transitions. Terminal states have no exits. */
const TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function allowedTransitions(from: string): readonly ReservationStatus[] {
  return TRANSITIONS[from as ReservationStatus] ?? [];
}

export function canTransition(from: string, to: string): boolean {
  return allowedTransitions(from).includes(to as ReservationStatus);
}

export function isTerminal(status: string): boolean {
  return allowedTransitions(status).length === 0;
}

/** Statuses a customer is allowed to set on their own reservation. */
export function customerCanSetStatus(to: string): boolean {
  return (CUSTOMER_SELF_SERVICE_STATUSES as readonly string[]).includes(to);
}

/** Whether the reservation is still open to edits. */
export function isEditable(status: string): boolean {
  return status === 'PENDING' || status === 'CONFIRMED';
}

export { RESERVATION_STATUSES };
export type { ReservationStatus };
