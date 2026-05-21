import { db, color, material, printReadinessVerdict } from '@imagineer/db';
import { calculatePricing } from '@imagineer/domain';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// GET /api/catalog/materials?modelId=...
// Per-material pricing for a specific model. Falls back to a placeholder
// volume if no print-readiness verdict has been written yet (still rendering
// the slicer fan-out from US3) so the UI can display something usable.

const PLACEHOLDER_VOLUME_MM3 = 125_000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const modelId = url.searchParams.get('modelId');
  if (!modelId) return NextResponse.json({ error: 'modelId required' }, { status: 400 });

  const materials = await db.select().from(material);

  const items = await Promise.all(
    materials.map(async (m) => {
      const verdict = await db.query.printReadinessVerdict.findFirst({
        where: eq(printReadinessVerdict.modelId, modelId),
      });
      const volume = verdict?.materialVolumeMm3 ? Number(verdict.materialVolumeMm3) : PLACEHOLDER_VOLUME_MM3;
      const pricing = calculatePricing({
        volumeMm3: volume,
        costPerMm3Usd: Number(m.costPerMm3Usd),
        shippingCents: 599,
        taxRate: 0,
      });
      const colors = await db.select().from(color).where(eq(color.materialId, m.id));
      return {
        id: m.id,
        slug: m.slug,
        displayName: m.displayName,
        description: m.description,
        priceCents: pricing.subtotalCents,
        leadTimeDays: m.leadTimeDays,
        isAvailable: m.isAvailable,
        unavailableReason: m.unavailableReason,
        restockEstimatedAt: m.restockEstimatedAt,
        colors: colors.map((c) => ({
          id: c.id,
          slug: c.slug,
          displayName: c.displayName,
          hex: c.hex,
          isAvailable: c.isAvailable,
        })),
      };
    }),
  );

  return NextResponse.json(items);
}
