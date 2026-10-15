import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn — merge conditional classNames and de-duplicate conflicting Tailwind
 * utilities (the shadcn convention). Lets our UI primitives accept an
 * overridable `className` prop without class conflicts.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
