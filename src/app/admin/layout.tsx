import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { requirePermission } from '@/lib/rbac';
import { AdminNav } from './AdminNav';

/**
 * Staff/admin area.
 *
 * `requirePermission` redirects anonymous visitors to sign in and customers to
 * their own account, so no page below this layout needs its own guard.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');

  try {
    await requirePermission('reservation:read:any');
  } catch {
    redirect('/account');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <AdminNav role={user.role}>{children}</AdminNav>
    </div>
  );
}
