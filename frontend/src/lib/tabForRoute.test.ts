import { describe, it, expect } from 'vitest';
import { tabForRoute } from './tabForRoute';

describe('tabForRoute', () => {
  it('maps home cluster to home', () => {
    expect(tabForRoute('home')).toBe('home');
    expect(tabForRoute('receive')).toBe('home');
    expect(tabForRoute('send')).toBe('home');
  });
  it('maps the escrow cluster to the Pacts (dashboard) tab', () => {
    expect(tabForRoute('dashboard')).toBe('dashboard');
    expect(tabForRoute('create')).toBe('dashboard');
    expect(tabForRoute('detail')).toBe('dashboard');
    expect(tabForRoute('trader')).toBe('dashboard');
  });
  it('maps verify to profile and convert/activity to themselves', () => {
    expect(tabForRoute('verify')).toBe('profile');
    expect(tabForRoute('profile')).toBe('profile');
    expect(tabForRoute('convert')).toBe('convert');
    expect(tabForRoute('activity')).toBe('activity');
  });
  it('returns null for landing', () => {
    expect(tabForRoute('landing')).toBeNull();
  });
});
