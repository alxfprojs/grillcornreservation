'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { contactMessageSchema, fieldErrors } from '@/lib/validation';

export interface QuoteState {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
}

/**
 * Public "request a quote" submission from the landing page.
 *
 * Protected against naive bots with a honeypot field: real users never see it,
 * so any value in `website` means a script filled the form.
 */
export async function submitQuoteAction(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  const raw = {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    eventDate: String(formData.get('eventDate') ?? ''),
    partySize: formData.get('partySize') ? Number(formData.get('partySize')) : undefined,
    message: String(formData.get('message') ?? ''),
    website: String(formData.get('website') ?? ''),
  };

  const parsed = contactMessageSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: 'Check the highlighted fields.',
      fields: fieldErrors(parsed.error),
      values: { name: raw.name, email: raw.email, message: raw.message },
    };
  }

  // Honeypot tripped: pretend success so bots do not learn anything.
  if (parsed.data.website) {
    return { ok: true };
  }

  const user = await getCurrentUser();

  await prisma.contactMessage.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      eventDate: parsed.data.eventDate ? new Date(`${parsed.data.eventDate}T00:00:00.000Z`) : null,
      partySize: parsed.data.partySize ?? null,
      message: parsed.data.message,
      userId: user?.id ?? null,
    },
  });

  revalidatePath('/admin/messages');
  return { ok: true };
}
