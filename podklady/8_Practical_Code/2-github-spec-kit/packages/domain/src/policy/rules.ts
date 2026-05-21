// Content-policy pre-check (FR-005). Cheap rule-based gate before we pay the
// generation provider. The post-check (provider-side moderation flag) lives in
// the worker, not here. Rules are deliberately conservative.

export type PolicyVerdict =
  | { allowed: true }
  | { allowed: false; ruleId: string; customerMessage: string };

interface Rule {
  id: string;
  message: string;
  patterns: RegExp[];
}

const RULES: Rule[] = [
  {
    id: 'weapons.firearm',
    message:
      "We can't print firearms or firearm parts. Try a different prompt — props for film/tabletop are also off-limits.",
    patterns: [
      /\b(gun|pistol|rifle|firearm|ar-?15|ak-?47|glock)\b/i,
      /\b(silencer|suppressor|magazine clip|gun barrel)\b/i,
    ],
  },
  {
    id: 'weapons.bladed',
    message: "We can't print real weapons. Decorative miniatures are fine; full-scale is not.",
    patterns: [/\b(real(?:istic)?\s+(?:knife|sword|machete))\b/i, /\b(brass knuckle)\b/i],
  },
  {
    id: 'sexual.explicit',
    message: 'This prompt looks like it asks for explicit content, which we do not print.',
    patterns: [/\b(porn|nsfw|explicit (?:nude|sex))\b/i],
  },
  {
    id: 'identity.real-person',
    message:
      'We avoid printing recognisable likenesses of real, identifiable people without their consent.',
    patterns: [
      /\b(elon musk|donald trump|taylor swift|joe biden|kim kardashian|barack obama)\b/i,
    ],
  },
  {
    id: 'trademark.disney',
    message: 'This looks like a trademarked Disney character. We can only print original work.',
    patterns: [/\b(mickey mouse|minnie mouse|elsa|anna|moana|simba|pikachu)\b/i],
  },
  {
    id: 'trademark.lego',
    message: 'LEGO® bricks are trademarked. We can only print original brick-style designs.',
    patterns: [/\blego\b/i],
  },
];

export function precheck(input: { kind: 'text'; prompt: string } | { kind: 'image'; hint?: string }): PolicyVerdict {
  const haystack = input.kind === 'text' ? input.prompt : (input.hint ?? '');
  if (!haystack) return { allowed: true };
  for (const rule of RULES) {
    for (const p of rule.patterns) {
      if (p.test(haystack)) {
        return { allowed: false, ruleId: rule.id, customerMessage: rule.message };
      }
    }
  }
  return { allowed: true };
}

export function listRules(): readonly { id: string; message: string }[] {
  return RULES.map((r) => ({ id: r.id, message: r.message }));
}
