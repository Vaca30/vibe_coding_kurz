import { env } from '@imagineer/config';
import type { GenerationProvider } from './interface.ts';
import { meshyProvider } from './meshy.ts';
import { tripoProvider } from './tripo.ts';

export function selectGenerationProvider(): GenerationProvider {
  return env.GENERATION_PROVIDER === 'tripo' ? tripoProvider : meshyProvider;
}
