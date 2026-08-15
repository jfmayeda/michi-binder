import { redirect } from 'next/navigation';

/**
 * The shelf is authed-only in production. Anonymous users only see landing + playground.
 * TODO T5.3: replace NODE_ENV gate with a real session check.
 */
export default function ShelfLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    redirect('/');
  }
  return children;
}
