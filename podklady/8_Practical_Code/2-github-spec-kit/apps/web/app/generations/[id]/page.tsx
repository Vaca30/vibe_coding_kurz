'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { ApproveButton } from '~/components/approve-button.tsx';
import { ModelPreview } from '~/components/model-preview.tsx';
import { RegenerateButton } from '~/components/regenerate-button.tsx';

interface GenerationDto {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'refused' | 'failed';
  failureReason: string | null;
  model: { id: string; glbUri: string; thumbnailUri: string; approvedAt: string | null } | null;
}

export default function GenerationStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useQuery<GenerationDto>({
    queryKey: ['generation', id],
    queryFn: async () => {
      const r = await fetch(`/api/generations/${id}`);
      if (!r.ok) throw new Error(`status ${r.status}`);
      return (await r.json()) as GenerationDto;
    },
    refetchInterval: (q) => {
      const last = q.state.data;
      if (!last) return 2000;
      return last.status === 'queued' || last.status === 'running' ? 2000 : false;
    },
  });

  if (isLoading || !data) {
    return <PageShell>Loading…</PageShell>;
  }

  if (data.status === 'queued' || data.status === 'running') {
    return (
      <PageShell>
        <div className="text-center py-20" data-testid="generation-pending">
          <p className="text-lg">Generating your model…</p>
          <p className="text-sm text-foreground/60 mt-2">Usually under 90 seconds.</p>
        </div>
      </PageShell>
    );
  }

  if (data.status === 'refused' || data.status === 'failed') {
    return (
      <PageShell>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6" data-testid="generation-failed">
          <p className="font-medium text-red-700">{data.failureReason ?? 'Generation failed.'}</p>
          <button className="btn-secondary mt-4" onClick={() => router.push('/')}>
            Try a different prompt
          </button>
        </div>
      </PageShell>
    );
  }

  if (!data.model) return <PageShell>Missing model.</PageShell>;

  return (
    <PageShell>
      <div className="grid md:grid-cols-2 gap-8">
        <ModelPreview glbUri={data.model.glbUri} />
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Your generated model</h2>
          <p className="text-sm text-foreground/70">
            Spin and zoom on the left. If you love it, approve and pick a material. If not,
            regenerate.
          </p>
          <div className="flex gap-3">
            <ApproveButton modelId={data.model.id} />
            <RegenerateButton generationId={data.id} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-5xl px-6 py-10">{children}</section>;
}
