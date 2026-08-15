import { describe, expect, it } from 'vitest';
import { SHARE_HEIGHT, SHARE_WIDTH } from './shareImage';

describe('share-as-image', () => {
  it('targets a 1080 × 1350 portrait', () => {
    expect(SHARE_WIDTH).toBe(1080);
    expect(SHARE_HEIGHT).toBe(1350);
  });
});
