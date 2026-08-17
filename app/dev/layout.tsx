import { notFound } from 'next/navigation';

/**
 * /dev is a development-only route group. Production builds 404 every /dev page.
 */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return children;
}
