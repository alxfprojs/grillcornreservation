import type { Role } from './constants';

/**
 * Pure role and permission logic.
 *
 * Deliberately free of `server-only`, Prisma and any other server dependency so
 * Client Components can import it to decide what to render. The server-side
 * guards (`requireUser`, `requirePermission`) live in `lib/rbac.ts`.
 *
 * Checks are capability-based rather than role-comparison-based, so adding a
 * role later does not require touching every call site.
 */

export const PERMISSIONS = [
  'reservation:create',
  'reservation:read:own',
  'reservation:read:any',
  'reservation:update:own',
  'reservation:update:any',
  'reservation:cancel:own',
  'catalog:manage',
  'schedule:manage',
  'user:manage',
  'message:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  CUSTOMER: [
    'reservation:create',
    'reservation:read:own',
    'reservation:update:own',
    'reservation:cancel:own',
  ],
  STAFF: [
    'reservation:create',
    'reservation:read:own',
    'reservation:read:any',
    'reservation:update:own',
    'reservation:update:any',
    'reservation:cancel:own',
    'schedule:manage',
    'message:manage',
  ],
  ADMIN: PERMISSIONS,
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function isStaffRole(role: Role): boolean {
  return role === 'STAFF' || role === 'ADMIN';
}

export function isAdminRole(role: Role): boolean {
  return role === 'ADMIN';
}
