export interface CheckoutSessionRequest {
  orderId: string;
  customerEmail: string;
  amountCents: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentProvider {
  createCheckoutSession(req: CheckoutSessionRequest): Promise<{ url: string; expiresAt: Date }>;
  verifyWebhook(rawBody: string, signature: string): { type: string; data: Record<string, unknown>; eventId: string };
}
