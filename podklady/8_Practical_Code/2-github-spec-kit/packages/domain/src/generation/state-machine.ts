import { type Result, err, ok } from '../result.ts';

export type GenerationStatus = 'queued' | 'running' | 'succeeded' | 'refused' | 'failed';

export type GenerationEvent =
  | { type: 'provider_accepted' }
  | { type: 'pre_check_refused' }
  | { type: 'provider_succeeded' }
  | { type: 'provider_failed' };

export class IllegalGenerationTransition extends Error {
  constructor(public from: GenerationStatus, public event: GenerationEvent['type']) {
    super(`illegal generation transition: ${from} --${event}-->`);
  }
}

const TABLE: Record<GenerationStatus, Partial<Record<GenerationEvent['type'], GenerationStatus>>> = {
  queued: { provider_accepted: 'running', pre_check_refused: 'refused' },
  running: { provider_succeeded: 'succeeded', provider_failed: 'failed' },
  succeeded: {},
  refused: {},
  failed: {},
};

export function generationTransition(
  from: GenerationStatus,
  event: GenerationEvent,
): Result<GenerationStatus, IllegalGenerationTransition> {
  const next = TABLE[from][event.type];
  if (!next) return err(new IllegalGenerationTransition(from, event.type));
  return ok(next);
}

export function isGenerationTerminal(s: GenerationStatus): boolean {
  return s === 'succeeded' || s === 'refused' || s === 'failed';
}
