'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { AddressForm, type AddressFormValue } from '~/components/address-form.tsx';
import { ColorPicker } from '~/components/color-picker.tsx';
import { MaterialSelector, type MaterialDto } from '~/components/material-selector.tsx';

export default function NewOrderPage() {
  return (
    <Suspense fallback={<Shell>Loading…</Shell>}>
      <NewOrderInner />
    </Suspense>
  );
}

function NewOrderInner() {
  const router = useRouter();
  const params = useSearchParams();
  const modelId = params.get('modelId');
  const [address, setAddress] = useState<AddressFormValue | null>(null);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [colorId, setColorId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: materials } = useQuery<MaterialDto[]>({
    queryKey: ['materials', modelId],
    queryFn: async () => {
      const r = await fetch(`/api/catalog/materials?modelId=${modelId}`);
      if (!r.ok) throw new Error(`status ${r.status}`);
      return (await r.json()) as MaterialDto[];
    },
    enabled: Boolean(modelId),
  });

  // Default to the first available material/color once data loads.
  useEffect(() => {
    if (!materials || materialId) return;
    const first = materials.find((m) => m.isAvailable);
    if (first) {
      setMaterialId(first.id);
      const firstColor = first.colors.find((c) => c.isAvailable);
      if (firstColor) setColorId(firstColor.id);
    }
  }, [materials, materialId]);

  const selectedMaterial = useMemo(
    () => materials?.find((m) => m.id === materialId),
    [materials, materialId],
  );

  if (!modelId) return <Shell>Missing model id.</Shell>;
  if (!materials || !selectedMaterial) return <Shell>Loading materials…</Shell>;

  const checkout = async () => {
    if (!address || !materialId || !colorId) return;
    setSubmitting(true);
    try {
      const draft = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ modelId, materialId, colorId, address }),
      });
      if (draft.status === 401) {
        router.push(`/sign-in?next=/order/new?modelId=${modelId}`);
        return;
      }
      if (!draft.ok) throw new Error(`order failed: ${draft.status} ${await draft.text()}`);
      const order = (await draft.json()) as { id: string };
      const checkoutResp = await fetch(`/api/orders/${order.id}/checkout`, { method: 'POST' });
      if (!checkoutResp.ok) throw new Error(`checkout failed: ${checkoutResp.status}`);
      const { checkoutUrl } = (await checkoutResp.json()) as { checkoutUrl: string };
      window.location.assign(checkoutUrl);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <h2 className="text-2xl font-semibold">Place your order</h2>
      <div className="mt-6 grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">Material</h3>
            <MaterialSelector
              materials={materials}
              selectedId={materialId ?? ''}
              onChange={(id) => {
                setMaterialId(id);
                const m = materials.find((x) => x.id === id);
                const first = m?.colors.find((c) => c.isAvailable);
                if (first) setColorId(first.id);
              }}
            />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Color</h3>
            <ColorPicker colors={selectedMaterial.colors} selectedId={colorId} onChange={setColorId} />
          </div>
          <div className="rounded-md bg-muted p-4 text-sm">
            <div className="flex justify-between">
              <span>Total</span>
              <span className="font-semibold" data-testid="order-price">
                ${(selectedMaterial.priceCents / 100).toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-foreground/60 mt-1">
              Estimated delivery in ~{selectedMaterial.leadTimeDays + 3} days
            </p>
          </div>
        </div>
        <AddressForm onValid={setAddress} />
      </div>
      <button
        type="button"
        className="btn-primary mt-8"
        data-testid="checkout-button"
        disabled={!address || !materialId || !colorId || submitting}
        onClick={checkout}
      >
        {submitting ? 'Starting checkout…' : 'Continue to payment'}
      </button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-4xl px-6 py-10">{children}</section>;
}
