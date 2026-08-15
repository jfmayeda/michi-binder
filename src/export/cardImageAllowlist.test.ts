import { describe, expect, it } from 'vitest';
import { GET } from '../../app/api/card-image/route';
import { allowedCardImageSrc } from './cardImageAllowlist';

describe('card image proxy allowlist', () => {
  it('allows only images.pokemontcg.io over https', () => {
    expect(allowedCardImageSrc('https://images.pokemontcg.io/base1/58.png')).toBe(true);
    expect(allowedCardImageSrc('http://images.pokemontcg.io/base1/58.png')).toBe(false);
    expect(allowedCardImageSrc('https://evil.example/base1/58.png')).toBe(false);
    expect(allowedCardImageSrc('https://images.pokemontcg.io.evil.example/x.png')).toBe(false);
    expect(allowedCardImageSrc('not-a-url')).toBe(false);
  });

  it('GET rejects non-allowlisted hosts with 400', async () => {
    const res = await GET(
      new Request('http://localhost/api/card-image?src=https://example.com/secret.png'),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('forbidden-host');
  });
});
