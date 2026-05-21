import { describe, expect, it } from 'vitest';
import { transition, isTerminal, type OrderStatus } from './state-machine.ts';

describe('order state machine', () => {
  it('happy path: draft → delivered', () => {
    const path: { from: OrderStatus; event: Parameters<typeof transition>[1]; to: OrderStatus }[] = [
      { from: 'draft', event: { type: 'checkout_started' }, to: 'awaiting_payment' },
      { from: 'awaiting_payment', event: { type: 'payment_succeeded' }, to: 'paid' },
      { from: 'paid', event: { type: 'production_started' }, to: 'in_production' },
      { from: 'in_production', event: { type: 'shipped' }, to: 'shipped' },
      { from: 'shipped', event: { type: 'delivered' }, to: 'delivered' },
    ];
    for (const step of path) {
      const r = transition(step.from, step.event);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(step.to);
    }
  });

  it('reprint loop: in_production → reprint → in_production', () => {
    const r1 = transition('in_production', { type: 'print_failed' });
    expect(r1.ok && r1.value).toBe('reprint');
    const r2 = transition('reprint', { type: 'reprint_scheduled' });
    expect(r2.ok && r2.value).toBe('in_production');
  });

  it('checkout abandoned: awaiting_payment → cancelled', () => {
    const r = transition('awaiting_payment', { type: 'checkout_expired' });
    expect(r.ok && r.value).toBe('cancelled');
  });

  it('rejects illegal transition: paid → delivered (must ship first)', () => {
    const r = transition('paid', { type: 'delivered' });
    expect(r.ok).toBe(false);
  });

  it('rejects every event from terminal cancelled', () => {
    const events: Parameters<typeof transition>[1][] = [
      { type: 'checkout_started' },
      { type: 'payment_succeeded' },
      { type: 'shipped' },
      { type: 'delivered' },
    ];
    for (const e of events) {
      const r = transition('cancelled', e);
      expect(r.ok).toBe(false);
    }
  });

  it('isTerminal flags delivered and cancelled', () => {
    expect(isTerminal('delivered')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('paid')).toBe(false);
  });

  it('customer-initiated reprint: delivered → reprint_requested → in_production', () => {
    const r1 = transition('delivered', { type: 'reprint_requested' });
    expect(r1.ok && r1.value).toBe('reprint_requested');
    const r2 = transition('reprint_requested', { type: 'reprint_approved' });
    expect(r2.ok && r2.value).toBe('in_production');
  });
});
