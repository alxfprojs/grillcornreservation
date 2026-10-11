/**
 * Regenerates `CHANGELOG.md` from `src/lib/changelog-data.ts`, which is also
 * what the in-app `/changelog` page renders. One source of truth, two
 * renderings.
 *
 *   npm run changelog
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHANGELOG } from '../src/lib/changelog-data';
import { VERSION, API_VERSION } from '../src/lib/version';

const banner = `# Changelog

All notable changes to Grill & Corn Catering.

This file is generated from \`src/lib/changelog-data.ts\` by \`npm run changelog\`.
Edit that file, not this one.

Current version: **${VERSION}** · HTTP API: **${API_VERSION}**

Versions follow [semantic versioning](https://semver.org/). Breaking changes to the
HTTP API ship under a new path (\`/api/v2\`) rather than altering \`/api/${API_VERSION}\`.
`;

const body = CHANGELOG.map((release) => {
  const heading = `## v${release.version} — ${release.date}\n\n_${release.stage}_\n`;
  const items = release.changes.map((change) => `- ${change}`).join('\n');
  return `${heading}\n${items}\n`;
}).join('\n---\n\n');

const output = `${banner}\n---\n\n${body}`;

const target = resolve(process.cwd(), 'CHANGELOG.md');
writeFileSync(target, output, 'utf8');
console.log(`Wrote ${target} (${CHANGELOG.length} release(s), current v${VERSION}).`);
