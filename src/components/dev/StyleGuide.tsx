'use client';

const COLORS: { token: string; hex: string; className: string }[] = [
  { token: 'paper', hex: '#F6EBD9', className: 'bg-paper' },
  { token: 'paper-sun', hex: '#FBF4E8', className: 'bg-paper-sun' },
  { token: 'paper-shade', hex: '#E8D4B8', className: 'bg-paper-shade' },
  { token: 'paper-deep', hex: '#D4BC96', className: 'bg-paper-deep' },
  { token: 'ink', hex: '#3A2A1C', className: 'bg-ink' },
  { token: 'ink-soft', hex: '#6B5344', className: 'bg-ink-soft' },
  { token: 'ink-faint', hex: '#A08A76', className: 'bg-ink-faint' },
  { token: 'rule', hex: '#D4C0A1', className: 'bg-rule' },
  { token: 'accent', hex: '#C45C3E', className: 'bg-accent' },
  { token: 'accent-hover', hex: '#A84C32', className: 'bg-accent-hover' },
  { token: 'accent-soft', hex: '#F0D2C8', className: 'bg-accent-soft' },
  { token: 'accent-ink', hex: '#7A3220', className: 'bg-accent-ink' },
];

const RADII = [
  { token: 'radius-sm', className: 'rounded-sm' },
  { token: 'radius-md', className: 'rounded-md' },
  { token: 'radius-lg', className: 'rounded-lg' },
  { token: 'radius-xl', className: 'rounded-xl' },
];

const SHADOWS = [
  { token: 'shadow-soft', className: 'shadow-soft' },
  { token: 'shadow-page', className: 'shadow-page' },
  { token: 'shadow-lift', className: 'shadow-lift' },
  { token: 'shadow-stamp', className: 'shadow-stamp' },
];

const MOTION: { token: string; duration: string; ease: string; label: string }[] = [
  { token: 'duration-quick + ease-paper', duration: 'var(--duration-quick)', ease: 'var(--ease-paper)', label: 'Quick settle' },
  { token: 'duration-soft + ease-paper-in', duration: 'var(--duration-soft)', ease: 'var(--ease-paper-in)', label: 'Soft in' },
  { token: 'duration-flip + ease-paper-flip', duration: 'var(--duration-flip)', ease: 'var(--ease-paper-flip)', label: 'Page flip' },
  { token: 'duration-linger + ease-paper-out', duration: 'var(--duration-linger)', ease: 'var(--ease-paper-out)', label: 'Linger out' },
];

function Swatch({ token, hex, className }: { token: string; hex: string; className: string }) {
  const inkOnDark = token.startsWith('ink') || token === 'accent' || token === 'accent-hover' || token === 'accent-ink';
  return (
    <figure className="flex flex-col gap-2">
      <div
        className={`${className} flex h-24 items-end rounded-md border border-rule px-3 py-2 shadow-soft`}
      >
        <span className={`font-display text-xs ${inkOnDark ? 'text-paper-sun' : 'text-ink'}`}>
          {hex}
        </span>
      </div>
      <figcaption className="font-body text-sm text-ink-soft">{token}</figcaption>
    </figure>
  );
}

function MotionDemo({
  token,
  duration,
  ease,
  label,
}: {
  token: string;
  duration: string;
  ease: string;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-rule bg-paper-sun p-4 shadow-soft">
      <p className="font-display text-ink">{label}</p>
      <p className="mt-1 text-xs text-ink-faint">{token}</p>
      <button
        type="button"
        className="mt-4 w-full rounded-md bg-paper-shade px-3 py-2 text-left text-sm text-ink shadow-stamp"
        onClick={(event) => {
          const mark = event.currentTarget.querySelector('[data-mark]') as HTMLElement | null;
          if (!mark) return;
          mark.style.transition = 'none';
          mark.style.transform = 'translateX(0)';
          void mark.offsetWidth;
          mark.style.transition = `transform ${duration} ${ease}`;
          mark.style.transform = 'translateX(calc(100% - 1.5rem))';
        }}
      >
        Tap to slide
        <span
          data-mark
          className="mt-3 block h-3 w-6 rounded-sm bg-accent"
          style={{ transform: 'translateX(0)' }}
        />
      </button>
    </div>
  );
}

