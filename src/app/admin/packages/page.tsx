import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { formatMoney } from '@/lib/money';
import { DeleteButton } from './DeleteButton';
import { deletePackageAction } from '../actions';

export const metadata = { title: 'Packages · Admin' };

export default async function AdminPackagesPage(props: PageProps<'/admin/packages'>) {
  await requirePermission('catalog:manage');
  const { saved, deleted } = await props.searchParams;

  const packages = await prisma.package.findMany({
    orderBy: [{ sortOrder: 'asc' }, { pricePerHead: 'asc' }],
    include: { _count: { select: { reservations: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Packages</h2>
          <p className="hint mt-0.5">{packages.length} total</p>
        </div>
        <Link href="/admin/packages/new" className="btn-primary btn-sm">
          New package
        </Link>
      </div>

      {saved ? <div className="alert-success">Package saved.</div> : null}
      {deleted ? <div className="alert-success">Package removed.</div> : null}

      {packages.length === 0 ? (
        <div className="card-pad text-center text-sm text-ink-600">
          No packages yet.{' '}
          <Link href="/admin/packages/new" className="font-semibold text-brand-700 hover:underline">
            Create the first one
          </Link>
          .
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price / head</th>
                <th>Guests</th>
                <th>Orders</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td>
                    <div className="font-semibold text-ink-900">{pkg.name}</div>
                    <div className="hint font-mono">{pkg.slug}</div>
                  </td>
                  <td className="font-medium">{formatMoney(pkg.pricePerHead)}</td>
                  <td className="text-ink-600">
                    {pkg.minGuests}–{pkg.maxGuests}
                  </td>
                  <td className="text-ink-600">{pkg._count.reservations}</td>
                  <td>
                    <span
                      className={`badge ${
                        pkg.active
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-ink-100 text-ink-600 ring-ink-200'
                      }`}
                    >
                      {pkg.active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/packages/${pkg.id}`}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100"
                      >
                        Edit
                      </Link>
                      <DeleteButton
                        id={pkg.id}
                        action={deletePackageAction}
                        message={
                          pkg._count.reservations > 0
                            ? `"${pkg.name}" is used by ${pkg._count.reservations} reservation(s) and will be archived rather than deleted. Continue?`
                            : `Delete "${pkg.name}"? This cannot be undone.`
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
