'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ApproveButton({ modelId }: { modelId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn-primary"
      data-testid="approve-button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await fetch(`/api/models/${modelId}/approve`, { method: 'POST' });
          if (!r.ok) throw new Error(`approve failed: ${r.status}`);
          router.push(`/order/new?modelId=${modelId}`);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Saving…' : 'Approve & continue'}
    </button>
  );
}
