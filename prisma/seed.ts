/**
 * Database seed.
 *
 * Creates the demo accounts, a realistic catering menu, a rolling schedule of
 * bookable slots, and a spread of reservations in every lifecycle state so the
 * dashboard and the status workflow have something to show on a fresh install.
 *
 * Safe to re-run: every write is an upsert keyed on a stable natural key.
 *
 *   npm run db:seed
 */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { hash } from 'bcryptjs';

// `DATABASE_URL` is relative to the project root, which is the cwd here and
// also where the Prisma CLI resolves it, so both target the same file.
const adapter = new PrismaBetterSqlite3({
  url: (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/^file:/, ''),
});
const prisma = new PrismaClient({ adapter });

const BCRYPT_ROUNDS = 12;

const env = (key: string, fallback: string) => process.env[key] ?? fallback;

const ACCOUNTS = [
  {
    key: 'admin',
    email: env('SEED_ADMIN_EMAIL', 'admin@grillcorn.test'),
    password: env('SEED_ADMIN_PASSWORD', 'Admin!2345'),
    name: 'Ana Reyes',
    phone: '+1 555 0100',
    role: 'ADMIN',
  },
  {
    key: 'staff',
    email: env('SEED_STAFF_EMAIL', 'staff@grillcorn.test'),
    password: env('SEED_STAFF_PASSWORD', 'Staff!2345'),
    name: 'Marcus Bell',
    phone: '+1 555 0101',
    role: 'STAFF',
  },
  {
    key: 'customer',
    email: env('SEED_CUSTOMER_EMAIL', 'customer@grillcorn.test'),
    password: env('SEED_CUSTOMER_PASSWORD', 'Customer!2345'),
    name: 'Priya Nair',
    phone: '+1 555 0102',
    role: 'CUSTOMER',
  },
  {
    key: 'customer2',
    email: 'dana@grillcorn.test',
    password: 'Customer!2345',
    name: 'Dana Whitfield',
    phone: '+1 555 0103',
    role: 'CUSTOMER',
  },
] as const;

const PACKAGES = [
  {
    slug: 'clasico',
    name: 'Clásico',
    tagline: 'The essential corn, done properly',
    description:
      'Charred sweet corn rolled in ancho-chile lime butter, finished with crumbled cotija and a dusting of tajín. Served with lime wedges and napkins.',
    pricePerHead: 750,
    minGuests: 10,
    maxGuests: 150,
    sortOrder: 0,
  },
  {
    slug: 'smokehouse',
    name: 'Smokehouse',
    tagline: 'Brisket, burnt ends and corn',
    description:
      'Everything in Clásico plus smoked brisket slices, burnt-end bites and a tray of house corn ribs. The full spread for a hungry crowd.',
    pricePerHead: 1450,
    minGuests: 20,
    maxGuests: 300,
    sortOrder: 1,
  },
  {
    slug: 'corporate',
    name: 'Corporate',
    tagline: 'Neat, labelled and on time',
    description:
      'Individually portioned corn cups with three sauce flights, serving trays with staff-friendly labels, plus a printed allergen card for your venue.',
    pricePerHead: 1150,
    minGuests: 25,
    maxGuests: 500,
    sortOrder: 2,
  },
  {
    slug: 'fiesta',
    name: 'Fiesta',
    tagline: 'Esquites, elote and a whole lot of lime',
    description:
      'A tasting spread: classic elote, street-style esquites in a cup, charred corn ribs and a build-your-own taco station with three salsas.',
    pricePerHead: 1800,
    minGuests: 40,
    maxGuests: 500,
    sortOrder: 3,
  },
];

