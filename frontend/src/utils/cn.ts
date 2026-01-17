import { type ClassValue, clsx } from 'clsx';

/**
 * Combine class names utility function
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

