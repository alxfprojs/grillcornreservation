import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { formatDateOnly, formatDateTime } from '@/lib/money';
import { MessageDeleteButton, MessageStatusControl } from './MessageControls';

export const metadata = { title: 'Messages · Admin' };

export default async function AdminMessagesPage(props: PageProps<'/admin/messages'>) {
  await requirePermission('message:manage');
  const { deleted } = await props.searchParams;

  const rows = await prisma.contactMessage.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    include: { user: true },
  });

  const unread = rows.filter((m) => m.status === 'NEW').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-900">Contact messages</h2>
        <p className="hint mt-0.5">
          {rows.length} total &middot; {unread} unread
        </p>
      </div>

      {deleted ? <div className="alert-success">Message deleted.</div> : null}

      {rows.length === 0 ? (
        <div className="card-pad text-center text-sm text-ink-600">
          No messages yet. Quote requests from the landing page land here.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li
              key={m.id}
              className={`card p-4 ${m.status === 'NEW' ? 'border-brand-300 bg-brand-50/40' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink-900">{m.name}</span>
                    {m.status === 'NEW' ? (
                      <span className="badge bg-brand-600 text-white ring-brand-700">New</span>
                    ) : null}
                    {m.user ? (
                      <span className="hint">signed in as {m.user.email}</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-600">
                    <a href={`mailto:${m.email}`} className="hover:underline">
                      {m.email}
                    </a>
                    {m.phone ? ` · ${m.phone}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <MessageStatusControl id={m.id} status={m.status} />
                  <MessageDeleteButton id={m.id} />
                </div>
              </div>

              <p className="mt-3 text-sm whitespace-pre-line text-ink-800">{m.message}</p>

              <p className="hint mt-3">
                Received {formatDateTime(m.createdAt)}
                {m.eventDate ? ` · event ${formatDateOnly(m.eventDate)}` : ''}
                {m.partySize ? ` · ${m.partySize} guests` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
