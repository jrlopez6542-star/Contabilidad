"use client";

import { useMemo, useState } from "react";
import { formatCOP } from "@/lib/format";

export type StockRow = {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  trackStock: boolean;
  active: boolean;
};

export function StockRapidoSearch({ products }: { products: StockRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle)
    );
  }, [products, q]);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-brand-100">
        Buscar por nombre o SKU
      </label>
      <input
        type="search"
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ej. buñuelo, C4…"
        className="mb-4 w-full min-h-12 touch-manipulation rounded-xl border border-brand/20 bg-surface px-4 py-3 text-base text-slate-900 shadow-sm outline-none ring-brand/30 focus:ring-2 dark:border-brand-200/25 dark:bg-brand-900 dark:text-brand-100"
      />

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand/20 bg-surface px-4 py-8 text-center text-sm text-slate-500 dark:border-brand-200/20 dark:text-brand-200">
          Sin resultados para “{q.trim()}”.
        </p>
      ) : (
        <ul className="divide-y divide-brand/10 overflow-hidden rounded-xl border border-brand/10 bg-surface dark:divide-brand-200/10 dark:border-brand-200/15 dark:bg-brand-900">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-5"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-brand-100">
                  {p.name}
                  {!p.active && (
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      (inactivo)
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-brand-200">
                  SKU {p.sku}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold tabular-nums text-brand dark:text-brand-100">
                  {formatCOP(p.price)}
                </p>
                <p className="text-xs tabular-nums text-slate-500 dark:text-brand-200">
                  {p.trackStock ? `Stock: ${p.stock}` : "Sin inventario"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-400 dark:text-brand-200/70">
        {filtered.length} de {products.length} producto(s)
      </p>
    </div>
  );
}
