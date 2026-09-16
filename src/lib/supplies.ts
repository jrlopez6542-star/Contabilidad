export const SUPPLY_CATEGORIES = [
  "harina",
  "queso",
  "salsa",
  "aceite",
  "empaque",
  "otro",
] as const;

/** Packaging supplies C4/C10 use a fixed alert minimum of 100 units. */
export const PACKAGING_SUPPLY_CODES = ["C4", "C10"] as const;
export const PACKAGING_DEFAULT_MIN_STOCK = 100;

export function isPackagingSupplyCode(code: string): boolean {
  return (PACKAGING_SUPPLY_CODES as readonly string[]).includes(code);
}

export type SupplyCategory = (typeof SUPPLY_CATEGORIES)[number];

export const SUPPLY_CATEGORY_LABELS: Record<SupplyCategory, string> = {
  harina: "Harina",
  queso: "Queso",
  salsa: "Salsa",
  aceite: "Aceite",
  empaque: "Empaque",
  otro: "Otro",
};

export const SUPPLY_UNITS = [
  "kg",
  "g",
  "L",
  "ml",
  "unidad",
  "caja",
  "paquete",
] as const;

export type SupplyUnit = (typeof SUPPLY_UNITS)[number];

export const SUPPLY_UNIT_LABELS: Record<SupplyUnit, string> = {
  kg: "kg",
  g: "g",
  L: "L",
  ml: "ml",
  unidad: "unidad",
  caja: "caja",
  paquete: "paquete",
};

export function supplyCategoryLabel(category: string): string {
  return (
    SUPPLY_CATEGORY_LABELS[category as SupplyCategory] || category || "Otro"
  );
}

export function supplyUnitLabel(unit: string): string {
  return SUPPLY_UNIT_LABELS[unit as SupplyUnit] || unit || "unidad";
}

export function isSupplyCategory(value: string): value is SupplyCategory {
  return (SUPPLY_CATEGORIES as readonly string[]).includes(value);
}

export function isSupplyUnit(value: string): value is SupplyUnit {
  return (SUPPLY_UNITS as readonly string[]).includes(value);
}
