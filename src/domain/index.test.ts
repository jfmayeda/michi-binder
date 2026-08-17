import { describe, expect, it } from 'vitest';
import { slotCount } from './sample';

describe('domain sample', () => {
  it('counts slots on a 3x3 page', () => {
    expect(slotCount(3, 3)).toBe(9);
  });
});
