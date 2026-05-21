'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useGenerationSession } from '~/lib/session.ts';

export function RegenerateButton({ generationId }: { generationId: string }) {
  const router = useRouter();
  const sessionId = useGenerationSession();
  const [busy, setBusy] = useState(false);
  const [paywall, setPaywall] = useState<{ used: number; quota: number } | null>(null);

  const fire = async (acceptPaid: boolean) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/generations/${generationId}/regenerate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-session-id': sessionId },
        body: JSON.stringify({ acceptPaidRegeneration: acceptPaid }),
      });
      if (r.status === 402) {
        const body = (await r.json()) as { used: number; quota: number };
        setPaywall(body);
        return;
      }
      if (!r.ok) throw new Error(`regenerate failed: ${r.status}`);
      const job = (await r.json()) as { id: string };
      router.push(`/generations/${job.id}`);
    } finally {
      setBusy(false);
    }
  };

  if (paywall) {
    return (
      <div className="text-sm text-foreground/70" data-testid="regenerate-paywall">
        You&rsquo;ve used {paywall.used}/{paywall.quota} free regenerations. Additional regenerations
        cost extra.
      </div>
    );
  }

  return (
    <button
      type="button"
      className="btn-secondary"
      data-testid="regenerate-button"
      disabled={busy}
      onClick={() => void fire(false)}
    >
      {busy ? 'Regenerating…' : 'Regenerate'}
    </button>
  );
}
