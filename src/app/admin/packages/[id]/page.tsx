import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { PackageForm } from '../PackageForm';

export const metadata = { title: 'Edit package · Admin' };

export default async function EditPackagePage(props: PageProps<'/admin/packages/[id]'>) {
  await requirePermission('catalog:manage');
  const { id } = await props.params;

  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/admin/packages" className="text-sm font-medium text-brand-700 hover:underline">
        &larr; Packages
      </Link>
      <h2 className="mt-3 text-xl font-semibold text-ink-900">Edit {pkg.name}</h2>

      <div className="card-pad mt-5">
        <PackageForm pkg={pkg} />
      </div>

      <p className="hint mt-4">
        Price and guest-limit changes apply to new reservations only. Existing orders keep the
        price they were quoted.
      </p>
    </div>
  );
}
