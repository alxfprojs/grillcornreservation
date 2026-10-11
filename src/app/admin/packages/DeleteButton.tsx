'use client';

import { ConfirmSubmit } from './PackageForm';

/** Destructive delete with a confirmation prompt and pending state. */
export function DeleteButton({
  id,
  action,
  message,
}: {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
  message: string;
}) {
  return (
    <ConfirmSubmit
      action={action}
      id={id}
      label="Delete"
      message={message}
      pendingLabel="…"
    />
  );
}
