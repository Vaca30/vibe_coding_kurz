'use client';

interface ColorDto {
  id: string;
  slug: string;
  displayName: string;
  hex: string;
  isAvailable: boolean;
}

export function ColorPicker({
  colors,
  selectedId,
  onChange,
}: {
  colors: ColorDto[];
  selectedId: string | null;
  onChange: (colorId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="color-picker">
      {colors.map((c) => {
        const selected = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            disabled={!c.isAvailable}
            title={c.displayName + (c.isAvailable ? '' : ' (out of stock)')}
            onClick={() => c.isAvailable && onChange(c.id)}
            data-testid={`color-${c.slug}`}
            data-selected={selected}
            className={`h-9 w-9 rounded-full border-2 transition ${
              selected ? 'border-accent' : 'border-border'
            } ${c.isAvailable ? 'hover:scale-105' : 'opacity-40 cursor-not-allowed'}`}
            style={{ backgroundColor: c.hex }}
          />
        );
      })}
    </div>
  );
}
