import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { BookingForm } from './BookingForm';

export const metadata: Metadata = { title: 'Book catering' };

export default async function BookPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/book');

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [slots, packages, addons] = await Promise.all([
    prisma.slot.findMany({
      where: { isOpen: true, date: { gte: startOfToday } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 24,
      select: { id: true, date: true, startTime: true, endTime: true, capacity: true, seatsUsed: true },
    }),
    prisma.package.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { pricePerHead: 'asc' }],
    }),
    prisma.addon.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { priceCents: 'asc' }],
    }),
  ]);

  const slotOptions = slots.map((slot) => ({
    id: slot.id,
    label: `${new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(slot.date)}, ${slot.startTime}–${slot.endTime}`,
    remaining: Math.max(0, slot.capacity - slot.seatsUsed),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-ink-900">Book catering</h1>
      <p className="mt-2 text-ink-600">
        Five quick steps. We confirm by email and take payment on delivery.
      </p>

      <div className="mt-8">
        <BookingForm
          slots={slotOptions}
          packages={packages.map((p) => ({
            id: p.id,
            name: p.name,
            tagline: p.tagline,
            pricePerHead: p.pricePerHead,
            minGuests: p.minGuests,
            maxGuests: p.maxGuests,
          }))}
          addons={addons.map((a) => ({
            id: a.id,
            name: a.name,
            description: a.description,
            priceCents: a.priceCents,
            priceMode: a.priceMode,
          }))}
          initialSlotId={slotOptions[0]?.id ?? ''}
          initialPackageId={packages[0]?.id ?? ''}
        />
      </div>
    </div>
  );
}
