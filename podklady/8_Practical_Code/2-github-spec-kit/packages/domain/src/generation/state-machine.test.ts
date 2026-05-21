import { describe, expect, it } from 'vitest';
import { generationTransition, isGenerationTerminal } from './state-machine.ts';

describe('generation state machine', () => {
  it('queued → running → succeeded', () => {
    const r1 = generationTransition('queued', { type: 'provider_accepted' });
    expect(r1.ok && r1.value).toBe('running');
    const r2 = generationTransition('running', { type: 'provider_succeeded' });
    expect(r2.ok && r2.value).toBe('succeeded');
  });

  it('queued → refused via pre-check', () => {
    const r = generationTransition('queued', { type: 'pre_check_refused' });
    expect(r.ok && r.value).toBe('refused');
  });

  it('running → failed on provider error', () => {
    const r = generationTransition('running', { type: 'provider_failed' });
    expect(r.ok && r.value).toBe('failed');
  });

  it('rejects events from terminal states', () => {
    expect(generationTransition('succeeded', { type: 'provider_succeeded' }).ok).toBe(false);
    expect(generationTransition('refused', { type: 'provider_accepted' }).ok).toBe(false);
    expect(generationTransition('failed', { type: 'provider_succeeded' }).ok).toBe(false);
  });

  it('isGenerationTerminal flags succeeded/refused/failed', () => {
    expect(isGenerationTerminal('succeeded')).toBe(true);
    expect(isGenerationTerminal('refused')).toBe(true);
    expect(isGenerationTerminal('failed')).toBe(true);
    expect(isGenerationTerminal('queued')).toBe(false);
    expect(isGenerationTerminal('running')).toBe(false);
  });
});
