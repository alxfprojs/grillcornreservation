import type { Metadata } from 'next';
import Link from 'next/link';
import { API_VERSION, APP_NAME, VERSION } from '@/lib/version';
import { DEMO_ACCOUNTS, demoAccountsEnabled } from '@/lib/demo-accounts';
import { ROLE_LABELS } from '@/lib/constants';
import { CHANGELOG } from '@/lib/changelog-data';
import { allowedTransitions } from '@/lib/status-machine';
import { PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/roles';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Architecture, roles, API reference and release history.',
};

const RESOURCES = [
  {
    method: 'GET',
    path: '/api/v1/meta',
    auth: 'Public',
    description: 'API and app version, enums, resource index.',
  },
  { method: 'POST', path: '/api/v1/auth/register', auth: 'Public', description: 'Create a customer account.' },
  { method: 'POST', path: '/api/v1/auth/login', auth: 'Public', description: 'Sign in; sets the session cookie.' },
  { method: 'POST', path: '/api/v1/auth/logout', auth: 'Signed in', description: 'Revoke the current session.' },
  { method: 'GET', path: '/api/v1/auth/me', auth: 'Public', description: 'Current user and effective permissions.' },
  { method: 'GET', path: '/api/v1/packages', auth: 'Public', description: 'List packages. Paginated.' },
  { method: 'POST', path: '/api/v1/packages', auth: 'Admin', description: 'Create a package.' },
  { method: 'GET', path: '/api/v1/packages/:id', auth: 'Public', description: 'Fetch one package.' },
  { method: 'PATCH', path: '/api/v1/packages/:id', auth: 'Admin', description: 'Update a package.' },
  { method: 'DELETE', path: '/api/v1/packages/:id', auth: 'Admin', description: 'Delete, or archive if in use.' },
  { method: 'GET', path: '/api/v1/addons', auth: 'Public', description: 'List add-ons. Paginated.' },
  { method: 'POST', path: '/api/v1/addons', auth: 'Admin', description: 'Create an add-on.' },
  { method: 'GET', path: '/api/v1/addons/:id', auth: 'Public', description: 'Fetch one add-on.' },
  { method: 'PATCH', path: '/api/v1/addons/:id', auth: 'Admin', description: 'Update an add-on.' },
  { method: 'DELETE', path: '/api/v1/addons/:id', auth: 'Admin', description: 'Delete, or archive if in use.' },
  { method: 'GET', path: '/api/v1/slots', auth: 'Public', description: 'Availability. `from`, `to`, `openOnly`.' },
  { method: 'POST', path: '/api/v1/slots', auth: 'Staff', description: 'Create a slot.' },
  { method: 'GET', path: '/api/v1/slots/:id', auth: 'Public', description: 'Fetch one slot with seats remaining.' },
  { method: 'PATCH', path: '/api/v1/slots/:id', auth: 'Staff', description: 'Update or open/close a slot.' },
  { method: 'DELETE', path: '/api/v1/slots/:id', auth: 'Staff', description: 'Delete, or close if booked.' },
  { method: 'GET', path: '/api/v1/reservations', auth: 'Any', description: 'Own orders; all orders for staff.' },
  { method: 'POST', path: '/api/v1/reservations', auth: 'Any', description: 'Create a reservation.' },
  { method: 'GET', path: '/api/v1/reservations/:id', auth: 'Owner/staff', description: 'Fetch with add-ons and history.' },
  { method: 'PATCH', path: '/api/v1/reservations/:id', auth: 'Owner/staff', description: 'Edit while PENDING/CONFIRMED.' },
  { method: 'DELETE', path: '/api/v1/reservations/:id', auth: 'Staff', description: 'Permanently delete.' },
  { method: 'GET', path: '/api/v1/reservations/:id/status', auth: 'Owner/staff', description: 'Status history.' },
  { method: 'PATCH', path: '/api/v1/reservations/:id/status', auth: 'Owner/staff', description: 'Advance or cancel.' },
  { method: 'GET', path: '/api/v1/users', auth: 'Admin', description: 'List accounts.' },
  { method: 'POST', path: '/api/v1/users', auth: 'Admin', description: 'Create an account.' },
  { method: 'GET', path: '/api/v1/users/:id', auth: 'Admin', description: 'Fetch one account.' },
  { method: 'PATCH', path: '/api/v1/users/:id', auth: 'Admin', description: 'Update role, status, password.' },
  { method: 'DELETE', path: '/api/v1/users/:id', auth: 'Admin', description: 'Delete an account.' },
  { method: 'GET', path: '/api/v1/messages', auth: 'Staff', description: 'List quote requests.' },
  { method: 'POST', path: '/api/v1/messages', auth: 'Public', description: 'Submit a quote request.' },
];

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-sky-100 text-sky-800',
  POST: 'bg-emerald-100 text-emerald-800',
  PATCH: 'bg-amber-100 text-amber-800',
  DELETE: 'bg-red-100 text-red-800',
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">Documentation</h1>
        <p className="mt-2 text-ink-600">
          {APP_NAME} v{VERSION} &middot; HTTP API <code className="font-mono">{API_VERSION}</code>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="#api" className="btn-secondary btn-sm">
            API reference
          </a>
          <a href="#roles" className="btn-secondary btn-sm">
            Roles &amp; permissions
          </a>
          <a href="#accounts" className="btn-secondary btn-sm">
            Test accounts
          </a>
          <Link href="/changelog" className="btn-secondary btn-sm">
            Changelog
          </Link>
        </div>
      </header>

      {/* ------------------------------------------------------------- Stack */}
      <Section id="stack" title="Stack">
        <ul className="list-disc space-y-1.5 pl-5 text-ink-700">
          <li>
            <strong>Next.js 16</strong> (App Router, React 19, Turbopack) with Server Actions for
            every form mutation.
          </li>
          <li>
            <strong>Prisma 7</strong> + SQLite via the better-sqlite3 driver adapter. Swap the
            datasource to Postgres by changing one line in the schema.
          </li>
          <li>
            <strong>Tailwind CSS 4</strong> with a design-token theme in <code>src/app/globals.css</code>.
          </li>
          <li>
            <strong>zod 4</strong> validates every Server Action payload and API request body from
            the same schemas.
          </li>
          <li>
            <strong>bcrypt</strong> password hashing; opaque server-side sessions in an httpOnly
            cookie.
          </li>
        </ul>
      </Section>

      {/* -------------------------------------------------------- Architecture */}
      <Section id="architecture" title="How requests are handled">
        <div className="space-y-4 text-ink-700">
          <p>
            <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-sm">src/proxy.ts</code>{' '}
            runs first on every request. It only checks whether a session cookie is <em>present</em> —
            no database call — and redirects anonymous visitors away from <code>/account</code> and{' '}
            <code>/admin</code>. This is a UX affordance, not a security boundary.
          </p>
          <p>
            Every page, Server Action and API handler then re-checks the session and permissions
            server-side via <code>requireUser()</code> / <code>requirePermission()</code> in{' '}
            <code>src/lib/rbac.ts</code>. A forged or stripped cookie therefore cannot read or mutate
            anything.
          </p>
          <p>
            Business rules live in <code>src/lib/reservation-service.ts</code> and{' '}
            <code>src/lib/reservations.ts</code>, so the UI and the REST API enforce identical
            pricing and status rules. Slot capacity is guarded with a conditional{' '}
            <code>updateMany</code>, which makes the check-and-set atomic and prevents two customers
            from claiming the last seats.
          </p>
        </div>
      </Section>

      {/* -------------------------------------------------------------- Roles */}
      <Section id="roles" title="Roles and permissions">
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Role</th>
                <th>What it can do</th>
              </tr>
            </thead>
            <tbody>
              {(['CUSTOMER', 'STAFF', 'ADMIN'] as const).map((role) => (
                <tr key={role}>
                  <td>
                    <span className="badge bg-ink-100 text-ink-700 ring-ink-200">{ROLE_LABELS[role]}</span>
                  </td>
                  <td className="text-ink-700">
                    {role === 'CUSTOMER'
                      ? 'Browse the menu, check availability, create reservations, edit or cancel their own orders while they are PENDING or CONFIRMED.'
                      : role === 'STAFF'
                        ? 'Everything a customer can do, plus: read every reservation, advance status through the workflow, add internal notes, manage the booking schedule, triage contact messages.'
                        : 'Everything staff can do, plus: full CRUD over packages and add-ons, user accounts (create, promote, deactivate, delete), and reading the API.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 font-semibold text-ink-900">Permission matrix</h3>
        <div className="card mt-3 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Permission</th>
                <th>Customer</th>
                <th>Staff</th>
                <th>Admin</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <tr key={permission}>
                  <td className="font-mono text-xs">{permission}</td>
                  <td>{has('CUSTOMER', permission) ? <Tick /> : <Dash />}</td>
                  <td>{has('STAFF', permission) ? <Tick /> : <Dash />}</td>
                  <td>{has('ADMIN', permission) ? <Tick /> : <Dash />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint mt-2">
          Checks are capability-based, not role-comparison-based, so adding a fourth role later does
          not require touching every call site.
        </p>
      </Section>

      {/* ------------------------------------------------------------- Status */}
      <Section id="workflow" title="Reservation workflow">
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>From</th>
                <th>May move to</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(allowedTransitions('PENDING')).length > 0
                ? ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'].map(
                    (status) => {
                      const next = allowedTransitions(status);
                      return (
                        <tr key={status}>
                          <td>
                            <StatusChip status={status} />
                          </td>
                          <td>
                            {next.length === 0 ? (
                              <span className="text-ink-500">Terminal — no further changes</span>
                            ) : (
                              <span className="flex flex-wrap gap-1.5">
                                {next.map((s) => (
                                  <StatusChip key={s} status={s} />
                                ))}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    },
                  )
                : null}
            </tbody>
          </table>
        </div>
        <p className="hint mt-2">
          Defined once in <code className="font-mono">src/lib/status-machine.ts</code> and read by both
          the admin UI and the server, so the dropdown can never offer an illegal move. Customers may
          only move their own reservation to <code>CANCELLED</code>.
        </p>
      </Section>

      {/* --------------------------------------------------------------- API */}
      <Section id="api" title={`API reference (${API_VERSION})`}>
        <p className="text-ink-700">
          All endpoints live under <code className="font-mono">/api/v1</code>. The major version is in
          the path so a future <code className="font-mono">v2</code> can run alongside it.
        </p>

        <h3 className="mt-6 font-semibold text-ink-900">Response envelope</h3>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-4 text-xs text-ink-100">
{`// 2xx
{
  "data": <resource | [resources]>,
  "meta": { "apiVersion": "v1", "appVersion": "${VERSION}", ... }
}

// list responses add pagination to meta
{ "data": [...], "meta": { "total": 57, "page": 1, "pageSize": 20, "totalPages": 3 } }

// 4xx / 5xx
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body failed validation.",
    "fields": { "partySize": "Minimum party size is 10." }
  }
}`}
        </pre>
        <p className="hint mt-2">
          Every response also carries <code className="font-mono">X-App-Version</code> and{' '}
          <code className="font-mono">X-API-Version</code> headers.
        </p>

        <h3 className="mt-6 font-semibold text-ink-900">Error codes</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ['400', 'BAD_REQUEST'],
            ['401', 'UNAUTHENTICATED'],
            ['403', 'FORBIDDEN'],
            ['404', 'NOT_FOUND'],
            ['409', 'CONFLICT'],
            ['422', 'VALIDATION_ERROR'],
            ['500', 'INTERNAL'],
          ].map(([status, code]) => (
            <span key={code} className="badge bg-ink-100 font-mono text-ink-700 ring-ink-200">
              {status} {code}
            </span>
          ))}
        </div>

        <h3 className="mt-6 font-semibold text-ink-900">Endpoints</h3>
        <div className="card mt-3 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Access</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((r) => (
                <tr key={`${r.method} ${r.path}`}>
                  <td>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${METHOD_STYLES[r.method]}`}
                    >
                      {r.method}
                    </span>
                  </td>
                  <td className="font-mono text-xs whitespace-nowrap">{r.path}</td>
                  <td className="text-xs whitespace-nowrap text-ink-600">{r.auth}</td>
                  <td className="text-ink-700">{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 font-semibold text-ink-900">Example</h3>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-4 text-xs text-ink-100">
{`# Sign in and keep the cookie jar
curl -c jar.txt -X POST http://localhost:3000/api/v1/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"customer@grillcorn.test","password":"Customer!2345"}'

# List open slots
curl 'http://localhost:3000/api/v1/slots?openOnly=true'

# Book
curl -b jar.txt -X POST http://localhost:3000/api/v1/reservations \\
  -H 'Content-Type: application/json' \\
  -d '{
        "slotId": "<slot id>",
        "packageId": "<package id>",
        "partySize": 25,
        "fulfillment": "DELIVERY",
        "addressLine1": "2100 Mission Street",
        "city": "San Francisco",
        "state": "CA",
        "postalCode": "94110",
        "addOns": [{ "addonId": "<addon id>", "quantity": 1 }]
      }'`}
        </pre>
      </Section>

      {/* ---------------------------------------------------------- Accounts */}
      <Section id="accounts" title="Test accounts">
        <p className="text-ink-700">
          Created by <code className="font-mono">npm run db:seed</code>. The sign-in page also lists
          them in development.
        </p>

        <div className="mt-4 space-y-3">
          {DEMO_ACCOUNTS.map((account) => (
            <div key={account.email} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge bg-brand-100 text-brand-800 ring-brand-300">
                  {ROLE_LABELS[account.role]}
                </span>
                <span className="text-sm text-ink-600">{account.summary}</span>
              </div>
              <dl className="mt-2 font-mono text-xs">
                <div className="flex gap-2">
                  <dt className="w-16 text-ink-500">email</dt>
                  <dd className="text-ink-800">{account.email}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 text-ink-500">password</dt>
                  <dd className="text-ink-800">{account.password}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        {demoAccountsEnabled() ? (
          <p className="hint mt-3">
            These are development credentials. The sign-in page only renders the list outside
            production; set <code className="font-mono">SHOW_DEMO_ACCOUNTS=false</code> to suppress it
            everywhere.
          </p>
        ) : null}
      </Section>

      {/* ---------------------------------------------------------- Changelog */}
      <Section id="changelog" title="Release history">
        <div className="space-y-4">
          {CHANGELOG.map((release) => (
            <div key={release.version} className="card p-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="font-semibold text-ink-900">v{release.version}</h3>
                <span className="hint">{release.date}</span>
                <span className="badge bg-ink-100 text-ink-600 ring-ink-200">{release.stage}</span>
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-700">
                {release.changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Link href="/changelog" className="btn-secondary btn-sm mt-4">
          Full changelog
        </Link>
      </Section>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <h2 className="text-xl font-bold tracking-tight text-ink-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatusChip({ status }: { status: string }) {
  return <span className="badge bg-ink-100 font-mono text-ink-700 ring-ink-200">{status}</span>;
}

function Tick() {
  return (
    <span className="text-emerald-600" aria-label="Allowed">
      ✓
    </span>
  );
}

function Dash() {
  return (
    <span className="text-ink-300" aria-label="Not allowed">
      —
    </span>
  );
}

function has(role: 'CUSTOMER' | 'STAFF' | 'ADMIN', permission: (typeof PERMISSIONS)[number]) {
  // Read the real matrix so the docs can never drift from the code.
  return ROLE_PERMISSIONS[role].includes(permission);
}
