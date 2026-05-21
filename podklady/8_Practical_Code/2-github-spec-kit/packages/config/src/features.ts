// Feature flags. Defaults are tuned for the MVP; flip via env or, in future,
// a remote config store.

export type FeatureFlag =
  | 'image_to_3d'
  | 'multi_material_catalog'
  | 'paid_extra_regenerations';

const defaults: Record<FeatureFlag, boolean> = {
  image_to_3d: true,
  multi_material_catalog: true,
  paid_extra_regenerations: false,
};

export const features = {
  isOn(flag: FeatureFlag): boolean {
    const override = process.env[`FEATURE_${flag.toUpperCase()}`];
    if (override === '1' || override === 'true') return true;
    if (override === '0' || override === 'false') return false;
    return defaults[flag];
  },
};
