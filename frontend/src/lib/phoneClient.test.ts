import { describe, it, expect } from 'vitest';
import { looksLikePhone, phoneMessage } from './phoneClient';

describe('recipient field: phone or address', () => {
  it('recognizes phone numbers the server accepts', () => {
    for (const s of ['09171234567', '0917 123 4567', '+63 917 123 4567', '9171234567', '639171234567', '+14155550123']) {
      expect(looksLikePhone(s)).toBe(true);
    }
  });
  it('leaves Stellar addresses and junk alone', () => {
    for (const s of ['GCO474RPUM4AOF5T4JA55YIFJKP5B3743F6AXD5M65WBB4SNLFTL43PS', '', '123', 'hello', '0917']) {
      expect(looksLikePhone(s)).toBe(false);
    }
  });
  it('has a plain message for every server outcome', () => {
    for (const c of ['session', 'rate_limited', 'invalid_phone', 'wrong_code', 'no_code', 'number_in_use', 'sms_unavailable', 'weird']) {
      expect(phoneMessage(c)).not.toMatch(/_/);
    }
  });
});
