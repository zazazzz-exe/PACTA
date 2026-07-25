import { describe, it, expect } from 'vitest';
import { messageForEvent } from './notify';

describe('messageForEvent', () => {
  it('describes an inbound payment as success', () => {
    expect(messageForEvent({ kind: 'received', assetCode: 'XLM', amount: '5' })).toEqual({
      tone: 'success',
      message: 'Received 5 XLM',
    });
  });
  it('describes each Pact transition', () => {
    expect(messageForEvent({ kind: 'pact-bond' }).message).toBe('Security bond posted');
    expect(messageForEvent({ kind: 'pact-deposit' }).message).toBe('Capital deposited');
    expect(messageForEvent({ kind: 'pact-release' }).message).toBe('Milestone released');
    expect(messageForEvent({ kind: 'pact-complete' }).tone).toBe('success');
    expect(messageForEvent({ kind: 'pact-refund' }).message).toBe('Pact refunded');
  });
  it('warns on an approaching deadline', () => {
    expect(messageForEvent({ kind: 'deadline-near' })).toEqual({
      tone: 'warn',
      message: 'A Pact deadline is approaching',
    });
  });
});
