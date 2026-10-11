import type { Role } from './constants';

/**
 * Demo credentials.
 *
 * These are the exact accounts created by `prisma/seed.ts`. They are surfaced
 * in the UI on the sign-in page and in the docs so a reviewer can log in as any
 * role without guessing. The sign-in widget only renders outside production.
 */
export interface DemoAccount {
  role: Role;
  email: string;
  password: string;
  summary: string;
  can: string[];
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    role: 'ADMIN',
    email: 'admin@grillcorn.test',
    password: 'Admin!2345',
    summary: 'Full control of the site.',
    can: [
      'Everything staff can do',
      'Create, edit and delete packages, add-ons and slots',
      'Create, promote, disable and delete user accounts',
      'Read and archive contact messages',
    ],
  },
  {
    role: 'STAFF',
    email: 'staff@grillcorn.test',
    password: 'Staff!2345',
    summary: 'Runs the catering schedule day to day.',
    can: [
      'See and update every reservation',
      'Advance reservations through the status workflow',
      'Open and close booking slots',
      'Add internal notes to orders',
    ],
  },
  {
    role: 'CUSTOMER',
    email: 'customer@grillcorn.test',
    password: 'Customer!2345',
    summary: 'Books their own catering.',
    can: [
      'Browse the menu and check availability',
      'Create reservations',
      'Edit or cancel their own pending orders',
    ],
  },
] as const;

/** Demo credentials are a development affordance — never ship them. */
export function demoAccountsEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.SHOW_DEMO_ACCOUNTS === 'true';
}
