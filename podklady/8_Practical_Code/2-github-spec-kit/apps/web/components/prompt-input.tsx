'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ImageUpload } from '~/components/image-upload.tsx';
import { useGenerationSession } from '~/lib/session.ts';

type Mode = 'text' | 'image';

export function PromptInput() {
  const router = useRouter();
  const sessionId = useGenerationSession();
  const [mode, setMode] = useState<Mode>('text');
  const [prompt, setPrompt] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body =
        mode === 'text'
          ? { kind: 'text', prompt }
          : { kind: 'image', imageUri, ...(hint ? { hint } : {}) };
      const r = await fetch('/api/generations', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-session-id': sessionId },
        body: JSON.stringify(body),
      });
      if (r.status === 422) {
        const responseBody = (await r.json()) as { customerMessage: string };
        setError(responseBody.customerMessage);
        return;
      }
      if (!r.ok) throw new Error(`unexpected ${r.status}`);
      const job = (await r.json()) as { id: string };
      router.push(`/generations/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="prompt-form">
      <div className="flex gap-2">
        <button
          type="button"
          className={tabClass(mode === 'text')}
          onClick={() => setMode('text')}
          data-testid="mode-text"
        >
          Describe it
        </button>
        <button
          type="button"
          className={tabClass(mode === 'image')}
          onClick={() => setMode('image')}
          data-testid="mode-image"
        >
          Upload a photo
        </button>
      </div>

      {mode === 'text' ? (
        <label className="block">
          <span className="text-sm font-medium">Describe what you want printed</span>
          <textarea
            name="prompt"
            required
            minLength={3}
            maxLength={500}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="input mt-1 h-28 resize-none"
            placeholder="A chess knight shaped like a dragon, 5cm tall…"
            data-testid="prompt-input"
          />
          <span className="text-xs text-foreground/50">{prompt.length}/500</span>
        </label>
      ) : (
        <div className="space-y-3">
          <ImageUpload onUploaded={setImageUri} />
          <label className="block">
            <span className="text-sm font-medium">Optional clarifying hint</span>
            <input
              type="text"
              maxLength={500}
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              className="input mt-1"
              placeholder='e.g. "a ceramic figurine, ~10cm tall"'
              data-testid="prompt-hint"
            />
          </label>
        </div>
      )}

      {error ? (
        <p className="text-sm text-red-600" data-testid="prompt-error">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="btn-primary"
        disabled={submitting || (mode === 'image' && !imageUri)}
        data-testid="prompt-submit"
      >
        {submitting ? 'Generating…' : 'Generate 3D model'}
      </button>
    </form>
  );
}

function tabClass(active: boolean): string {
  return `px-3 py-1.5 text-sm rounded-md border ${
    active ? 'border-accent bg-accent/10 font-medium' : 'border-border bg-background'
  }`;
}
