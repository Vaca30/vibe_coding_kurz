import { describe, expect, it } from 'vitest';
import { calculatePricing } from './calculate.ts';

describe('calculatePricing', () => {
  it('computes a small PLA cube total', () => {
    // 50mm cube = 125,000 mm³, PLA $0.00018/mm³, overhead 2.4 → $54
    const r = calculatePricing({
      volumeMm3: 125_000,
      costPerMm3Usd: 0.00018,
      shippingCents: 599,
      taxRate: 0.0875,
    });
    expect(r.subtotalCents).toBe(5400);
    expect(r.shippingCents).toBe(599);
    expect(r.taxCents).toBe(525); // (5400 + 599) * 0.0875 ≈ 524.91 → 525
    expect(r.totalCents).toBe(5400 + 599 + 525);
  });

  it('zero volume → zero subtotal but still adds shipping + tax', () => {
    const r = calculatePricing({
      volumeMm3: 0,
      costPerMm3Usd: 0.00018,
      shippingCents: 599,
      taxRate: 0.0875,
    });
    expect(r.subtotalCents).toBe(0);
    expect(r.taxCents).toBe(52);
    expect(r.totalCents).toBe(651);
  });

  it('rejects negative inputs', () => {
    expect(() =>
      calculatePricing({ volumeMm3: -1, costPerMm3Usd: 0.0001, shippingCents: 0, taxRate: 0 }),
    ).toThrow();
    expect(() =>
      calculatePricing({ volumeMm3: 0, costPerMm3Usd: -1, shippingCents: 0, taxRate: 0 }),
    ).toThrow();
    expect(() =>
      calculatePricing({ volumeMm3: 0, costPerMm3Usd: 0, shippingCents: -1, taxRate: 0 }),
    ).toThrow();
  });

  it('rejects out-of-range tax rate', () => {
    expect(() =>
      calculatePricing({ volumeMm3: 0, costPerMm3Usd: 0, shippingCents: 0, taxRate: -0.01 }),
    ).toThrow();
    expect(() =>
      calculatePricing({ volumeMm3: 0, costPerMm3Usd: 0, shippingCents: 0, taxRate: 1.01 }),
    ).toThrow();
  });

  it('subtotal rounds up so we never undercharge', () => {
    // 0.001 USD = 0.1¢ — must round up to 1¢
    const r = calculatePricing({
      volumeMm3: 1,
      costPerMm3Usd: 0.001 / 2.4,
      shippingCents: 0,
      taxRate: 0,
    });
    expect(r.subtotalCents).toBe(1);
  });
});
