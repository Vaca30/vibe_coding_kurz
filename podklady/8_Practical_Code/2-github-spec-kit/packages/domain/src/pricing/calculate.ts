// Pricing function for a single Order (per data-model.md Pricing Function).
// Inputs are domain primitives, not DB rows — that keeps this file pure and
// trivially testable without a database.

const OVERHEAD_MULTIPLIER = 2.4;

export interface PricingInputs {
  volumeMm3: number;
  costPerMm3Usd: number;
  shippingCents: number;
  taxRate: number; // e.g. 0.0875 for 8.75% — caller supplies (Stripe Tax in prod)
}

export interface PricingBreakdown {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

export function calculatePricing(input: PricingInputs): PricingBreakdown {
  if (input.volumeMm3 < 0) throw new Error('volume must be non-negative');
  if (input.costPerMm3Usd < 0) throw new Error('cost rate must be non-negative');
  if (input.shippingCents < 0) throw new Error('shipping must be non-negative');
  if (input.taxRate < 0 || input.taxRate > 1) throw new Error('taxRate must be in [0, 1]');

  const subtotalUsd = input.volumeMm3 * input.costPerMm3Usd * OVERHEAD_MULTIPLIER;
  const subtotalCents = Math.ceil(subtotalUsd * 100);
  const taxableCents = subtotalCents + input.shippingCents;
  const taxCents = Math.round(taxableCents * input.taxRate);
  return {
    subtotalCents,
    shippingCents: input.shippingCents,
    taxCents,
    totalCents: subtotalCents + input.shippingCents + taxCents,
  };
}
