/**
 * Shape of the authenticated user as exposed to the UI and API.
 *
 * Lives in its own module so client-safe code (`lib/roles.ts`, client
 * components) can reference the type without importing the server-only
 * `lib/auth.ts` — and with it, the Prisma driver adapter.
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
}
