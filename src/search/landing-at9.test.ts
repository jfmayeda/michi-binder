import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('AT-9 landing must not load the card catalog', () => {
  it('app/page.tsx does not import search or cards-index', () => {
    const src = readFileSync('app/page.tsx', 'utf8');
    expect(src).not.toMatch(/@\/search/);
    expect(src).not.toMatch(/cards-index/);
  });
});
