import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { formatDateTime } from '@/lib/money';
import { ROLE_LABELS, type Role } from '@/lib/constants';
import { UserForm } from './UserForm';
import { ConfirmSubmit } from '../packages/PackageForm';
import { deleteUserAction } from '../actions';

export const metadata = { title: 'Users · Admin' };

export default async function AdminUsersPage(props: PageProps<'/admin/users'>) {
  const admin = await requirePermission('user:manage');
  const { saved, deleted, edit: editingId } = await props.searchParams;

  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { reservations: true, sessions: true } } },
  });

  const editing = editingId ? users.find((u) => u.id === editingId) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">Users</h2>
        <p className="hint mt-0.5">{users.length} accounts</p>
      </div>

      {saved ? <div className="alert-success">User saved.</div> : null}
      {deleted ? <div className="alert-success">User removed.</div> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="card overflow-x-auto self-start">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Orders</th>
                <th>Sessions</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={editing?.id === u.id ? 'bg-brand-50' : undefined}>
                  <td>
                    <div className="font-semibold text-ink-900">
                      {u.name}
                      {u.id === admin.id ? (
                        <span className="ml-1.5 text-xs font-normal text-ink-500">(you)</span>
                      ) : null}
                    </div>
                    <div className="hint">{u.email}</div>
                    <div className="hint">Joined {formatDateTime(u.createdAt)}</div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        u.role === 'ADMIN'
                          ? 'bg-violet-50 text-violet-700 ring-violet-200'
                          : u.role === 'STAFF'
                            ? 'bg-sky-50 text-sky-700 ring-sky-200'
                            : 'bg-ink-100 text-ink-600 ring-ink-200'
                      }`}
                    >
                      {ROLE_LABELS[u.role as Role]}
                    </span>
                  </td>
                  <td className="text-ink-600">{u._count.reservations}</td>
                  <td className="text-ink-600">{u._count.sessions}</td>
                  <td>
                    <span
                      className={`badge ${
                        u.isActive
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-red-50 text-red-700 ring-red-200'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/users?edit=${u.id}#form`}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100"
                      >
                        Edit
                      </Link>
                      {u.id === admin.id ? null : (
                        <ConfirmSubmit
                          action={deleteUserAction}
                          id={u.id}
                          label="Delete"
                          pendingLabel="…"
                          message={`Delete ${u.name}? Their reservations will be removed too. This cannot be undone.`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card-pad" id="form">
            <h3 className="font-semibold text-ink-900">
              {editing ? `Edit ${editing.name}` : 'New user'}
            </h3>
            {editing ? (
              <Link
                href="/admin/users#form"
                className="hint mt-1 inline-block hover:text-ink-800 hover:underline"
              >
                Cancel editing
              </Link>
            ) : null}
            <div className="mt-4">
              <UserForm user={editing} key={editing?.id ?? 'new'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
