import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const SIZES: Record<Size, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'px-6 py-3 text-base',
};

/**
 * A link or button that looks the same either way. Using `<Link>` for
 * navigation and a real `<button>` for actions keeps semantics correct.
 */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link href={href} className={`${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...rest}>
      {children}
    </Link>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
} & ComponentProps<'button'>) {
  return (
    <button className={`${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
