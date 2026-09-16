"use client";

import { useState } from "react";
import {
  adjustSupplyStockAction,
  updateSupplyAction,
} from "@/actions/supplies";
import { formatCOP } from "@/lib/format";
import {
  SUPPLY_CATEGORIES,
  SUPPLY_CATEGORY_LABELS,
  SUPPLY_UNITS,
  SUPPLY_UNIT_LABELS,
  supplyCategoryLabel,
  supplyUnitLabel,
} from "@/lib/supplies";
import { Badge, Button, Input, Select } from "@/components/ui";
import { ToggleSupplyButton } from "./toggle";

type Supply = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minStock: number;
  unitCost: number;
  notes: string;
  active: boolean;
};

export function SupplyEditRow({
  supply,
  canWrite,
}: {
  supply: Supply;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockMsg, setStockMsg] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    formData.set("id", supply.id);
    const res = await updateSupplyAction(formData);
    if (res?.error) setError(res.error);
    else setOpen(false);
  }

  async function onAdjust(formData: FormData) {
    setStockMsg(null);
    formData.set("id", supply.id);
    const res = await adjustSupplyStockAction(formData);
    if (res?.error) setStockMsg(res.error);
    else {
      setStockMsg("Stock actualizado.");
      setStockOpen(false);
    }
  }

  const low = supply.quantity <= supply.minStock && supply.minStock > 0;

  return (
    <>
      <tr>
        <td className="px-3 py-2.5 font-mono text-xs sm:px-4">{supply.code}</td>
        <td className="px-3 py-2.5 sm:px-4">
          <span className="font-medium text-slate-900 dark:text-brand-50">
            {supply.name}
          </span>
          {supply.notes ? (
            <span className="mt-0.5 block truncate text-xs text-slate-400 dark:text-brand-200/70">
              {supply.notes}
            </span>
          ) : null}
        </td>
        <td className="px-3 py-2.5 sm:px-4">
          <Badge className="bg-cream-muted text-slate-700 dark:bg-brand-800/60 dark:text-brand-100">
            {supplyCategoryLabel(supply.category)}
          </Badge>
        </td>
        <td className="px-3 py-2.5 text-right sm:px-4">
          <span className="inline-flex items-center justify-end gap-1.5">
            <span className={low ? "font-semibold text-gold" : ""}>
              {supply.quantity}{" "}
              <span className="text-xs font-normal text-slate-400 dark:text-brand-200/70">
                {supplyUnitLabel(supply.unit)}
              </span>
            </span>
            {low && (
              <Badge className="bg-gold-50 text-amber-900 dark:bg-gold/15 dark:text-gold-100">
                ≤ mínimo (aviso)
              </Badge>
            )}
          </span>
        </td>
        <td className="px-3 py-2.5 text-right text-sm text-slate-600 dark:text-brand-200 sm:px-4">
          {supply.minStock} {supplyUnitLabel(supply.unit)}
        </td>
        <td className="px-3 py-2.5 text-right text-sm sm:px-4">
          {supply.unitCost > 0 ? formatCOP(supply.unitCost) : "—"}
        </td>
        <td className="px-3 py-2.5 sm:px-4">
          <Badge
            className={
              supply.active
                ? "bg-brand-100 text-brand dark:bg-brand-800 dark:text-brand-100"
                : "bg-slate-100 text-slate-600 dark:bg-brand-800/50 dark:text-brand-200"
            }
          >
            {supply.active ? "Activo" : "Inactivo"}
          </Badge>
        </td>
        <td className="space-x-2 px-3 py-2.5 text-right sm:px-4">
          {canWrite && (
            <>
              <button
                type="button"
                onClick={() => {
                  setOpen((v) => !v);
                  setStockOpen(false);
                  setError(null);
                }}
                className="text-xs font-medium text-brand hover:underline dark:text-brand-100"
              >
                {open ? "Cerrar" : "Editar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStockOpen((v) => !v);
                  setOpen(false);
                  setStockMsg(null);
                }}
                className="text-xs font-medium text-slate-600 hover:underline dark:text-brand-200"
              >
                Stock
              </button>
              <ToggleSupplyButton id={supply.id} active={supply.active} />
            </>
          )}
        </td>
      </tr>
      {canWrite && open && (
        <tr>
          <td
            colSpan={8}
            className="bg-slate-50 px-3 py-3 dark:bg-brand-900/30 sm:px-4"
          >
            <form action={onSubmit} className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Código"
                name="code"
                required
                defaultValue={supply.code}
              />
              <Input
                label="Nombre"
                name="name"
                required
                defaultValue={supply.name}
              />
              <Select
                label="Categoría"
                name="category"
                defaultValue={supply.category}
              >
                {SUPPLY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {SUPPLY_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
              <Select label="Unidad" name="unit" defaultValue={supply.unit}>
                {SUPPLY_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {SUPPLY_UNIT_LABELS[u]}
                  </option>
                ))}
              </Select>
              <Input
                label="Stock mínimo"
                name="minStock"
                type="number"
                min={0}
                step={0.01}
                defaultValue={supply.minStock}
              />
              <Input
                label="Costo unitario (COP)"
                name="unitCost"
                type="number"
                min={0}
                step={1}
                defaultValue={supply.unitCost}
              />
              <Input
                label="Notas"
                name="notes"
                defaultValue={supply.notes}
                className="sm:col-span-2"
              />
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-brand-100 sm:col-span-2">
                <input
                  type="checkbox"
                  name="active"
                  value="true"
                  defaultChecked={supply.active}
                />
                Activo
              </label>
              {error && (
                <p className="text-sm text-jam sm:col-span-2">{error}</p>
              )}
              <div className="sm:col-span-2">
                <Button type="submit">Guardar cambios</Button>
              </div>
            </form>
          </td>
        </tr>
      )}
      {canWrite && stockOpen && (
        <tr>
          <td
            colSpan={8}
            className="bg-gold-50 px-3 py-3 dark:bg-gold/10 sm:px-4"
          >
            <form
              action={onAdjust}
              className="grid max-w-2xl gap-3 sm:grid-cols-4"
            >
              <Select label="Tipo" name="type" defaultValue="in">
                <option value="in">Entrada</option>
                <option value="out">Salida</option>
                <option value="adjust">Ajuste (establecer)</option>
              </Select>
              <Input
                label="Cantidad"
                name="quantity"
                type="number"
                min={0.01}
                step={0.01}
                required
                defaultValue={1}
              />
              <Input
                label="Motivo"
                name="reason"
                placeholder="Opcional"
              />
              <div className="flex items-end">
                <Button type="submit">Aplicar</Button>
              </div>
              {stockMsg && (
                <p className="text-sm text-slate-700 dark:text-brand-100 sm:col-span-4">
                  {stockMsg}
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-brand-200/80 sm:col-span-4">
                Actual: {supply.quantity} {supplyUnitLabel(supply.unit)}. En
                ajuste, la cantidad es el nuevo valor absoluto.
              </p>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
