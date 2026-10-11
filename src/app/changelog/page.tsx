import type { Metadata } from 'next';
import Link from 'next/link';
import { CHANGELOG } from '@/lib/changelog-data';
import { VERSION, API_VERSION } from '@/lib/version';

export const metadata: Metadata = { title: 'Changelog' };

const STAGE_STYLES: Record<string, string> = {
  'Initial release': 'bg-brand-100 text-brand-800 ring-brand-300',
  Feature: 'bg-sky-100 text-sky-800 ring-sky-200',
  Fix: 'bg-amber-100 text-amber-800 ring-amber-200',
  Change: 'bg-ink-100 text-ink-700 ring-ink-200',
  Breaking: 'bg-red-100 text-red-800 ring-red-200',
};

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">Changelog</h1>
        <p className="mt-2 text-ink-600">
          Current version <span className="font-semibold text-ink-900">v{VERSION}</span> &middot; API{' '}
          <span className="font-mono">{API_VERSION}</span>
        </p>
        <p className="hint mt-2">
          Follows semantic versioning. Breaking changes to <code className="font-mono">/api/{API_VERSION}</code>{' '}
          ship under a new path rather than changing this one.
        </p>
      </header>

      <ol className="mt-10 space-y-8">
        {CHANGELOG.map((release, index) => (
          <li key={release.version} className="relative pl-8">
            {/* Timeline rail */}
            <span
              aria-hidden
              className="absolute top-2 left-2 h-3 w-3 rounded-full bg-brand-500 ring-4 ring-brand-100"
            />
            {index < CHANGELOG.length - 1 ? (
              <span aria-hidden className="absolute top-6 left-[0.4375rem] h-full w-px bg-ink-200" />
            ) : null}

            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-xl font-bold text-ink-900">v{release.version}</h2>
              <time className="hint" dateTime={release.date}>
                {release.date}
              </time>
              <span className={`badge ${STAGE_STYLES[release.stage] ?? STAGE_STYLES.Change}`}>
                {release.stage}
              </span>
            </div>

            <ul className="mt-4 space-y-2">
              {release.changes.map((change, i) => (
                <li key={i} className="flex gap-2 text-ink-700">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-300" />
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="card-pad mt-12 text-center">
        <p className="text-sm text-ink-700">
          Looking for the API reference instead?
        </p>
        <Link href="/docs#api" className="btn-primary btn-sm mt-3">
          API docs
        </Link>
      </div>
    </div>
  );
}
