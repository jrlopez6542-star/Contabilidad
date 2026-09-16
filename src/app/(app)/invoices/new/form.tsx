"use client";

import { useMemo, useState } from "react";
import { createInvoiceAction } from "@/actions/invoices";
import { formatCOP } from "@/lib/format";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";

type Customer = { id: string; name: string; nit: string };
type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  ivaRate: number;
};

type Line = {
  key: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  ivaRate: number;
};

export function InvoiceForm({
  customers,
  products,
}: {
  customers: Customer[];
  products: Product[];
}) {
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([
    {
      key: "1",
      productId: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      ivaRate: 19,
    },
  ]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let ivaTotal = 0;
    for (const l of lines) {
      const s = Math.round(l.quantity * l.unitPrice);
      const i = Math.round(s * (l.ivaRate / 100));
      subtotal += s;
      ivaTotal += i;
    }
    return { subtotal, ivaTotal, total: subtotal + ivaTotal };
  }, [lines]);

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        key: String(Date.now()),
        productId: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        ivaRate: 19,
      },
    ]);
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l))
    );
  }

  function onProductChange(key: string, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) {
      updateLine(key, { productId: "" });
      return;
    }
    updateLine(key, {
      productId,
      description: p.name,
      unitPrice: p.price,
      ivaRate: p.ivaRate,
    });
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  async function submit(issueNow: boolean) {
    setError(null);
    const formData = new FormData();
    formData.set("customerId", customerId);
    formData.set("notes", notes);
    formData.set("issueNow", issueNow ? "true" : "false");
    formData.set(
      "itemsJson",
      JSON.stringify(
        lines.map((l) => ({
          productId: l.productId || null,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          ivaRate: l.ivaRate,
        }))
      )
    );
    const res = await createInvoiceAction(formData);
    if (res?.error) setError(res.error);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Cliente"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >
            <option value="">Seleccione…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.nit})
              </option>
            ))}
          </Select>
          <Textarea
            label="Notas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Líneas</h2>
          <Button type="button" variant="secondary" onClick={addLine}>
            + Línea
          </Button>
        </div>
        <div className="space-y-4">
          {lines.map((l) => (
            <div
              key={l.key}
              className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 md:grid-cols-12"
            >
              <div className="md:col-span-3">
                <Select
                  label="Producto"
                  value={l.productId}
                  onChange={(e) => onProductChange(l.key, e.target.value)}
                >
                  <option value="">Manual…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-3">
                <Input
                  label="Descripción"
                  value={l.description}
                  onChange={(e) =>
                    updateLine(l.key, { description: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  label="Cant."
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={l.quantity}
                  onChange={(e) =>
                    updateLine(l.key, { quantity: Number(e.target.value) })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Precio unit."
                  type="number"
                  min={0}
                  step={1}
                  value={l.unitPrice}
                  onChange={(e) =>
                    updateLine(l.key, { unitPrice: Number(e.target.value) })
                  }
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  label="IVA %"
                  type="number"
                  min={0}
                  step={0.01}
                  value={l.ivaRate}
                  onChange={(e) =>
                    updateLine(l.key, { ivaRate: Number(e.target.value) })
                  }
                />
              </div>
              <div className="flex items-end md:col-span-2">
                <button
                  type="button"
                  onClick={() => removeLine(l.key)}
                  className="mb-1 text-xs text-red-600 hover:underline"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-end gap-1 text-sm">
          <p>
            Subtotal: <strong>{formatCOP(totals.subtotal)}</strong>
          </p>
          <p>
            IVA: <strong>{formatCOP(totals.ivaTotal)}</strong>
          </p>
          <p className="text-base">
            Total: <strong>{formatCOP(totals.total)}</strong>
          </p>
        </div>
      </Card>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => submit(true)}>
          Emitir factura
        </Button>
        <Button type="button" variant="secondary" onClick={() => submit(false)}>
          Guardar borrador
        </Button>
      </div>
    </div>
  );
}
