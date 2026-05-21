'use client';

import { useState } from 'react';

const MAX_BYTES = 10 * 1024 * 1024;

export function ImageUpload({ onUploaded }: { onUploaded: (imageUri: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError('Image must be under 10 MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, or WebP images.');
      return;
    }
    setBusy(true);
    try {
      const initResp = await fetch('/api/uploads/image', { method: 'POST' });
      if (!initResp.ok) throw new Error('upload init failed');
      const { imageUri, uploadUrl } = (await initResp.json()) as { imageUri: string; uploadUrl: string };
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': 'application/octet-stream' },
        body: file,
      });
      if (!put.ok) throw new Error(`upload PUT → ${put.status}`);
      setPreviewUrl(URL.createObjectURL(file));
      onUploaded(imageUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="image-upload">
      <label className="block cursor-pointer rounded-md border border-dashed border-border p-6 text-center hover:bg-muted">
        <span className="text-sm text-foreground/70">
          {busy ? 'Uploading…' : previewUrl ? 'Replace image' : 'Click to upload a reference photo'}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          data-testid="image-upload-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </label>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="upload preview" className="mt-3 max-h-40 rounded-md" />
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
