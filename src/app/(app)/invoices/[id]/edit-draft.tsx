"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDraftInvoiceAction,
  updateDraftInvoiceAction,
} from "@/actions/invoices";
import { formatCOP, SALE_PAYMENT_METHODS } from "@/lib/format";
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

export function DraftInvoiceEditor({
  invoiceId,
  initialCustomerId,
  initialNotes,
  initialPaymentMethod = "efectivo",
  initialLines,
  customers,
  products,
}: {
  invoiceId: string;
  initialCustomerId: string;
  initialNotes: string;
  initialPaymentMethod?: string;
  initialLines: Omit<Line, "key">[];
  customers: Customer[];
  products: Product[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [notes, setNotes] = useState(initialNotes);
  const [paymentMethod, setPaymentMethod] = useState(
    initialPaymentMethod || "efectivo"
  );
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<Line[]>(
    initialLines.map((l, i) => ({ ...l, key: String(i + 1) }))
  );

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
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)
    );
  }

  async function onSave() {
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("id", invoiceId);
      formData.set("customerId", customerId);
      formData.set("notes", notes);
      formData.set("paymentMethod", paymentMethod);
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
      const res = await updateDraftInvoiceAction(formData);
      if (res?.error) setError(res.error);
      else {
        setMsg("Borrador actualizado.");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (
      !confirm(
        "¿Eliminar este borrador de forma permanente? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await deleteDraftInvoiceAction(invoiceId);
      if (res?.error) {
        setError(res.error);
        setBusy(false);
      }
    } catch {
      // redirect throws NEXT_REDIRECT
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <Card>
        <h2 className="mb-3 text-sm font-semibold">Editar borrador</h2>
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
          <Select
            label="Método de pago"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {SALE_PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <div className="sm:col-span-2">
            <Textarea
              label="Notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Líneas</h2>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={addLine}
          >
            + Línea
          </Button>
        </div>
        <div className="space-y-4">
          {lines.map((l) => (
            <div
              key={l.key}
              className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-brand-200/20 dark:bg-brand-900/45 md:grid-cols-12"
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
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={l.quantity}
                  onChange={(e) => {
                    const n = Math.max(1, Math.round(Number(e.target.value) || 1));
                    updateLine(l.key, { quantity: n });
                  }}
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
                  className="mb-1 min-h-11 w-full touch-manipulation rounded-lg px-2 text-sm text-jam hover:bg-jam-50 hover:underline sm:min-h-0 sm:w-auto sm:text-xs"
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
        <p className="rounded-lg bg-jam-50 px-3 py-2 text-sm text-jam">
          {error}
        </p>
      )}
      {msg && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand">
          {msg}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={onSave}
        >
          Guardar borrador
        </Button>
        <Button
          type="button"
          variant="danger"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={onDelete}
        >
          Eliminar borrador
        </Button>
      </div>
    </div>
  );
}
