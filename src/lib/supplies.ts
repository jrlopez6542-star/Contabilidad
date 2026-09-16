export const SUPPLY_CATEGORIES = [
  "harina",
  "queso",
  "salsa",
  "aceite",
  "empaque",
  "otro",
] as const;

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
