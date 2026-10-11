import Link from 'next/link';
import { requirePermission } from '@/lib/rbac';
import { PackageForm } from '../PackageForm';

export const metadata = { title: 'New package · Admin' };

export default async function NewPackagePage() {
  await requirePermission('catalog:manage');

  return (
    <div className="max-w-2xl">
      <Link href="/admin/packages" className="text-sm font-medium text-brand-700 hover:underline">
        &larr; Packages
      </Link>
      <h2 className="mt-3 text-xl font-semibold text-ink-900">New package</h2>
      <div className="card-pad mt-5">
        <PackageForm />
      </div>
    </div>
  );
}
