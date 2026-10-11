import { apiOk } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { can, permissionsFor } from '@/lib/rbac';

/**
 * GET /api/v1/auth/me
 *
 * Returns the signed-in user and their effective permissions. Always 200; a
 * missing session is reported as `data.user === null` rather than a 401 so
 * clients can render a signed-out state without exception handling.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return apiOk({ user: null, permissions: [] });
  }

  return apiOk({
    user,
    permissions: permissionsFor(user.role),
    can: {
      manageCatalog: can(user.role, 'catalog:manage'),
      manageSchedule: can(user.role, 'schedule:manage'),
      manageUsers: can(user.role, 'user:manage'),
      readAllReservations: can(user.role, 'reservation:read:any'),
    },
  });
}
