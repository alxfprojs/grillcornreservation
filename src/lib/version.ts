/**
 * Single source of truth for the application version.
 *
 * Surfaced in the footer, the `/api/v1/meta` endpoint, the `/docs` page and the
 * `X-App-Version` response header. Bump `VERSION` for a release, add a matching
 * entry to `src/lib/changelog-data.ts`, then run `npm run changelog`.
 */

export const APP_NAME = 'Grill & Corn Catering';
export const APP_TAGLINE = 'Fire-roasted elote catering, delivered hot.';

export const VERSION = '1.0.0';

/** Major version of the HTTP API mounted at `/api/v{major}`. */
export const API_VERSION = 'v1';
