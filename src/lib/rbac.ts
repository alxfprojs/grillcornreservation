import 'server-only';
import { getCurrentUser } from './auth';
import { can, type Permission } from './roles';
import type { SessionUser } from './session-user';

/**
 * Server-side authorization guards.
 *
 * Every Server Action and API handler calls these to turn "who is calling?" into
 * a hard check. The pure role/permission table itself lives in `lib/roles.ts`
 * so client components can share it.
 */

export { can, permissionsFor, isStaffRole, isAdminRole, PERMISSIONS } from './roles';
export type { Permission } from './roles';

/** Throws `UNAUTHENTICATED` when the caller is not signed in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  return user;
}

/** Throws unless the caller is signed in *and* holds `permission`. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) throw new Error('FORBIDDEN');
  return user;
}

export type { SessionUser };
