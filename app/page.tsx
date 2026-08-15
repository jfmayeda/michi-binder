import Link from 'next/link';
import { SignInPanel } from '@/components/auth/SignInPanel';
import { LandingDesk } from '@/components/landing/LandingDesk';

export default function Home() {
  return (
    <main className="min-h-dvh">
      <section className="mx-auto max-w-2xl px-8 pt-12">
        <p className="font-display text-sm tracking-wide text-ink-soft uppercase">
          Michi Method
        </p>
        <h1 className="font-display text-5xl text-ink">Michi Binder Studio</h1>
        <p className="mt-3 max-w-prose text-lg leading-relaxed text-ink-soft">
          A cozy desk for designing binder spreads before you sleeve a single card. Flip
          through paper pages, merge pockets, and print art that actually fits.
        </p>
      </section>
      <LandingDesk />
      <section className="mx-auto max-w-2xl px-8 pb-16">
        <p className="text-ink-faint">
          Prefer a blank page? The{' '}
          <Link href="/playground" className="text-accent underline decoration-accent-soft underline-offset-4">
            playground
          </Link>{' '}
          holds one scrap on this device. Tokens live under{' '}
          <Link href="/dev" className="text-accent underline decoration-accent-soft underline-offset-4">
            /dev
          </Link>
          .
        </p>
        <SignInPanel />
      </section>
    </main>
  );
}
