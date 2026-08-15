import { describe, expect, it } from 'vitest';
import { shouldDegradeFromProbe } from './renderMode';

describe('render-mode probe threshold', () => {
  it('keeps 3D when frames are healthy', () => {
    expect(shouldDegradeFromProbe(16.6, 1, 40)).toBe(false);
  });

  it('degrades when average frame time is high', () => {
    expect(shouldDegradeFromProbe(30, 5, 40)).toBe(true);
  });

  it('degrades when too many long frames', () => {
    expect(shouldDegradeFromProbe(18, 12, 40)).toBe(true);
  });
});
