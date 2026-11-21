import { describe, it, expect, vi } from 'vitest';
import { normalizePhone, phoneHash, codeHash, maskPhone } from './number';
import { smsSender, httpSender } from './sms';

describe('phone numbers', () => {
  it('normalizes Philippine local forms and E.164', () => {
    for (const s of ['09171234567', '0917 123 4567', '(0917) 123-4567', '9171234567', '639171234567', '+63 917 123 4567']) {
      expect(normalizePhone(s)).toBe('+639171234567');
    }
    expect(normalizePhone('+14155550123')).toBe('+14155550123');
  });
  it('refuses junk, landlines and impossible numbers', () => {
    for (const s of ['', 'abc', '12345', '+0123456789', '028123456', '+6321234567', '0917123456', 5, null, '9'.repeat(40)]) {
      expect(normalizePhone(s)).toBeNull();
    }
  });
  it('hashes with the server pepper only, separating numbers from codes', () => {
    process.env.PHONE_PEPPER = 'p'.repeat(40);
    const h = phoneHash('+639171234567');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain('9171234567');
    expect(phoneHash('+639171234567')).toBe(h);
    expect(codeHash(1, '123456')).not.toBe(codeHash(2, '123456'));
    process.env.PHONE_PEPPER = 'q'.repeat(40);
    expect(phoneHash('+639171234567')).not.toBe(h); // pepper changes every hash
    process.env.PHONE_PEPPER = 'short';
    expect(() => phoneHash('+639171234567')).toThrow('phone_pepper_not_configured');
    delete process.env.PHONE_PEPPER;
    expect(() => phoneHash('+639171234567')).toThrow('phone_pepper_not_configured');
  });
  it('masks for log lines', () => {
    expect(maskPhone('+639171234567')).toBe('+63 ••• ••• 4567');
  });
});

describe('SMS sender', () => {
  it('uses the console sender in development and refuses it in production', () => {
    expect(smsSender({})?.id).toBe('console');
    expect(smsSender({ SMS_PROVIDER: 'console' })?.id).toBe('console');
    expect(smsSender({ VERCEL_ENV: 'production' })).toBeNull();
    expect(smsSender({ VERCEL_ENV: 'production', SMS_PROVIDER: 'console' })).toBeNull();
    expect(smsSender({ VERCEL_ENV: 'preview', NODE_ENV: 'production' })?.id).toBe('console');
  });
  it('uses an HTTP gateway (telco or GSM modem) when configured', async () => {
    expect(smsSender({ SMS_PROVIDER: 'http' })).toBeNull(); // missing URL / token
    expect(smsSender({ VERCEL_ENV: 'production', SMS_PROVIDER: 'http', SMS_GATEWAY_URL: 'https://sms.example/send', SMS_GATEWAY_TOKEN: 't' })?.id).toBe('http');
    const f = vi.fn(async () => new Response('{}', { status: 200 }));
    await httpSender('https://sms.example/send', 'tok', f as unknown as typeof fetch).send('+639171234567', 'hi');
    expect(f).toHaveBeenCalledOnce();
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ to: '+639171234567', text: 'hi' });
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok');
    const bad = vi.fn(async () => new Response('', { status: 500 }));
    await expect(httpSender('u', 't', bad as unknown as typeof fetch).send('+639171234567', 'x')).rejects.toThrow('sms_gateway_500');
  });
});
