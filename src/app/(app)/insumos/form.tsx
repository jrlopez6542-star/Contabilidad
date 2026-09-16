"use client";

import { useState } from "react";
import { createSupplyAction } from "@/actions/supplies";
import { Button, Input, Select } from "@/components/ui";
import {
  SUPPLY_CATEGORIES,
  SUPPLY_CATEGORY_LABELS,
  SUPPLY_UNITS,
  SUPPLY_UNIT_LABELS,
} from "@/lib/supplies";

export function SupplyForm() {
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const res = await createSupplyAction(formData);
    if (res?.error) setError(res.error);
    else {
      (document.getElementById("supply-form") as HTMLFormElement)?.reset();
    }
  }

  return (
    <form id="supply-form" action={onSubmit} className="space-y-3">
      <Input label="Código" name="code" required placeholder="HAR-01" />
      <Input label="Nombre" name="name" required placeholder="Harina de trigo" />
      <Select label="Categoría" name="category" defaultValue="otro">
        {SUPPLY_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {SUPPLY_CATEGORY_LABELS[c]}
          </option>
        ))}
      </Select>
      <Select label="Unidad" name="unit" defaultValue="unidad">
        {SUPPLY_UNITS.map((u) => (
          <option key={u} value={u}>
            {SUPPLY_UNIT_LABELS[u]}
          </option>
        ))}
      </Select>
      <Input
        label="Cantidad inicial"
        name="quantity"
        type="number"
        min={0}
        step={0.01}
        defaultValue={0}
      />
      <Input
        label="Stock mínimo (alerta)"
        name="minStock"
        type="number"
        min={0}
        step={0.01}
        defaultValue={0}
      />
      <Input
        label="Costo unitario (COP, opcional)"
        name="unitCost"
        type="number"
        min={0}
        step={1}
        defaultValue={0}
      />
      <Input label="Notas" name="notes" placeholder="Opcional" />
      {error && <p className="text-sm text-jam">{error}</p>}
      <Button type="submit" className="w-full">
        Crear insumo
      </Button>
    </form>
  );
}
