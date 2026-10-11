'use client';

import { useFormStatus } from 'react-dom';
import { Button } from './Button';

/**
 * Submit button that disables itself and shows a pending label while the
 * parent Server Action is in flight. Must be used *inside* a `<form>` that
 * has an `action`.
 */
export function SubmitButton({
  children,
  pendingLabel = 'Saving…',
  variant = 'primary',
  className = '',
  ...rest
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
} & Omit<React.ComponentProps<'button'>, 'children' | 'className'>) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} variant={variant} className={className} {...rest}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
