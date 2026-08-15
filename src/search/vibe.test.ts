import { describe, expect, it } from 'vitest';
import { cardHueScore, hexToHue, hueDistance } from './vibe';

describe('vibe hue ranking', () => {
  it('places a pink hex near 330° and far from yellow', () => {
    const pink = hexToHue('#e89bb8');
    expect(hueDistance(pink, 330)).toBeLessThan(40);
    expect(cardHueScore([{ hex: '#e89bb8', weight: 0.7 }], 330)!).toBeLessThan(
      cardHueScore([{ hex: '#f4d03f', weight: 0.7 }], 330)!,
    );
  });
});
