export interface UnitOption {
  id: string;
  label: string;
  shortLabel: string;
  category: 'bulk_packaging' | 'containers' | 'weight' | 'volume' | 'discrete';
  icon: string;
  description: string;
}

export const COMMON_QUANTITY_UNITS: UnitOption[] = [
  // Commercial Bulk Packaging
  { id: 'boxes', label: 'Boxes (box)', shortLabel: 'boxes', category: 'bulk_packaging', icon: 'inventory_2', description: 'Standard corrugated or wooden shipping boxes' },
  { id: 'barrels', label: 'Barrels (bbl)', shortLabel: 'barrels', category: 'bulk_packaging', icon: 'oil_barrel', description: 'Heavy storage / fermentation barrels' },
  { id: 'crates', label: 'Crates (crt)', shortLabel: 'crates', category: 'bulk_packaging', icon: 'grid_view', description: 'Plastic or wood transport crates' },
  { id: 'cartons', label: 'Cartons (ctn)', shortLabel: 'cartons', category: 'bulk_packaging', icon: 'all_inbox', description: 'Outer cardboard distribution cartons' },
  { id: 'drums', label: 'Drums (drm)', shortLabel: 'drums', category: 'bulk_packaging', icon: 'propane_tank', description: 'Industrial steel or plastic drums (50L-200L)' },
  { id: 'sacks', label: 'Sacks (sck)', shortLabel: 'sacks', category: 'bulk_packaging', icon: 'shopping_bag', description: 'Heavy burlap or poly sacks (25kg - 50kg)' },
  { id: 'pallets', label: 'Pallets (plt)', shortLabel: 'pallets', category: 'bulk_packaging', icon: 'table_rows', description: 'Loaded shipping pallets' },
  { id: 'cases', label: 'Cases (cs)', shortLabel: 'cases', category: 'bulk_packaging', icon: 'package_2', description: 'Retail multi-pack master cases' },

  // Containers & Packs
  { id: 'bags', label: 'Bags (bag)', shortLabel: 'bags', category: 'containers', icon: 'shopping_bag', description: 'Medium or small sealed pouches / bags' },
  { id: 'tins', label: 'Tins / Cans (tin)', shortLabel: 'tins', category: 'containers', icon: 'takeout_dining', description: 'Airtight metal cans or food tins' },
  { id: 'packs', label: 'Packs (pck)', shortLabel: 'packs', category: 'containers', icon: 'inventory', description: 'Bundled consumer multi-packs' },
  { id: 'bottles', label: 'Bottles (btl)', shortLabel: 'bottles', category: 'containers', icon: 'water_bottle', description: 'Glass or PET liquid bottles' },
  { id: 'jars', label: 'Jars (jar)', shortLabel: 'jars', category: 'containers', icon: 'nutrition', description: 'Glass storage jars' },

  // Weight & Volume Measurements
  { id: 'kg', label: 'Kilograms (kg)', shortLabel: 'kg', category: 'weight', icon: 'scale', description: 'Metric kilogram weight' },
  { id: 'g', label: 'Grams (g)', shortLabel: 'g', category: 'weight', icon: 'scale', description: 'Metric gram precise measurement' },
  { id: 'liters', label: 'Liters (L)', shortLabel: 'L', category: 'volume', icon: 'opacity', description: 'Metric liquid liters' },
  { id: 'ml', label: 'Milliliters (ml)', shortLabel: 'ml', category: 'volume', icon: 'water_drop', description: 'Metric milliliter fluid measure' },

  // Discrete
  { id: 'units', label: 'Units / Pieces (pcs)', shortLabel: 'units', category: 'discrete', icon: 'filter_frames', description: 'Individual single items' },
];

/**
 * Returns a suitable icon name (Material Symbols) for a given unit string.
 */
export function getUnitIcon(unitStr?: string): string {
  if (!unitStr) return 'inventory_2';
  const u = unitStr.toLowerCase();
  if (u.includes('barrel') || u.includes('bbl')) return 'oil_barrel';
  if (u.includes('box')) return 'inventory_2';
  if (u.includes('crate')) return 'grid_view';
  if (u.includes('carton')) return 'all_inbox';
  if (u.includes('drum')) return 'propane_tank';
  if (u.includes('sack')) return 'shopping_bag';
  if (u.includes('pallet')) return 'table_rows';
  if (u.includes('case')) return 'package_2';
  if (u.includes('bag')) return 'shopping_bag';
  if (u.includes('tin') || u.includes('can')) return 'takeout_dining';
  if (u.includes('bottle')) return 'water_bottle';
  if (u.includes('jar')) return 'nutrition';
  if (u.includes('kg') || u.includes('gram') || u.includes('lbs')) return 'scale';
  if (u.includes('liter') || u.includes('ml') || u.includes('oz')) return 'opacity';
  if (u.includes('pack')) return 'inventory';
  return 'inventory_2';
}

/**
 * Normalizes user-input unit strings or selections into friendly display.
 */
export function cleanUnitName(unitStr?: string): string {
  if (!unitStr) return 'units';
  return unitStr.trim();
}