const ADDONS = [
  {
    slug: 'extra-elote',
    name: 'Extra elote tray',
    description: 'A full tray of the classic corn, 20 ears.',
    priceCents: 3500,
    priceMode: 'PER_ORDER',
    sortOrder: 0,
  },
  {
    slug: 'esquites-cup',
    name: 'Esquites cups',
    description: 'Street-style corn in a cup with crema and salsa verde.',
    priceCents: 400,
    priceMode: 'PER_HEAD',
    sortOrder: 1,
  },
  {
    slug: 'sauce-flight',
    name: 'Sauce flight',
    description: 'Three house salsas — verde, morita and habanero.',
    priceCents: 1800,
    priceMode: 'PER_ORDER',
    sortOrder: 2,
  },
  {
    slug: 'corn-ribs',
    name: 'Corn ribs',
    description: 'Split grilled ribs, crisped and salted.',
    priceCents: 500,
    priceMode: 'PER_HEAD',
    sortOrder: 3,
  },
  {
    slug: 'vegan-butter',
    name: 'Vegan butter upgrade',
    description: 'Cashew-based chili-lime butter instead of dairy.',
    priceCents: 0,
    priceMode: 'PER_ORDER',
    sortOrder: 4,
  },
  {
    slug: 'staffing',
    name: 'On-site staffing',
    description: 'A grill crew for 3 hours so the corn comes off the fire hot.',
    priceCents: 45000,
    priceMode: 'PER_ORDER',
    sortOrder: 5,
  },
];

const DELIVERY_FEE_CENTS = 2500;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function code(seed: number): string {
  let out = '';
  let n = seed;
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[n % CODE_ALPHABET.length];
    n = Math.floor(n / CODE_ALPHABET.length) + 7919;
  }
  return `GC-${out}`;
}

