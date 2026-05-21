import { env } from '@imagineer/config';
import Stripe from 'stripe';
import type { PaymentProvider } from './interface.ts';

let client: Stripe | undefined;
function getClient(): Stripe {
  if (!client) client = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
  return client;
}

export const stripePayments: PaymentProvider = {
  async createCheckoutSession(req) {
    const session = await getClient().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: req.currency.toLowerCase(),
            unit_amount: req.amountCents,
            product_data: { name: req.description, metadata: { order_id: req.orderId } },
          },
        },
      ],
      customer_email: req.customerEmail,
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      client_reference_id: req.orderId,
      payment_intent_data: { metadata: { order_id: req.orderId } },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
    if (!session.url) throw new Error('Stripe returned no checkout URL');
    return { url: session.url, expiresAt: new Date(session.expires_at * 1000) };
  },
  verifyWebhook(rawBody, signature) {
    const event = getClient().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    return { type: event.type, data: event.data as unknown as Record<string, unknown>, eventId: event.id };
  },
};
