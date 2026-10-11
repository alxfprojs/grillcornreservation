'use client';

import { useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/money';
import { FULFILLMENT_LABELS, PARTY_SIZE_MAX, PARTY_SIZE_MIN, type Fulfillment } from '@/lib/constants';
import { createReservationAction, type BookingState } from './actions';
import { SubmitButton } from '@/components/SubmitButton';
import { LiveQuote } from './LiveQuote';

const initialState: BookingState = {};

export interface SlotOption {
  id: string;
  label: string;
  remaining: number;
}
export interface PackageOption {
  id: string;
  name: string;
  tagline: string;
  pricePerHead: number;
  minGuests: number;
  maxGuests: number;
}
export interface AddonOption {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  priceMode: string;
}

export function BookingForm({
  slots,
  packages,
  addons,
  initialSlotId,
  initialPackageId,
}: {
  slots: SlotOption[];
  packages: PackageOption[];
  addons: AddonOption[];
  initialSlotId: string;
  initialPackageId: string;
}) {
  const [state, action] = useActionState(createReservationAction, initialState);

  // `state.values` holds both strings and numbers; form controls need strings.
  const sv = (key: string): string | undefined => {
    const value = state.values?.[key];
    return value === undefined ? undefined : String(value);
  };

  const [slotId, setSlotId] = useState(sv('slotId') || initialSlotId);
  const [packageId, setPackageId] = useState(sv('packageId') || initialPackageId);
  const [partySize, setPartySize] = useState(Number(sv('partySize') ?? 25));
  const [fulfillment, setFulfillment] = useState<Fulfillment>(
    (sv('fulfillment') as Fulfillment) || 'DELIVERY',
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const selectedPackage = packages.find((p) => p.id === packageId);
  const selectedSlot = slots.find((s) => s.id === slotId);

  const addOnLines = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ addonId: id, quantity: qty })),
    [quantities],
  );

  if (packages.length === 0) {
    return (
      <div className="card-pad text-center">
        <h2 className="text-lg font-semibold text-ink-900">No packages available</h2>
        <p className="mt-2 text-sm text-ink-600">
          The catering menu has not been published yet. Please check back soon or send a quote
          request.
        </p>
        <Link href="/#quote" className="btn-primary mt-4">
          Request a quote
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_20rem]" noValidate>
      <div className="space-y-6">
        {state.error ? (
          <div className="alert-error" role="alert">
            {state.error}
          </div>
        ) : null}

        {/* ------------------------------------------------------------ Slot */}
        <fieldset className="card-pad">
          <legend className="sr-only">Delivery slot</legend>
          <Step n={1} title="Choose a slot" />
          {slots.length === 0 ? (
            <p className="mt-4 text-sm text-ink-600">
              No open slots right now.{' '}
              <Link href="/#quote" className="font-semibold text-brand-700 hover:underline">
                Request a date
              </Link>
              .
            </p>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {slots.map((slot) => {
                const disabled = slot.remaining <= 0 && slot.id !== slotId;
                return (
                  <label
                    key={slot.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition ${
                      slotId === slot.id
                        ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200'
                        : 'border-ink-200 bg-white hover:border-ink-300'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="slotId"
                        value={slot.id}
                        checked={slotId === slot.id}
                        disabled={disabled}
                        onChange={() => setSlotId(slot.id)}
                        className="accent-brand-600"
                      />
                      <span className="text-sm font-medium text-ink-900">{slot.label}</span>
                    </span>
                    <span className="shrink-0 text-xs text-ink-500">
                      {slot.remaining <= 0 ? 'Full' : `${slot.remaining} left`}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {state.fields?.slotId ? <p className="error-text mt-2">{state.fields.slotId}</p> : null}
        </fieldset>

        {/* --------------------------------------------------------- Package */}
        <fieldset className="card-pad">
          <legend className="sr-only">Package</legend>
          <Step n={2} title="Choose a package" />
          <div className="mt-4 space-y-2">
            {packages.map((pkg) => {
              const overLimit = partySize < pkg.minGuests || partySize > pkg.maxGuests;
              return (
                <label
                  key={pkg.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    packageId === pkg.id
                      ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200'
                      : 'border-ink-200 bg-white hover:border-ink-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="packageId"
                    value={pkg.id}
                    checked={packageId === pkg.id}
                    onChange={() => setPackageId(pkg.id)}
                    className="mt-1 accent-brand-600"
                  />
                  <span className="flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-ink-900">{pkg.name}</span>
                      <span className="text-sm font-semibold text-brand-700">
                        {formatMoney(pkg.pricePerHead)}
                        <span className="text-xs font-normal text-ink-500">/guest</span>
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-600">{pkg.tagline}</span>
                    <span className="mt-1 block text-xs text-ink-500">
                      {pkg.minGuests}–{pkg.maxGuests} guests
                      {overLimit ? ' — adjust guest count for this package' : ''}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-5">
            <label className="label" htmlFor="partySize">
              Number of guests
            </label>
            <input
              id="partySize"
              name="partySize"
              type="number"
              min={PARTY_SIZE_MIN}
              max={PARTY_SIZE_MAX}
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
              className={`field mt-1 ${state.fields?.partySize ? 'field-error' : ''}`}
              required
            />
            {selectedPackage ? (
              <p className="hint mt-1">
                {selectedPackage.name} serves {selectedPackage.minGuests}–{selectedPackage.maxGuests}{' '}
                guests.
              </p>
            ) : null}
            {state.fields?.partySize ? <p className="error-text mt-1">{state.fields.partySize}</p> : null}
          </div>
        </fieldset>

        {/* --------------------------------------------------------- Add-ons */}
        <fieldset className="card-pad">
          <legend className="sr-only">Add-ons</legend>
          <Step n={3} title="Add extras" optional />
          {addons.length === 0 ? (
            <p className="mt-4 text-sm text-ink-600">No add-ons available right now.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {addons.map((addon) => (
                <div
                  key={addon.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 bg-white p-3"
                >
                  <input type="hidden" name="addonIds" value={addon.id} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{addon.name}</p>
                    <p className="text-xs text-ink-600">{addon.description}</p>
                    <p className="hint mt-0.5">
                      {formatMoney(addon.priceCents)} {addon.priceMode === 'PER_HEAD' ? 'per guest' : 'per order'}
                    </p>
                  </div>
                  <input
                    name="addonQuantities"
                    type="number"
                    min={0}
                    max={20}
                    aria-label={`Quantity of ${addon.name}`}
                    value={quantities[addon.id] ?? 0}
                    onChange={(e) =>
                      setQuantities((q) => ({ ...q, [addon.id]: Number(e.target.value) || 0 }))
                    }
                    className="field w-20 shrink-0"
                  />
                </div>
              ))}
            </div>
          )}
        </fieldset>

        {/* ------------------------------------------------ Delivery / pickup */}
        <fieldset className="card-pad">
          <legend className="sr-only">Fulfillment</legend>
          <Step n={4} title="Delivery or pickup" />

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(['DELIVERY', 'PICKUP'] as const).map((type) => (
              <label
                key={type}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition ${
                  fulfillment === type
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200'
                    : 'border-ink-200 bg-white hover:border-ink-300'
                }`}
              >
                <input
                  type="radio"
                  name="fulfillment"
                  value={type}
                  checked={fulfillment === type}
                  onChange={() => setFulfillment(type)}
                  className="accent-brand-600"
                />
                <span className="text-sm font-medium text-ink-900">{FULFILLMENT_LABELS[type]}</span>
              </label>
            ))}
          </div>

          {fulfillment === 'DELIVERY' ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <TextInput
                name="addressLine1"
                label="Street address"
                autoComplete="address-line1"
                error={state.fields?.addressLine1}
                defaultValue={sv('addressLine1')}
                className="sm:col-span-2"
                required
              />
              <TextInput
                name="addressLine2"
                label="Apt / suite (optional)"
                autoComplete="address-line2"
                error={state.fields?.addressLine2}
                defaultValue={sv('addressLine2')}
                className="sm:col-span-2"
              />
              <TextInput
                name="city"
                label="City"
                autoComplete="address-level2"
                error={state.fields?.city}
                defaultValue={sv('city')}
                required
              />
              <TextInput
                name="state"
                label="State"
                autoComplete="address-level1"
                error={state.fields?.state}
                defaultValue={sv('state')}
                required
              />
              <TextInput
                name="postalCode"
                label="ZIP"
                autoComplete="postal-code"
                error={state.fields?.postalCode}
                defaultValue={sv('postalCode')}
                required
              />
              <TextInput
                name="contactPhone"
                label="Day-of phone"
                type="tel"
                autoComplete="tel"
                error={state.fields?.contactPhone}
                defaultValue={sv('contactPhone')}
              />
            </div>
          ) : null}
        </fieldset>

        <fieldset className="card-pad">
          <legend className="sr-only">Notes</legend>
          <Step n={5} title="Anything else?" optional />
          <textarea
            name="notes"
            rows={4}
            defaultValue={sv('notes')}
            placeholder="Allergies, setup instructions, where to park…"
            className={`field mt-4 ${state.fields?.notes ? 'field-error' : ''}`}
          />
          {state.fields?.notes ? <p className="error-text mt-1">{state.fields.notes}</p> : null}
        </fieldset>
      </div>

      {/* ------------------------------------------------------------ Summary */}
      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="card-pad">
          <h2 className="font-semibold text-ink-900">Order summary</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <Row
              label={selectedPackage ? `${selectedPackage.name} × ${partySize}` : 'Package'}
              value={selectedPackage ? formatMoney(selectedPackage.pricePerHead * partySize) : '—'}
            />
            <Row label="Delivery" value={fulfillment === 'DELIVERY' ? formatMoney(2500) : formatMoney(0)} />

            {addOnLines.map((line) => {
              const addon = addons.find((a) => a.id === line.addonId);
              if (!addon) return null;
              const units = addon.priceMode === 'PER_HEAD' ? line.quantity * partySize : line.quantity;
              return (
                <Row
                  key={line.addonId}
                  label={`${addon.name} × ${line.quantity}`}
                  value={formatMoney(addon.priceCents * units)}
                />
              );
            })}
          </dl>

          <LiveQuote
            packageId={packageId}
            partySize={partySize}
            fulfillment={fulfillment}
            addOns={addOnLines}
          />

          <div className="mt-4 border-t border-ink-200 pt-4">
            <p className="hint">
              {selectedSlot ? `Slot: ${selectedSlot.label}` : 'No slot selected'}
            </p>
          </div>

          <SubmitButton
            className="mt-4 w-full"
            pendingLabel="Reserving…"
            disabled={slots.length === 0}
          >
            Reserve now
          </SubmitButton>
          <p className="hint mt-2 text-center">
            You are not charged here. We confirm by email.
          </p>
        </div>
      </aside>
    </form>
  );
}

function Step({ n, title, optional }: { n: number; title: string; optional?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
        {n}
      </span>
      <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
      {optional ? <span className="badge bg-ink-100 text-ink-600 ring-ink-200">Optional</span> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="min-w-0 truncate text-ink-600">{label}</dt>
      <dd className="shrink-0 font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function TextInput({
  name,
  label,
  error,
  type = 'text',
  autoComplete,
  defaultValue,
  required,
  className = '',
}: {
  name: string;
  label: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        className={`field mt-1 ${error ? 'field-error' : ''}`}
      />
      {error ? <p className="error-text mt-1">{error}</p> : null}
    </div>
  );
}