function midnightUTC(daysFromNow: number): Date {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return new Date(base.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log('Seeding Grill & Corn Catering…\n');

  // ---------------------------------------------------------------- users
  const users: Record<string, { id: string }> = {};
  const passwordHashes = new Map<string, string>();
  for (const account of ACCOUNTS) {
    // Hash once per distinct password instead of once per account.
    let hashValue = passwordHashes.get(account.password);
    if (!hashValue) {
      hashValue = await hash(account.password, BCRYPT_ROUNDS);
      passwordHashes.set(account.password, hashValue);
    }

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, phone: account.phone, role: account.role, isActive: true },
      create: {
        email: account.email,
        passwordHash: hashValue,
        name: account.name,
        phone: account.phone,
        role: account.role,
      },
    });
    users[account.key] = user;
    console.log(`  user  ${account.role.padEnd(8)} ${account.email}`);
  }

  // -------------------------------------------------------------- packages
  for (const pkg of PACKAGES) {
    await prisma.package.upsert({
      where: { slug: pkg.slug },
      update: pkg,
      create: { ...pkg, active: true },
    });
  }
  console.log(`  menu  ${PACKAGES.length} packages`);

  // ---------------------------------------------------------------- addons
  for (const addon of ADDONS) {
    await prisma.addon.upsert({
      where: { slug: addon.slug },
      update: addon,
      create: { ...addon, active: true },
    });
  }
  console.log(`  menu  ${ADDONS.length} add-ons`);

  // ------------------------------------------------------- contact messages
  await prisma.contactMessage.upsert({
    where: { id: 'seed-message-corporate' },
    update: {},
    create: {
      id: 'seed-message-corporate',
      name: 'Jordan Alvarez',
      email: 'jordan@northwind.example',
      phone: '+1 555 0140',
      eventDate: midnightUTC(35),
      partySize: 220,
      message:
        'We are booking a company all-hands in October and would love the corn trays with staff to run the station. Could you quote for 220 people?',
      status: 'NEW',
    },
  });
  await prisma.contactMessage.upsert({
    where: { id: 'seed-message-wedding' },
    update: {},
    create: {
      id: 'seed-message-wedding',
      name: 'Sam & Alex Okafor',
      email: 'sam.okafor@example.com',
      partySize: 120,
      message:
        'Outdoor wedding in August, ceremony at 5pm. Interested in the Fiesta spread with delivery to the venue.',
      status: 'READ',
    },
  });
  console.log('  inbox 2 contact messages');

  // ----------------------------------------------------------------- slots
  // Only create slots that are missing, so re-seeding never duplicates a
  // schedule the operator has already curated.
  const windows = [
    { startTime: '11:00', endTime: '14:00', capacity: 40 },
    { startTime: '16:00', endTime: '19:00', capacity: 80 },
    { startTime: '18:00', endTime: '22:00', capacity: 60 },
  ];

  let createdSlots = 0;
  for (let day = 0; day <= 21; day++) {
    // Closed on Mondays — the crew takes the day off.
    if (midnightUTC(day).getUTCDay() === 1) continue;
    for (const window of windows) {
      const date = midnightUTC(day);
      await prisma.slot.upsert({
        where: { date_startTime: { date, startTime: window.startTime } },
        update: {},
        create: { date, ...window, isOpen: true },
      });
      createdSlots++;
    }
  }
  console.log(`  sched ${createdSlots} slot windows over 3 weeks`);

  // --------------------------------------------------------- reservations
  const packages = await prisma.package.findMany();
  const addons = await prisma.addon.findMany();
  const byPkg = new Map(packages.map((p) => [p.slug, p]));
  const byAddon = new Map(addons.map((a) => [a.slug, a]));

  const slotRows = await prisma.slot.findMany({
    where: { isOpen: true, date: { gte: midnightUTC(0) } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
  if (slotRows.length > 0) {
    const findSlot = (dayOffset: number, startTime: string) =>
      slotRows.find(
        (s) =>
          s.startTime === startTime &&
          s.date.getTime() === midnightUTC(dayOffset).getTime(),
      ) ?? slotRows[0];

    const plan: {
      key: string;
      user: string;
      day: number;
      window: string;
      pkg: string;
      party: number;
      fulfillment: 'DELIVERY' | 'PICKUP';
      status: string;
      addons: [string, number][];
      notes?: string;
    }[] = [
      {
        key: 'seed-res-pending',
        user: 'customer',
        day: 3,
        window: '18:00',
        pkg: 'smokehouse',
        party: 40,
        fulfillment: 'DELIVERY',
        status: 'PENDING',
        addons: [
          ['corn-ribs', 1],
          ['sauce-flight', 1],
        ],
        notes: 'Venue has no oven — please keep everything self-contained.',
      },
      {
        key: 'seed-res-confirmed',
        user: 'customer',
        day: 5,
        window: '16:00',
        pkg: 'corporate',
        party: 60,
        fulfillment: 'DELIVERY',
        status: 'CONFIRMED',
        addons: [
          ['esquites-cup', 1],
          ['sauce-flight', 1],
        ],
        notes: 'Loading dock on B, ask for Luis.',
      },
      {
        key: 'seed-res-preparing',
        user: 'customer2',
        day: 1,
        window: '16:00',
        pkg: 'clasico',
        party: 25,
        fulfillment: 'PICKUP',
        status: 'PREPARING',
        addons: [['extra-elote', 2]],
        notes: 'Picking up in a van, arriving 4:15pm.',
      },
      {
        key: 'seed-res-delivering',
        user: 'customer2',
        day: 0,
        window: '18:00',
        pkg: 'smokehouse',
        party: 30,
        fulfillment: 'DELIVERY',
        status: 'OUT_FOR_DELIVERY',
        addons: [['corn-ribs', 1]],
        notes: 'Office rooftop, west entrance.',
      },
      {
        key: 'seed-res-completed',
        user: 'customer',
        day: -3,
        window: '18:00',
        pkg: 'clasico',
        party: 35,
        fulfillment: 'DELIVERY',
        status: 'COMPLETED',
        addons: [['extra-elote', 1]],
        notes: 'Birthday party — went well, customer asked about catering again.',
      },
    ];

    for (const [index, spec] of plan.entries()) {
      const pkg = byPkg.get(spec.pkg);
      if (!pkg) continue;
      const slot = findSlot(spec.day, spec.window);
      const user = users[spec.user];
      if (!slot || !user) continue;

      const lines = spec.addons
        .map(([slug, qty]) => {
          const addon = byAddon.get(slug);
          if (!addon) return null;
          const units = addon.priceMode === 'PER_HEAD' ? qty * spec.party : qty;
          return {
            addonId: addon.id,
            quantity: qty,
            unitPriceCents: addon.priceCents,
            lineTotalCents: addon.priceCents * units,
          };
        })
        .filter((l): l is NonNullable<typeof l> => l !== null);

      const subtotalCents = pkg.pricePerHead * spec.party;
      const addonsCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
      const deliveryCents = spec.fulfillment === 'DELIVERY' ? DELIVERY_FEE_CENTS : 0;

      const existing = await prisma.reservation.findUnique({ where: { id: spec.key } });
      if (existing) {
        // Keep the seeded seat usage consistent with what is already booked.
        continue;
      }

      const reservation = await prisma.reservation.create({
        data: {
          id: spec.key,
          code: code(index + 1),
          userId: user.id,
          slotId: slot.id,
          packageId: pkg.id,
          partySize: spec.party,
          fulfillment: spec.fulfillment,
          addressLine1: spec.fulfillment === 'DELIVERY' ? '2100 Mission Street' : null,
          addressLine2: spec.fulfillment === 'DELIVERY' ? 'Suite 400' : null,
          city: spec.fulfillment === 'DELIVERY' ? 'San Francisco' : null,
          state: spec.fulfillment === 'DELIVERY' ? 'CA' : null,
          postalCode: spec.fulfillment === 'DELIVERY' ? '94110' : null,
          contactPhone: user.id === users.customer.id ? '+1 555 0102' : '+1 555 0103',
          notes: spec.notes ?? null,
          staffNotes: spec.status === 'CONFIRMED' ? 'Confirmed by phone. Venue pays invoice on arrival.' : null,
          status: spec.status,
          subtotalCents,
          addonsCents,
          deliveryCents,
          totalCents: subtotalCents + addonsCents + deliveryCents,
          addons: { create: lines },
          events: {
            create: [
              { toStatus: 'PENDING', actorId: user.id, note: 'Reservation created' },
              ...(spec.status === 'PENDING'
                ? []
                : [
                    {
                      fromStatus: 'PENDING',
                      toStatus: 'CONFIRMED',
                      actorId: users.staff.id,
                      note: 'Confirmed by phone',
                    },
                  ]),
              ...(spec.status === 'COMPLETED' || spec.status === 'OUT_FOR_DELIVERY' || spec.status === 'PREPARING'
                ? [
                    {
                      fromStatus: 'CONFIRMED',
                      toStatus: 'PREPARING',
                      actorId: users.staff.id,
                      note: 'Corn on the grill',
                    },
                  ]
                : []),
              ...(spec.status === 'OUT_FOR_DELIVERY' || spec.status === 'COMPLETED'
                ? [
                    {
                      fromStatus: 'PREPARING',
                      toStatus: 'OUT_FOR_DELIVERY',
                      actorId: users.staff.id,
                      note: 'Driver dispatched',
                    },
                  ]
                : []),
              ...(spec.status === 'COMPLETED'
                ? [
                    {
                      fromStatus: 'OUT_FOR_DELIVERY',
                      toStatus: 'COMPLETED',
                      actorId: users.staff.id,
                      note: 'Delivered',
                    },
                  ]
                : []),
            ],
          },
        },
      });

      // Mirror the seat usage the booking consumed.
      await prisma.slot.update({
        where: { id: slot.id },
        data: { seatsUsed: { increment: spec.party } },
      });

      console.log(`  order ${reservation.code} ${spec.status.padEnd(16)} ${spec.party} guests`);
    }
  }

  console.log('\nSeed complete.\n');
  console.log('Sign in with any of these:');
  console.log('  ADMIN     admin@grillcorn.test    Admin!2345');
  console.log('  STAFF     staff@grillcorn.test    Staff!2345');
  console.log('  CUSTOMER  customer@grillcorn.test Customer!2345\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('\nSeed failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
