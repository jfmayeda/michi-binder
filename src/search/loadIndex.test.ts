import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureCatalog, isCardIndexUrl, resetSearchLoaderForTests } from './loadIndex';

afterEach(() => {
  resetSearchLoaderForTests();
});

describe('AT-9 lazy index loader', () => {
  it('does not fetch until ensureCatalog is called', () => {
    const urls: string[] = [];
    const fetcher: typeof fetch = async (input) => {
      urls.push(String(input));
      throw new Error('should not fetch yet');
    };
    void fetcher;
    expect(urls.filter((u) => isCardIndexUrl(u))).toEqual([]);
  });

  it('fetches cards-index.json on first search interaction (ensureCatalog)', async () => {
    const urls: string[] = [];
    const dataDir = join(process.cwd(), 'public', 'data');
    const files: Record<string, string> = {
      '/data/cards-index.json': readFileSync(join(dataDir, 'cards-index.json'), 'utf8'),
      '/data/sets.json': readFileSync(join(dataDir, 'sets.json'), 'utf8'),
      '/data/dex-species.json': readFileSync(join(dataDir, 'dex-species.json'), 'utf8'),
      '/data/image-exceptions.json': readFileSync(join(dataDir, 'image-exceptions.json'), 'utf8'),
    };
    const fetcher: typeof fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      const body = files[url];
      if (!body) return new Response('missing', { status: 404 });
      return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const catalog = await ensureCatalog(fetcher);
    expect(urls.some((u) => isCardIndexUrl(u))).toBe(true);
    expect(catalog.index.id.length).toBeGreaterThan(1000);
    await ensureCatalog(fetcher);
    expect(urls.filter((u) => isCardIndexUrl(u))).toHaveLength(1);
  });

  it('landing page source never references the card index', () => {
    const landing = readFileSync(join(process.cwd(), 'app/page.tsx'), 'utf8');
    expect(landing.includes('cards-index')).toBe(false);
    expect(landing.includes('@/search')).toBe(false);
  });
});

describe('markBinderInteractive', () => {
  it('is never called from the landing page, only from the editor', () => {
    const landing = readFileSync(join(process.cwd(), 'app/page.tsx'), 'utf8');
    expect(landing.includes('markBinderInteractive')).toBe(false);
    const studio = readFileSync(join(process.cwd(), 'src/components/editor/Studio.tsx'), 'utf8');
    expect(studio.includes('markBinderInteractive')).toBe(true);
  });
});