export function StyleGuide() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
      <header className="mb-12 border-b border-rule pb-8">
        <p className="font-display text-sm tracking-[0.2em] text-accent uppercase">
          Design language
        </p>
        <h1 className="mt-2 font-display text-5xl text-ink">Styleguide</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Scrapbook-meets-Game-Freak: warm paper, one clay accent, type that feels printed,
          motion that settles like a page. Swap a token here and the whole studio follows.
        </p>
      </header>

      <section className="mb-14">
        <h2 className="mb-6 font-display text-3xl text-ink">Color</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {COLORS.map((c) => (
            <Swatch key={c.token} {...c} />
          ))}
        </div>
      </section>

      <section className="mb-14">
        <h2 className="mb-6 font-display text-3xl text-ink">Type</h2>
        <div className="grid gap-8 md:grid-cols-2">
          <article className="rounded-lg border border-rule bg-paper-sun p-6 shadow-page">
            <p className="text-xs tracking-widest text-ink-faint uppercase">Display — Fraunces</p>
            <p className="font-display mt-3 text-4xl leading-tight text-ink">
              Pocket pages, printed art, a little nostalgia.
            </p>
            <p className="font-display mt-4 text-xl text-ink-soft">Aa Bb Cc 0123456789</p>
          </article>
          <article className="rounded-lg border border-rule bg-paper-sun p-6 shadow-page">
            <p className="text-xs tracking-widest text-ink-faint uppercase">Body — Nunito</p>
            <p className="mt-3 text-base leading-relaxed text-ink">
              Kelly flips through a starter binder that feels like the real thing — paper
              weight, page-flip, soft shelf light. She searches &ldquo;Eeveelutions + pink&rdquo;
              and drags cards into a facing spread.
            </p>
            <p className="mt-4 text-sm text-ink-soft">
              Regular · <span className="font-semibold">Semibold</span> ·{' '}
              <span className="italic">Italic for asides</span>
            </p>
          </article>
        </div>
      </section>

      <section className="mb-14">
        <h2 className="mb-6 font-display text-3xl text-ink">Texture</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <figure className="overflow-hidden rounded-lg border border-rule shadow-soft">
            <div className="h-40 bg-paper texture-paper" />
            <figcaption className="bg-paper-sun px-4 py-3 text-sm text-ink-soft">
              paper-grain — faint fiber, used on the studio ground
            </figcaption>
          </figure>
          <figure className="overflow-hidden rounded-lg border border-rule shadow-soft">
            <div className="h-40 bg-paper-shade texture-linen" />
            <figcaption className="bg-paper-sun px-4 py-3 text-sm text-ink-soft">
              linen — weave for covers, shelf, and binder cloth
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="mb-14">
        <h2 className="mb-6 font-display text-3xl text-ink">Radius</h2>
        <div className="flex flex-wrap gap-6">
          {RADII.map((r) => (
            <figure key={r.token} className="flex flex-col items-center gap-2">
              <div className={`h-20 w-20 bg-accent-soft ${r.className} shadow-stamp`} />
              <figcaption className="text-xs text-ink-soft">{r.token}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mb-14">
        <h2 className="mb-6 font-display text-3xl text-ink">Shadow</h2>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {SHADOWS.map((s) => (
            <figure key={s.token} className="flex flex-col items-center gap-3">
              <div className={`h-24 w-full rounded-md bg-paper-sun ${s.className}`} />
              <figcaption className="text-xs text-ink-soft">{s.token}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mb-14">
        <h2 className="mb-6 font-display text-3xl text-ink">Spacing</h2>
        <div className="flex items-end gap-4">
          {[
            { token: 'slot', className: 'w-(--spacing-slot) h-(--spacing-slot)' },
            { token: 'spread', className: 'w-(--spacing-spread) h-8' },
            { token: 'page', className: 'w-(--spacing-page) h-12' },
          ].map((s) => (
            <figure key={s.token} className="flex flex-col items-start gap-2">
              <div className={`${s.className} min-w-4 rounded-sm bg-accent`} />
              <figcaption className="text-xs text-ink-soft">spacing-{s.token}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-faint">
          Also the default Tailwind spacing scale (4px grid) — used for layout, never for color.
        </p>
      </section>

      <section>
        <h2 className="mb-6 font-display text-3xl text-ink">Motion</h2>
        <p className="mb-6 max-w-2xl text-ink-soft">
          Curves modeled on paper: a little resistance at the start of a flip, a soft settle at
          the end. No snappy corporate eases.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {MOTION.map((m) => (
            <MotionDemo key={m.token} {...m} />
          ))}
        </div>
      </section>
    </main>
  );
}
