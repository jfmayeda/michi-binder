import Link from 'next/link';
import { Panel } from '@/components/ui/Panel';

const LINKS = [
  ['/dev/styleguide', 'Style guide', 'Tokens, components and every state they have'],
  ['/dev/flip', 'Page turn', 'The binder viewer, 3D turn and 2D fallback'],
  ['/dev/flip?lowperf=1', 'Page turn, forced 2D', 'What a low-powered device gets'],
  ['/dev/search', 'Card box', 'Search panel on its own'],
  ['/dev/color-check', 'Colour extraction', 'Clusters pulled from Base Set art'],
];

export default function DevIndexPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <p className="gb-label">Development only · 404s in production</p>
      <h1 className="mt-1 text-3xl">Workbench</h1>
      <ul className="mt-6 grid gap-2">
        {LINKS.map(([href, title, note]) => (
          <li key={href}>
            <Link href={href} className="block">
              <Panel title={title}>
                <p className="text-sm text-ink-soft">{note}</p>
              </Panel>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
