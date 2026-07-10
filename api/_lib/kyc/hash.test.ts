import { describe, it, expect, beforeAll } from 'vitest';
import { hmacHex, maskName } from './hash';

beforeAll(() => {
  process.env.KYC_HASH_SECRET = 'test-hash-secret';
});

describe('hmacHex', () => {
  it('is deterministic and lowercase hex', () => {
    const a = hmacHex('ABC123');
    expect(hmacHex('ABC123')).toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('normalizes case and whitespace', () => {
    expect(hmacHex('abc 123')).toBe(hmacHex('  ABC   123 '));
  });

  it('differs for different input', () => {
    expect(hmacHex('A')).not.toBe(hmacHex('B'));
  });
});

describe('maskName', () => {
  it('masks each part to initial + **', () => {
    expect(maskName('Juan Dela Cruz')).toBe('J** D** C**');
    expect(maskName('  maria  santos ')).toBe('M** S**');
  });
});
