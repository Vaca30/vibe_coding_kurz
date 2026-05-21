import { createHmac } from 'node:crypto';
import { env } from '@imagineer/config';
import type { ShippingProvider } from './interface.ts';

// Minimal Shippo wrapper. The official SDK's surface area is large; for the
// MVP we only need rate quoting + label creation + webhook signature, so we
// hit the REST API directly and keep this file small.

const BASE = 'https://api.goshippo.com';

function authHeaders(): Record<string, string> {
  return {
    authorization: `ShippoToken ${env.SHIPPO_API_KEY}`,
    'content-type': 'application/json',
  };
}

export const shippoShipping: ShippingProvider = {
  async quoteRates({ to, weightGrams }) {
    const body = {
      address_to: {
        name: to.recipientName,
        street1: to.street1,
        street2: to.street2 ?? '',
        city: to.city,
        state: to.state,
        zip: to.postalCode,
        country: 'US',
      },
      address_from: {
        name: 'Imagineer',
        street1: '1 Print Way',
        city: 'Brooklyn',
        state: 'NY',
        zip: '11201',
        country: 'US',
      },
      parcels: [
        {
          length: '15',
          width: '15',
          height: '15',
          distance_unit: 'cm',
          weight: (weightGrams / 1000).toFixed(2),
          mass_unit: 'kg',
        },
      ],
      async: false,
    };
    const r = await fetch(`${BASE}/shipments/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`shippo rates → ${r.status}: ${await r.text()}`);
    const json = (await r.json()) as {
      rates: { provider: string; servicelevel: { token: string; name: string }; amount: string; estimated_days: number }[];
    };
    return json.rates.map((rate) => ({
      carrier: rate.provider,
      serviceLevel: rate.servicelevel.token,
      amountCents: Math.round(Number.parseFloat(rate.amount) * 100),
      estimatedDays: rate.estimated_days,
    }));
  },

  async createLabel({ to, from, weightGrams, serviceLevel }) {
    const r = await fetch(`${BASE}/transactions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        servicelevel_token: serviceLevel,
        async: false,
        label_file_type: 'PDF',
        address_to: { ...to, country: 'US' },
        address_from: { ...from, country: 'US' },
        parcel: { weight: (weightGrams / 1000).toFixed(2), mass_unit: 'kg' },
      }),
    });
    if (!r.ok) throw new Error(`shippo label → ${r.status}: ${await r.text()}`);
    const json = (await r.json()) as {
      tracking_number: string;
      tracking_url_provider: string;
      label_url: string;
      rate: { provider: string; servicelevel: { token: string } };
    };
    return {
      carrier: json.rate.provider,
      serviceLevel: json.rate.servicelevel.token,
      trackingNumber: json.tracking_number,
      trackingUrl: json.tracking_url_provider,
      labelUrl: json.label_url,
    };
  },

  verifyWebhook(rawBody, signature) {
    const expected = createHmac('sha256', env.SHIPPO_WEBHOOK_SECRET).update(rawBody).digest('hex');
    if (expected !== signature) throw new Error('shippo webhook signature mismatch');
    const data = JSON.parse(rawBody) as { event: string; data: Record<string, unknown> };
    return { type: data.event, data: data.data };
  },
};
