import { apiOk } from '@/lib/api';
import { API_VERSION, APP_NAME, APP_TAGLINE, VERSION } from '@/lib/version';
import { ROLES, RESERVATION_STATUSES, FULFILLMENT_TYPES } from '@/lib/constants';

/**
 * GET /api/v1/meta
 *
 * Machine-readable description of the deployed API and app version. Useful for
 * smoke tests and for clients that want to confirm which version they are
 * talking to before issuing a mutation.
 */
export async function GET() {
  return apiOk(
    {
      name: APP_NAME,
      tagline: APP_TAGLINE,
      appVersion: VERSION,
      apiVersion: API_VERSION,
      documentation: '/docs',
      changelog: '/changelog',
      resources: {
        auth: '/api/v1/auth',
        packages: '/api/v1/packages',
        addons: '/api/v1/addons',
        slots: '/api/v1/slots',
        reservations: '/api/v1/reservations',
        users: '/api/v1/users',
        messages: '/api/v1/messages',
      },
      enums: {
        roles: ROLES,
        reservationStatuses: RESERVATION_STATUSES,
        fulfillmentTypes: FULFILLMENT_TYPES,
      },
    },
    { status: 'stable' },
  );
}
