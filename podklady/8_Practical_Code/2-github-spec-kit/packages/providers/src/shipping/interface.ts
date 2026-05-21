import type { AddressInput } from '@imagineer/shared';

export interface ShippingRate {
  carrier: string;
  serviceLevel: string;
  amountCents: number;
  estimatedDays: number;
}

export interface ShippingLabel {
  carrier: string;
  serviceLevel: string;
  trackingNumber: string;
  trackingUrl: string;
  labelUrl: string;
}

export interface ShippingProvider {
  quoteRates(args: { to: AddressInput; weightGrams: number }): Promise<ShippingRate[]>;
  createLabel(args: { to: AddressInput; from: AddressInput; weightGrams: number; serviceLevel: string }): Promise<ShippingLabel>;
  verifyWebhook(rawBody: string, signature: string): { type: string; data: Record<string, unknown> };
}
