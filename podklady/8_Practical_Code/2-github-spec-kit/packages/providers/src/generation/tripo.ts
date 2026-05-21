import type { GenerationProvider, ProviderJobStatus } from './interface.ts';

// Dormant secondary provider. Wired against the same interface so the
// fallback is a one-line config flip. Real implementation deferred until we
// actually need to fail over from Meshy in production.

export const tripoProvider: GenerationProvider = {
  id: 'tripo',
  async submit(): Promise<never> {
    throw new Error('tripo provider not yet implemented; set GENERATION_PROVIDER=meshy');
  },
  async poll(): Promise<ProviderJobStatus> {
    throw new Error('tripo provider not yet implemented');
  },
};
