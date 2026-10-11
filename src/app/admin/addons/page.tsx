import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { formatMoney } from '@/lib/money';
import { AddonForm } from './AddonForm';
import { ConfirmSubmit } from '../packages/PackageForm';
import { deleteAddonAction } from '../actions';

export const metadata = { title: 'Add-ons · Admin' };

export default async function AdminAddonsPage(props: PageProps<'/admin/addons'>) {
  await requirePermission('catalog:manage');
  const { saved, deleted, edit: editingId } = await props.searchParams;

  const addons = await prisma.addon.findMany({
    orderBy: [{ sortOrder: 'asc' }, { priceCents: 'asc' }],
    include: { _count: { select: { reservationAddons: true } } },
  });

  const editing = editingId ? addons.find((a) => a.id === editingId) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">Add-ons</h2>
        <p className="hint mt-0.5">{addons.length} total</p>
      </div>

      {saved ? <div className="alert-success">Add-on saved.</div> : null}
      {deleted ? <div className="alert-success">Add-on removed.</div> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="card overflow-x-auto self-start">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Used</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {addons.map((addon) => (
                <tr key={addon.id} className={editing?.id === addon.id ? 'bg-brand-50' : undefined}>
                  <td>
                    <div className="font-semibold text-ink-900">{addon.name}</div>
                    <div className="hint font-mono">{addon.slug}</div>
                  </td>
                  <td>
                    <div className="font-medium">{formatMoney(addon.priceCents)}</div>
                    <div className="hint">
                      {addon.priceMode === 'PER_HEAD' ? 'per guest' : 'per order'}
                    </div>
                  </td>
                  <td className="text-ink-600">{addon._count.reservationAddons}</td>
                  <td>
                    <span
                      className={`badge ${
                        addon.active
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-ink-100 text-ink-600 ring-ink-200'
                      }`}
                    >
                      {addon.active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/addons?edit=${addon.id}#form`}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100"
                      >
                        Edit
                      </Link>
                      <ConfirmSubmit
                        action={deleteAddonAction}
                        id={addon.id}
                        label="Delete"
                        pendingLabel="…"
                        message={
                          addon._count.reservationAddons > 0
                            ? `"${addon.name}" is used by existing orders and will be archived rather than deleted. Continue?`
                            : `Delete "${addon.name}"? This cannot be undone.`
                        }
                      />
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
              {editing ? `Edit ${editing.name}` : 'New add-on'}
            </h3>
            {editing ? (
              <Link
                href="/admin/addons#form"
                className="hint mt-1 inline-block hover:text-ink-800 hover:underline"
              >
                Cancel editing
              </Link>
            ) : null}
            <div className="mt-4">
              <AddonForm addon={editing} key={editing?.id ?? 'new'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
