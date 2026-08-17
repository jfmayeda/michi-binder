import Link from 'next/link';

export default function DevIndexPage() {
  return (
    <main className="mx-auto max-w-xl px-8 py-16">
      <p className="font-display text-sm tracking-wide text-ink-soft uppercase">Dev only</p>
      <h1 className="mt-2 font-display text-4xl text-ink">Dev playground</h1>
      <p className="mt-3 text-ink-soft">This route 404s in production builds.</p>
      <ul className="mt-8 flex flex-col gap-3">
        <li>
          <Link
            href="/dev/styleguide"
            className="block rounded-lg bg-paper-sun px-4 py-3 shadow-soft text-ink hover:bg-accent-soft"
          >
            Styleguide — tokens, type, motion
          </Link>
        </li>
        <li>
          <Link
            href="/dev/flip"
            className="block rounded-lg bg-paper-sun px-4 py-3 shadow-soft text-ink hover:bg-accent-soft"
          >
            Page flip — CSS 3D prototype
          </Link>
        </li>
        <li>
          <Link
            href="/dev/flip?lowperf=1"
            className="block rounded-lg bg-paper-sun px-4 py-3 shadow-soft text-ink hover:bg-accent-soft"
          >
            Page flip — force 2D fallback
          </Link>
        </li>
        <li>
          <Link
            href="/dev/search"
            className="block rounded-lg bg-paper-sun px-4 py-3 shadow-soft text-ink hover:bg-accent-soft"
          >
            Search panel
          </Link>
        </li>
        <li>
          <Link
            href="/dev/color-check"
            className="block rounded-lg bg-paper-sun px-4 py-3 shadow-soft text-ink hover:bg-accent-soft"
          >
            Color check — base1 clusters
          </Link>
        </li>
      </ul>
    </main>
  );
}
