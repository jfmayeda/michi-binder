import { describe, expect, it } from 'vitest';
import { buffersEqual, sha256Hex } from './checksum';

describe('media checksum', () => {
  it('hashes identical bytes the same way', async () => {
    const a = new Uint8Array([10, 20, 30, 40]).buffer;
    const b = new Uint8Array([10, 20, 30, 40]).buffer;
    expect(await sha256Hex(a)).toBe(await sha256Hex(b));
    expect(buffersEqual(a, b)).toBe(true);
  });
});
