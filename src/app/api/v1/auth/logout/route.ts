import { apiOk } from '@/lib/api';
import { destroySession } from '@/lib/auth';

/** POST /api/v1/auth/logout — clears the session cookie and deletes the session row. */
export async function POST() {
  await destroySession();
  return apiOk({ signedOut: true });
}
