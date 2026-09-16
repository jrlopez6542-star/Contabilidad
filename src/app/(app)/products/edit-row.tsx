"use client";

import { useState } from "react";
import { adjustStockAction, updateProductAction } from "@/actions/products";
import { formatCOP } from "@/lib/format";
import { Badge, Button, Input, Select } from "@/components/ui";
import { ToggleProductButton } from "./toggle";

type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  ivaRate: number;
  stock: number;
  minStock: number;
  trackStock: boolean;
  active: boolean;
};

export function ProductEditRow({
  product,
  canWrite,
}: {
  product: Product;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockMsg, setStockMsg] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    formData.set("id", product.id);
    const res = await updateProductAction(formData);
    if (res?.error) setError(res.error);
    else setOpen(false);
  }

  async function onAdjust(formData: FormData) {
    setStockMsg(null);
    formData.set("id", product.id);
    const res = await adjustStockAction(formData);
    if (res?.error) setStockMsg(res.error);
    else {
      setStockMsg("Stock actualizado.");
      setStockOpen(false);
    }
  }

  const low =
    product.trackStock && product.stock <= product.minStock;

  return (
    <>
      <tr>
        <td className="px-3 py-3 sm:px-4 font-mono text-xs">{product.sku}</td>
        <td className="px-3 py-3 sm:px-4">{product.name}</td>
        <td className="px-3 py-3 sm:px-4 text-right">{formatCOP(product.price)}</td>
        <td className="px-3 py-3 sm:px-4 text-right">{product.ivaRate}%</td>
        <td className="px-3 py-3 sm:px-4 text-right">
          {product.trackStock ? (
            <span className={low ? "font-semibold text-gold" : ""}>
              {product.stock}
              {low && (
                <span className="ml-1 text-xs text-gold">(bajo)</span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">N/A</span>
          )}
        </td>
        <td className="px-3 py-3 sm:px-4">
          <Badge
            className={
              product.active
                ? "bg-brand-100 text-brand"
                : "bg-slate-100 text-slate-600"
            }
          >
            {product.active ? "Activo" : "Inactivo"}
          </Badge>
        </td>
        {canWrite && (
          <td className="space-x-3 px-3 py-3 sm:px-4 text-right">
            <button
              type="button"
              onClick={() => {
                setOpen((v) => !v);
                setStockOpen(false);
                setError(null);
              }}
              className="text-xs font-medium text-brand hover:underline"
            >
              {open ? "Cerrar" : "Editar"}
            </button>
            {product.trackStock && (
              <button
                type="button"
                onClick={() => {
                  setStockOpen((v) => !v);
                  setOpen(false);
                  setStockMsg(null);
                }}
                className="text-xs font-medium text-slate-600 hover:underline"
              >
                Ajustar stock
              </button>
            )}
            <ToggleProductButton id={product.id} active={product.active} />
          </td>
        )}
      </tr>
      {canWrite && open && (
        <tr>
          <td colSpan={7} className="bg-slate-50 px-3 py-4 sm:px-4">
            <form action={onSubmit} className="grid gap-3 sm:grid-cols-2">
              <Input label="SKU" name="sku" required defaultValue={product.sku} />
              <Input label="Nombre" name="name" required defaultValue={product.name} />
              <Input
                label="Precio (COP sin IVA)"
                name="price"
                type="number"
                min={0}
                step={1}
                required
                defaultValue={product.price}
              />
              <Input
                label="IVA %"
                name="ivaRate"
                type="number"
                min={0}
                step={0.01}
                defaultValue={product.ivaRate}
              />
              <Input
                label="Stock mínimo"
                name="minStock"
                type="number"
                min={0}
                step={0.01}
                defaultValue={product.minStock}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="trackStock"
                  value="true"
                  defaultChecked={product.trackStock}
                />
                Controlar inventario
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  name="active"
                  value="true"
                  defaultChecked={product.active}
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
          <td colSpan={7} className="bg-gold-50 px-3 py-4 sm:px-4">
            <form action={onAdjust} className="grid max-w-lg gap-3 sm:grid-cols-3">
              <Select label="Modo" name="mode" defaultValue="set">
                <option value="set">Establecer valor</option>
                <option value="delta">Sumar / restar</option>
              </Select>
              <Input
                label="Valor"
                name="value"
                type="number"
                step={0.01}
                required
                defaultValue={product.stock}
              />
              <div className="flex items-end">
                <Button type="submit">Aplicar</Button>
              </div>
              {stockMsg && (
                <p className="text-sm text-slate-700 sm:col-span-3">{stockMsg}</p>
              )}
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
