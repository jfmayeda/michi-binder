import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-8 py-16">
      <p className="font-display text-sm tracking-wide text-ink-soft uppercase">
        Michi Method
      </p>
      <h1 className="font-display text-5xl text-ink">Michi Binder Studio</h1>
      <p className="max-w-prose text-lg leading-relaxed text-ink-soft">
        A cozy desk for designing binder spreads before you sleeve a single card. Flip
        through paper pages, merge pockets, and print art that actually fits.
      </p>
      <p className="text-ink-faint">
        In development, the{' '}
        <Link href="/shelf" className="text-accent underline decoration-accent-soft underline-offset-4">
          shelf
        </Link>{' '}
        lists binders. Tokens and the page-flip prototype live under{' '}
        <Link href="/dev" className="text-accent underline decoration-accent-soft underline-offset-4">
          /dev
        </Link>
        .
      </p>
    </main>
  );
}
