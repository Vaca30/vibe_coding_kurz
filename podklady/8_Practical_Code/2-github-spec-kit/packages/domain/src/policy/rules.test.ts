import { describe, expect, it } from 'vitest';
import { precheck, listRules } from './rules.ts';

describe('content policy precheck', () => {
  it('allows ordinary creative prompts', () => {
    const verdict = precheck({ kind: 'text', prompt: 'a chess knight shaped like a dragon' });
    expect(verdict.allowed).toBe(true);
  });

  it('blocks firearm requests by rule id', () => {
    const verdict = precheck({ kind: 'text', prompt: 'a small AK-47 rifle for my desk' });
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) expect(verdict.ruleId).toBe('weapons.firearm');
  });

  it('blocks Disney trademark prompts', () => {
    const verdict = precheck({ kind: 'text', prompt: 'Mickey Mouse holding a flower' });
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) expect(verdict.ruleId).toBe('trademark.disney');
  });

  it('blocks identifiable real persons', () => {
    const verdict = precheck({ kind: 'text', prompt: 'a bust of Elon Musk' });
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) expect(verdict.ruleId).toBe('identity.real-person');
  });

  it('passes empty image hint without firing rules', () => {
    expect(precheck({ kind: 'image' }).allowed).toBe(true);
  });

  it('blocks an image hint that names a trademark', () => {
    const verdict = precheck({ kind: 'image', hint: 'lego brick replica' });
    expect(verdict.allowed).toBe(false);
  });

  it('every rule has a stable id and a non-empty customer message', () => {
    const rules = listRules();
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.id).toMatch(/^[a-z0-9.-]+$/);
      expect(r.message.length).toBeGreaterThan(20);
    }
  });
});
