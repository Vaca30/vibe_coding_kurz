'use client';

interface ColorDto {
  id: string;
  slug: string;
  displayName: string;
  hex: string;
  isAvailable: boolean;
}

export interface MaterialDto {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  priceCents: number;
  leadTimeDays: number;
  isAvailable: boolean;
  unavailableReason: string | null;
  restockEstimatedAt: string | null;
  colors: ColorDto[];
}

export function MaterialSelector({
  materials,
  selectedId,
  onChange,
}: {
  materials: MaterialDto[];
  selectedId: string;
  onChange: (materialId: string) => void;
}) {
  return (
    <div className="space-y-2" data-testid="material-selector">
      {materials.map((m) => {
        const selected = m.id === selectedId;
        const disabled = !m.isAvailable;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => !disabled && onChange(m.id)}
            disabled={disabled}
            className={`w-full text-left rounded-md border p-3 transition ${
              selected ? 'border-accent ring-2 ring-accent/30' : 'border-border'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}`}
            data-testid={`material-${m.slug}`}
            data-selected={selected}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{m.displayName}</p>
                <p className="text-xs text-foreground/60">{m.description}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${(m.priceCents / 100).toFixed(2)}</p>
                <p className="text-xs text-foreground/60">~{m.leadTimeDays + 3} days</p>
              </div>
            </div>
            {!m.isAvailable ? (
              <p className="mt-2 text-xs text-amber-700" data-testid={`material-${m.slug}-unavailable`}>
                Out of stock
                {m.restockEstimatedAt ? ` — back ${m.restockEstimatedAt}` : ''}
                {m.unavailableReason ? `. ${m.unavailableReason}` : ''}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
