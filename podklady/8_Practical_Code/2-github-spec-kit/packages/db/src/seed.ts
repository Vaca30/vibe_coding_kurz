import { sql } from 'drizzle-orm';
import { db, closeDb } from './client.ts';
import { color, material } from './schema/catalog.ts';

type MaterialSeed = {
  slug: string;
  displayName: string;
  description: string;
  process: 'fdm' | 'sla';
  minWallThicknessMm: number;
  buildVolumeMm: { x: number; y: number; z: number };
  costPerMm3Usd: number;
  leadTimeDays: number;
  prusaProfilePath: string;
  colors: { slug: string; displayName: string; hex: string }[];
};

const MATERIALS: MaterialSeed[] = [
  {
    slug: 'pla-standard',
    displayName: 'Standard PLA',
    description: 'Bright, easy-going plastic. Great for desk objects, miniatures, and gifts.',
    process: 'fdm',
    minWallThicknessMm: 0.8,
    buildVolumeMm: { x: 250, y: 210, z: 210 },
    costPerMm3Usd: 0.00018,
    leadTimeDays: 2,
    prusaProfilePath: 'infra/prusaslicer/pla-standard.ini',
    colors: [
      { slug: 'white', displayName: 'White', hex: '#f5f5f5' },
      { slug: 'matte-black', displayName: 'Matte Black', hex: '#1a1a1a' },
      { slug: 'ember-orange', displayName: 'Ember Orange', hex: '#ff7a59' },
      { slug: 'forest-green', displayName: 'Forest Green', hex: '#2e7d32' },
    ],
  },
  {
    slug: 'petg-durable',
    displayName: 'Durable PETG',
    description: 'Tougher than PLA, water-resistant, slight gloss. Good for parts that get used.',
    process: 'fdm',
    minWallThicknessMm: 1.2,
    buildVolumeMm: { x: 250, y: 210, z: 210 },
    costPerMm3Usd: 0.00026,
    leadTimeDays: 3,
    prusaProfilePath: 'infra/prusaslicer/petg-durable.ini',
    colors: [
      { slug: 'clear', displayName: 'Clear', hex: '#e0e7ff' },
      { slug: 'graphite', displayName: 'Graphite', hex: '#37474f' },
      { slug: 'royal-blue', displayName: 'Royal Blue', hex: '#1e88e5' },
    ],
  },
  {
    slug: 'resin-tough',
    displayName: 'Tough Resin',
    description: 'High-detail SLA resin. Sharp edges, smooth surfaces. Best for collectibles.',
    process: 'sla',
    minWallThicknessMm: 1.0,
    buildVolumeMm: { x: 145, y: 145, z: 175 },
    costPerMm3Usd: 0.00041,
    leadTimeDays: 4,
    prusaProfilePath: 'infra/prusaslicer/resin-tough.ini',
    colors: [
      { slug: 'bone', displayName: 'Bone', hex: '#f4ead5' },
      { slug: 'jet', displayName: 'Jet', hex: '#0e0e0e' },
    ],
  },
  {
    slug: 'tpu-flexible',
    displayName: 'Flexible TPU',
    description: 'Soft, rubbery. Bends without breaking. Phone grips, toys, gaskets.',
    process: 'fdm',
    minWallThicknessMm: 1.6,
    buildVolumeMm: { x: 250, y: 210, z: 210 },
    costPerMm3Usd: 0.00038,
    leadTimeDays: 4,
    prusaProfilePath: 'infra/prusaslicer/tpu-flexible.ini',
    colors: [
      { slug: 'midnight', displayName: 'Midnight', hex: '#212121' },
      { slug: 'sky', displayName: 'Sky', hex: '#81d4fa' },
    ],
  },
];

async function main(): Promise<void> {
  for (const m of MATERIALS) {
    const [row] = await db
      .insert(material)
      .values({
        slug: m.slug,
        displayName: m.displayName,
        description: m.description,
        process: m.process,
        minWallThicknessMm: m.minWallThicknessMm.toString(),
        buildVolumeMm: m.buildVolumeMm,
        costPerMm3Usd: m.costPerMm3Usd.toString(),
        leadTimeDays: m.leadTimeDays,
        prusaProfilePath: m.prusaProfilePath,
      })
      .onConflictDoUpdate({
        target: material.slug,
        set: { description: m.description, leadTimeDays: m.leadTimeDays },
      })
      .returning({ id: material.id });

    if (!row) throw new Error(`failed to upsert material ${m.slug}`);
    for (const c of m.colors) {
      await db
        .insert(color)
        .values({ materialId: row.id, slug: c.slug, displayName: c.displayName, hex: c.hex })
        .onConflictDoNothing();
    }
  }
  // Sanity probe.
  const count = await db.execute(sql`select count(*)::int as n from material`);
  console.log('seed complete; materials =', count);
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
