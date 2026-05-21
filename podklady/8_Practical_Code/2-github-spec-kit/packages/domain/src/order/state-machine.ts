import { type Result, err, ok } from '../result.ts';

export type OrderStatus =
  | 'draft'
  | 'awaiting_payment'
  | 'paid'
  | 'in_production'
  | 'reprint'
  | 'shipped'
  | 'delivered'
  | 'reprint_requested'
  | 'cancelled';

export type OrderEvent =
  | { type: 'checkout_started' }
  | { type: 'payment_succeeded' }
  | { type: 'payment_failed' }
  | { type: 'checkout_expired' }
  | { type: 'production_started' }
  | { type: 'print_failed' }
  | { type: 'reprint_scheduled' }
  | { type: 'shipped' }
  | { type: 'delivered' }
  | { type: 'reprint_requested' }
  | { type: 'reprint_approved' };

export class IllegalTransition extends Error {
  constructor(public from: OrderStatus, public event: OrderEvent['type']) {
    super(`illegal transition: ${from} --${event}-->`);
  }
}

const TABLE: Record<OrderStatus, Partial<Record<OrderEvent['type'], OrderStatus>>> = {
  draft: { checkout_started: 'awaiting_payment' },
  awaiting_payment: {
    payment_succeeded: 'paid',
    payment_failed: 'awaiting_payment',
    checkout_expired: 'cancelled',
  },
  paid: { production_started: 'in_production' },
  in_production: {
    print_failed: 'reprint',
    shipped: 'shipped',
  },
  reprint: { reprint_scheduled: 'in_production' },
  shipped: { delivered: 'delivered' },
  delivered: { reprint_requested: 'reprint_requested' },
  reprint_requested: { reprint_approved: 'in_production' },
  cancelled: {},
};

export function transition(
  from: OrderStatus,
  event: OrderEvent,
): Result<OrderStatus, IllegalTransition> {
  const next = TABLE[from][event.type];
  if (!next) return err(new IllegalTransition(from, event.type));
  return ok(next);
}

export function isTerminal(status: OrderStatus): boolean {
  return status === 'delivered' || status === 'cancelled';
}
