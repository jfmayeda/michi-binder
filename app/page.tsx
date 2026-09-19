import Link from 'next/link';
import { LandingDesk } from '@/components/landing/LandingDesk';
import { SignInPanel } from '@/components/auth/SignInPanel';
import { Panel } from '@/components/ui/Panel';

const STEPS = [
  {
    index: '01',
    title: 'Compose the spread',
    body: 'Both pages at once, because that is how a binder is actually looked at. Search a card, click a pocket, and it is in.',
  },
  {
    index: '02',
    title: 'Join pockets for art',
    body: 'Select a block of pockets and make them one. The app tells you whether it goes in as a single piece or has to be cut at a sealed seam.',
  },
  {
    index: '03',
    title: 'Print it to fit',
    body: 'Every pocket is 7 × 9.5 cm, so a 2 × 2 piece exports at exactly 14 × 19 cm at 300 DPI, with crop marks and optional bleed.',
  },
];

export default function Home() {
  return (
    <main className="min-h-dvh">
      <header className="mx-auto max-w-3xl px-4 pt-10 pb-6 text-center sm:px-6">
        <p className="gb-label">Michi Binder Studio</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Design the spread before you sleeve it</h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-soft">
          A binder page only shows you what it is once it is built. This is where you build it
          first — facing pages, merged pockets, and art that prints at the size your pockets
          actually are.
        </p>
      </header>

      <section aria-label="Starter binder" className="px-4 pb-10 sm:px-6">
        <LandingDesk />
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
        <div className="grid gap-3 md:grid-cols-3">
          {STEPS.map((step) => (
            <Panel key={step.index} title={`${step.index} · ${step.title}`} stepped>
              <p className="text-sm text-ink-soft">{step.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <SignInPanel />
        <p className="mt-4 text-center text-mini text-ink-faint">
          Pre-release. Card images come from the public TCG dataset and stay inside the app —
          exports are for art you add yourself.{' '}
          <Link href="/dev" className="underline underline-offset-2">
            Design system
          </Link>
        </p>
      </footer>
    </main>
  );
}
