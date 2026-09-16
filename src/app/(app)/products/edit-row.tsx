"use client";

import Link from "next/link";
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

  const low = product.trackStock && product.stock <= product.minStock;

  return (
    <>
      <tr>
        <td className="px-3 py-2.5 font-mono text-xs sm:px-4">{product.sku}</td>
        <td className="px-3 py-2.5 sm:px-4">{product.name}</td>
        <td className="px-3 py-2.5 text-right sm:px-4">{formatCOP(product.price)}</td>
        <td className="px-3 py-2.5 text-right sm:px-4">{product.ivaRate}%</td>
        <td className="px-3 py-2.5 text-right sm:px-4">
          {product.trackStock ? (
            <span className="inline-flex items-center justify-end gap-1.5">
              <span className={low ? "font-semibold text-gold" : ""}>
                {product.stock}
              </span>
              {low && (
                <Badge className="bg-gold-50 text-amber-900 dark:bg-gold/15 dark:text-gold-100">
                  bajo
                </Badge>
              )}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-brand-200/60">N/A</span>
          )}
        </td>
        <td className="px-3 py-2.5 sm:px-4">
          <Badge
            className={
              product.active
                ? "bg-brand-100 text-brand dark:bg-brand-800 dark:text-brand-100"
                : "bg-slate-100 text-slate-600 dark:bg-brand-800/50 dark:text-brand-200"
            }
          >
            {product.active ? "Activo" : "Inactivo"}
          </Badge>
        </td>
        <td className="space-x-2 px-3 py-2.5 text-right sm:px-4">
          {product.trackStock && (
            <Link
              href={`/kardex?productId=${product.id}`}
              className="text-xs font-medium text-slate-500 hover:text-brand hover:underline dark:text-brand-200 dark:hover:text-brand-100"
            >
              Kardex
            </Link>
          )}
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
              {product.trackStock && (
                <button
                  type="button"
                  onClick={() => {
                    setStockOpen((v) => !v);
                    setOpen(false);
                    setStockMsg(null);
                  }}
                  className="text-xs font-medium text-slate-600 hover:underline dark:text-brand-200"
                >
                  Ajustar
                </button>
              )}
              <ToggleProductButton id={product.id} active={product.active} />
            </>
          )}
        </td>
      </tr>
      {canWrite && open && (
        <tr>
          <td colSpan={7} className="bg-slate-50 px-3 py-3 dark:bg-brand-900/30 sm:px-4">
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
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-brand-100">
                <input
                  type="checkbox"
                  name="trackStock"
                  value="true"
                  defaultChecked={product.trackStock}
                />
                Controlar inventario
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-brand-100 sm:col-span-2">
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
          <td colSpan={7} className="bg-gold-50 px-3 py-3 dark:bg-gold/10 sm:px-4">
            <form action={onAdjust} className="grid max-w-xl gap-3 sm:grid-cols-4">
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
              <Input
                label="Motivo"
                name="notes"
                placeholder="Opcional"
                className="sm:col-span-1"
              />
              <div className="flex items-end">
                <Button type="submit">Aplicar</Button>
              </div>
              {stockMsg && (
                <p className="text-sm text-slate-700 dark:text-brand-100 sm:col-span-4">
                  {stockMsg}
                </p>
              )}
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
