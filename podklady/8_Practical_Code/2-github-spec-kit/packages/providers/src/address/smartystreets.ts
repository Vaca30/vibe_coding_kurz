import { env } from '@imagineer/config';
import type { AddressInput } from '@imagineer/shared';
import type { AddressValidator } from './interface.ts';

const BASE = 'https://us-street.api.smarty.com/street-address';

interface SmartyResult {
  delivery_point_check?: string;
  components?: { city_name?: string; state_abbreviation?: string; zipcode?: string; plus4_code?: string };
  delivery_line_1?: string;
  delivery_line_2?: string;
  analysis?: { dpv_match_code?: 'Y' | 'S' | 'D' | 'N' };
}

export const smartystreetsValidator: AddressValidator = {
  async validate(input: AddressInput) {
    const params = new URLSearchParams({
      'auth-id': env.SMARTYSTREETS_AUTH_ID,
      'auth-token': env.SMARTYSTREETS_AUTH_TOKEN,
      candidates: '1',
      street: input.street1,
      ...(input.street2 ? { street2: input.street2 } : {}),
      city: input.city,
      state: input.state,
      zipcode: input.postalCode,
    });
    const r = await fetch(`${BASE}?${params}`);
    if (!r.ok) throw new Error(`smartystreets → ${r.status}: ${await r.text()}`);
    const arr = (await r.json()) as SmartyResult[];
    const first = arr[0];
    if (!first?.analysis?.dpv_match_code) {
      return { isDeliverable: false, dpvMatchCode: 'N', normalized: null, explanation: 'No candidates returned' };
    }
    const code = first.analysis.dpv_match_code;
    const isDeliverable = code === 'Y' || code === 'S';
    return {
      isDeliverable,
      dpvMatchCode: code,
      normalized: isDeliverable
        ? {
            recipientName: input.recipientName,
            street1: first.delivery_line_1 ?? input.street1,
            street2: first.delivery_line_2 ?? null,
            city: first.components?.city_name ?? input.city,
            state: first.components?.state_abbreviation ?? input.state,
            postalCode: first.components?.plus4_code
              ? `${first.components.zipcode}-${first.components.plus4_code}`
              : (first.components?.zipcode ?? input.postalCode),
          }
        : null,
      explanation: isDeliverable ? null : `DPV verdict: ${code}`,
    };
  },
};
