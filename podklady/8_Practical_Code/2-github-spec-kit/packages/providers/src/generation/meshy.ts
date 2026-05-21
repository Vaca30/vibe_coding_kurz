import { env } from '@imagineer/config';
import type { GenerationProvider, GenerationResult, ProviderJobStatus } from './interface.ts';

const json = { 'content-type': 'application/json' } as const;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${env.MESHY_API_KEY}`,
      ...json,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`meshy ${init?.method ?? 'GET'} ${url} → ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export const meshyProvider: GenerationProvider = {
  id: 'meshy',

  async submit(input): Promise<GenerationResult> {
    const path = input.kind === 'text' ? '/v2/text-to-3d' : '/v2/image-to-3d';
    const body =
      input.kind === 'text'
        ? { prompt: input.prompt, art_style: 'realistic' }
        : { image_url: input.imageUrl, ...(input.hint ? { hint: input.hint } : {}) };
    const r = await fetchJson<{ id: string }>(`${env.MESHY_BASE_URL}${path}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { providerJobId: r.id };
  },

  async poll(id): Promise<ProviderJobStatus> {
    // Mock + Meshy both honour both paths; the kind is encoded in the id only
    // server-side. We try text first, fall back to image — cheap if the same.
    for (const kind of ['text', 'image'] as const) {
      const r = await fetch(`${env.MESHY_BASE_URL}/v2/${kind}-to-3d/${id}`, {
        headers: { authorization: `Bearer ${env.MESHY_API_KEY}` },
      });
      if (r.status === 404) continue;
      if (!r.ok) throw new Error(`meshy poll ${id} → ${r.status}: ${await r.text()}`);
      const body = (await r.json()) as {
        status: 'queued' | 'running' | 'succeeded' | 'failed';
        model_urls?: { glb?: string };
        thumbnail_url?: string;
        error?: string;
      };
      if (body.status === 'queued' || body.status === 'running') return { state: body.status };
      if (body.status === 'succeeded') {
        if (!body.model_urls?.glb || !body.thumbnail_url) {
          throw new Error('meshy succeeded but no glb/thumbnail');
        }
        return { state: 'succeeded', glbUrl: body.model_urls.glb, thumbnailUrl: body.thumbnail_url };
      }
      return { state: 'failed', reason: body.error ?? 'unknown' };
    }
    throw new Error(`meshy poll ${id}: not found`);
  },
};
