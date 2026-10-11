import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ProfileForms } from './ProfileForms';

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account');

  return <ProfileForms name={user.name} phone={user.phone} email={user.email} />;
}
