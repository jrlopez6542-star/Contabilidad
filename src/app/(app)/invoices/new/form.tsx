"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createInvoiceAction,
  findOrCreateCustomerByCedulaAction,
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
  stock: number;
  trackStock: boolean;
};

type Line = {
  key: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  ivaRate: number;
};

const CONSUMIDOR_FINAL_NIT = "222222222222";
const CONSUMIDOR_FINAL_NAME = "Consumidor final";

function emptyLine(key?: string): Line {
  return {
    key: key ?? String(Date.now()),
    productId: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    ivaRate: 19,
  };
}

/** Denominaciones rápidas COP para vuelto en mostrador. */
const CASH_CHIPS = [5000, 10000, 20000, 50000, 100000] as const;

/** Acepta dígitos y separadores de miles (es-CO); COP sin centavos. */
function parseCOPInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function InvoiceForm({
  customers,
  products,
}: {
  customers: Customer[];
  products: Product[];
}) {
  const [cedula, setCedula] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerHint, setCustomerHint] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [scanQuery, setScanQuery] = useState("");
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [stockWarn, setStockWarn] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([emptyLine("1")]);
  const [cashOpen, setCashOpen] = useState(false);
  const [receivedInput, setReceivedInput] = useState("");
  const [charging, setCharging] = useState(false);

  const scanRef = useRef<HTMLInputElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);
  const lookingUpRef = useRef(false);
  const issueRef = useRef<() => void>(() => {});

  useEffect(() => {
    lookingUpRef.current = lookingUp;
  }, [lookingUp]);

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
    setLines((prev) => [...prev, emptyLine()]);
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

  function bumpQty(key: string, delta: number) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        return { ...l, quantity: Math.max(1, l.quantity + delta) };
      })
    );
  }

  function pickExistingCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setCedula(c.nit);
      setCustomerName(c.name);
      setCustomerHint(`Cliente existente: ${c.name}`);
    }
  }

  async function lookupCedula(opts?: {
    doc?: string;
    name?: string;
    focusScan?: boolean;
  }) {
    setError(null);
    setCustomerHint(null);
    const doc = (opts?.doc ?? cedula).trim();
    const name = (opts?.name ?? customerName).trim();
    if (!doc) {
      setError("Ingrese la cédula o NIT.");
      return;
    }
    setLookingUp(true);
    try {
      const fd = new FormData();
      fd.set("cedula", doc);
      if (name) fd.set("name", name);
      const res = await findOrCreateCustomerByCedulaAction(fd);
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      if (res && "customer" in res && res.customer) {
        setCustomerId(res.customer.id);
        setCustomerName(res.customer.name);
        setCedula(res.customer.nit);
        setCustomerHint(
          res.created
            ? `Cliente nuevo: ${res.customer.name}`
            : `Cliente encontrado: ${res.customer.name}`
        );
        if (opts?.focusScan) {
          requestAnimationFrame(() => scanRef.current?.focus());
        }
      }
    } finally {
      setLookingUp(false);
    }
  }

  async function setConsumidorFinal() {
    setCedula(CONSUMIDOR_FINAL_NIT);
    setCustomerName(CONSUMIDOR_FINAL_NAME);
    setCustomerId("");
    await lookupCedula({
      doc: CONSUMIDOR_FINAL_NIT,
      name: CONSUMIDOR_FINAL_NAME,
      focusScan: true,
    });
  }

  const scanSuggestions = useMemo(() => {
    const q = scanQuery.trim().toLowerCase();
    if (!q) return [] as Product[];
    return products
      .filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [scanQuery, products]);

  function matchProduct(query: string): {
    product: Product | null;
    ambiguous: Product[];
  } {
    const q = query.trim();
    if (!q) return { product: null, ambiguous: [] };
    const lower = q.toLowerCase();

    const exactSku = products.find((p) => p.sku.toLowerCase() === lower);
    if (exactSku) return { product: exactSku, ambiguous: [] };

    const exactName = products.find((p) => p.name.toLowerCase() === lower);
    if (exactName) return { product: exactName, ambiguous: [] };

    if (/^\d+$/.test(q)) {
      const skuPrefix = products.filter((p) =>
        p.sku.toLowerCase().startsWith(lower)
      );
      if (skuPrefix.length === 1) return { product: skuPrefix[0], ambiguous: [] };
      if (skuPrefix.length > 1) return { product: null, ambiguous: skuPrefix };
      return { product: null, ambiguous: [] };
    }

    const substr = products.filter(
      (p) =>
        p.sku.toLowerCase().includes(lower) ||
        p.name.toLowerCase().includes(lower)
    );
    if (substr.length === 1) return { product: substr[0], ambiguous: [] };
    if (substr.length > 1) return { product: null, ambiguous: substr };
    return { product: null, ambiguous: [] };
  }

  function addOrIncrementProduct(p: Product) {
    setScanHint(null);

    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        const nextQty = existing.quantity + 1;
        return prev.map((l) =>
          l.key === existing.key ? { ...l, quantity: nextQty } : l
        );
      }

      const emptyIdx = prev.findIndex(
        (l) => !l.productId && !l.description.trim()
      );
      const newLine: Line = {
        key: String(Date.now()),
        productId: p.id,
        description: p.name,
        quantity: 1,
        unitPrice: p.price,
        ivaRate: p.ivaRate,
      };
      if (emptyIdx >= 0) {
        return prev.map((l, i) =>
          i === emptyIdx ? { ...newLine, key: l.key } : l
        );
      }
      return [...prev, newLine];
    });

    // Warn after deciding add vs increment (uses current lines snapshot).
    const existing = lines.find((l) => l.productId === p.id);
    const nextQty = existing ? existing.quantity + 1 : 1;
    if (p.trackStock) {
      if (p.stock <= 0) {
        setStockWarn(`${p.name}: stock en 0`);
      } else if (nextQty > p.stock) {
        setStockWarn(
          `${p.name}: solo hay ${p.stock} en stock (qty ${nextQty})`
        );
      } else {
        setStockWarn(null);
      }
    } else {
      setStockWarn(null);
    }
  }

  function pickScanSuggestion(p: Product) {
    addOrIncrementProduct(p);
    setScanQuery("");
    setScanHint(null);
    requestAnimationFrame(() => scanRef.current?.focus());
  }

  function onScanSubmit() {
    const q = scanQuery.trim();
    if (!q) return;
    const { product, ambiguous } = matchProduct(q);
    if (product) {
      addOrIncrementProduct(product);
      setScanQuery("");
      requestAnimationFrame(() => scanRef.current?.focus());
      return;
    }
    if (ambiguous.length > 0) {
      setScanHint("Varias coincidencias — elige abajo");
      return;
    }
    setScanHint(`Sin coincidencia para «${q}»`);
  }

  const receivedAmount = parseCOPInput(receivedInput);
  const cashDiff = receivedAmount - totals.total;
  const canConfirmCash = receivedAmount >= totals.total && totals.total > 0;

  async function submit(
    issueNow: boolean,
    cash?: { amountReceived: number; changeGiven: number }
  ) {
    setError(null);
    if (issueNow) setCharging(true);
    const formData = new FormData();
    formData.set("customerId", customerId);
    formData.set("cedula", cedula.trim());
    formData.set("customerName", customerName.trim());
    formData.set("notes", notes);
    formData.set("paymentMethod", paymentMethod);
    formData.set("issueNow", issueNow ? "true" : "false");
    // Al emitir, registrar pago completo con el método elegido (venta de mostrador).
    formData.set("markPaid", issueNow ? "true" : "false");
    if (cash && paymentMethod === "efectivo") {
      formData.set("amountReceived", String(cash.amountReceived));
      formData.set("changeGiven", String(cash.changeGiven));
    }
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
    // redirect() on success; only reset UI on explicit error
    if (res?.error) {
      setError(res.error);
      setCharging(false);
    }
  }

  function openCashTender() {
    setError(null);
    setReceivedInput(totals.total > 0 ? String(totals.total) : "");
    setCashOpen(true);
  }

  function closeCashTender() {
    if (charging) return;
    setCashOpen(false);
  }

  function requestIssueAndCharge() {
    if (lookingUp || charging) return;
    if (paymentMethod === "efectivo") {
      openCashTender();
      return;
    }
    void submit(true);
  }

  function confirmCashCharge() {
    if (!canConfirmCash || charging) return;
    void submit(true, {
      amountReceived: receivedAmount,
      changeGiven: Math.max(0, cashDiff),
    });
  }

  issueRef.current = () => {
    requestIssueAndCharge();
  };

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key !== "Enter") return;
      if (lookingUpRef.current) return;
      e.preventDefault();
      issueRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!cashOpen) return;
    const t = window.setTimeout(() => {
      cashInputRef.current?.focus();
      cashInputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(t);
  }, [cashOpen]);

  return (
    <div className="space-y-4 pb-28 sm:pb-24">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Input
              label="Cédula / NIT"
              value={cedula}
              autoFocus
              onChange={(e) => {
                setCedula(e.target.value);
                setCustomerId("");
                setCustomerHint(null);
              }}
              onBlur={() => {
                if (cedula.trim()) void lookupCedula();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void lookupCedula({ focusScan: true });
                }
              }}
              placeholder="Ej. 1234567890"
              required
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => void lookupCedula({ focusScan: true })}
                disabled={lookingUp}
              >
                {lookingUp ? "Buscando…" : "Buscar / crear cliente"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => void setConsumidorFinal()}
                disabled={lookingUp}
              >
                Consumidor final
              </Button>
            </div>
            {customerHint && (
              <p className="text-xs text-brand">{customerHint}</p>
            )}
          </div>
          <Input
            label="Nombre (opcional si es nuevo)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={`Cliente ${cedula.trim() || "…"}`}
          />
          <div className="space-y-2">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-brand-100">
              Método de pago
            </span>
            <div className="grid grid-cols-2 gap-2">
              {SALE_PAYMENT_METHODS.map((m) => {
                const selected = paymentMethod === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={`min-h-12 touch-manipulation rounded-xl border-2 px-3 py-3 text-sm font-semibold transition sm:min-h-11 ${
                      selected
                        ? "border-brand bg-brand text-white shadow-sm dark:border-brand-light dark:bg-brand-light"
                        : "border-brand/20 bg-surface text-brand hover:bg-brand-50 dark:border-brand-200/25 dark:text-brand-100 dark:hover:bg-brand-800"
                    }`}
                    aria-pressed={selected}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Select
            label="O elegir cliente existente"
            value={customerId}
            onChange={(e) => pickExistingCustomer(e.target.value)}
          >
            <option value="">— Opcional —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.nit})
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
        <p className="mt-3 text-xs text-slate-500">
          No es necesario crear el cliente antes: digite la cédula y, si no
          existe, se crea automáticamente al emitir o al buscar.
        </p>
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

        <div className="mb-4 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                ref={scanRef}
                label="SKU / buscar producto"
                value={scanQuery}
                onChange={(e) => {
                  setScanQuery(e.target.value);
                  setScanHint(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onScanSubmit();
                  }
                }}
                placeholder="SKU o nombre"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full shrink-0 sm:w-auto"
              onClick={onScanSubmit}
            >
              Agregar
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Ejemplos: 001, 002, 003 o parte del nombre. Enter o Agregar.
          </p>
          {scanSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {scanSuggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickScanSuggestion(p)}
                  className="min-h-11 touch-manipulation rounded-xl border border-brand/20 bg-surface px-3 py-2 text-left text-sm font-medium text-brand hover:bg-brand-50 dark:border-brand-200/25 dark:text-brand-100 dark:hover:bg-brand-800 sm:min-h-10"
                >
                  {p.sku} — {p.name}
                </button>
              ))}
            </div>
          )}
          {scanHint && (
            <p className="text-xs text-amber-700 dark:text-gold">{scanHint}</p>
          )}
          {stockWarn && (
            <p className="text-xs text-amber-700 dark:text-gold">{stockWarn}</p>
          )}
        </div>

        <p className="mb-3 text-xs text-slate-500">
          El stock se descuenta al emitir la factura, no al guardar el borrador.
        </p>
        <div className="space-y-4">
          {lines.map((l) => {
            const selected = products.find((p) => p.id === l.productId);
            const overStock =
              selected?.trackStock && l.quantity > selected.stock;
            return (
              <div
                key={l.key}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-brand-200/20 dark:bg-brand-900/45"
              >
                <div className="grid gap-3 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <Select
                      label="Producto"
                      value={l.productId}
                      onChange={(e) => onProductChange(l.key, e.target.value)}
                    >
                      <option value="">Manual…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name}{" "}
                          {p.trackStock
                            ? `(stock: ${p.stock})`
                            : "(sin control)"}
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
                  <div className="md:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-brand-100">
                      Cant.
                    </span>
                    <div className="flex items-stretch gap-1">
                      <button
                        type="button"
                        aria-label="Disminuir cantidad"
                        onClick={() => bumpQty(l.key, -1)}
                        className="min-h-11 min-w-11 touch-manipulation rounded-lg border border-brand/20 bg-surface text-lg font-semibold text-brand hover:bg-brand-50 dark:border-brand-200/25 dark:text-brand-100 dark:hover:bg-brand-800 sm:min-h-10 sm:min-w-10"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={l.quantity}
                        onChange={(e) => {
                          const n = Math.max(
                            1,
                            Math.round(Number(e.target.value) || 1)
                          );
                          updateLine(l.key, { quantity: n });
                        }}
                        className="w-full min-h-11 rounded-lg border border-slate-300 bg-surface px-2 py-2.5 text-center text-base text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 dark:border-brand-200/25 dark:text-brand-50 dark:focus:border-brand-200 dark:focus:ring-brand-800 sm:min-h-10 sm:text-sm"
                      />
                      <button
                        type="button"
                        aria-label="Aumentar cantidad"
                        onClick={() => bumpQty(l.key, 1)}
                        className="min-h-11 min-w-11 touch-manipulation rounded-lg border border-brand/20 bg-surface text-lg font-semibold text-brand hover:bg-brand-50 dark:border-brand-200/25 dark:text-brand-100 dark:hover:bg-brand-800 sm:min-h-10 sm:min-w-10"
                      >
                        +
                      </button>
                    </div>
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
                  <div className="flex items-end md:col-span-1">
                    <button
                      type="button"
                      onClick={() => removeLine(l.key)}
                      className="mb-1 min-h-11 w-full touch-manipulation rounded-lg px-2 text-sm text-jam hover:bg-jam-50 hover:underline sm:min-h-0 sm:w-auto sm:text-xs"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
                {selected && overStock ? (
                  <p className="mt-2 text-xs text-amber-700 dark:text-gold">
                    Solo hay {selected.stock} en stock
                  </p>
                ) : null}
              </div>
            );
          })}
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

      <p className="text-xs text-slate-500">
        «Emitir y cobrar» registra el pago completo con el método seleccionado
        (Efectivo pide vuelto; Transferencia cobra de una). Atajo: Ctrl/Cmd+Enter.
      </p>

      {/* Sticky action bar — mobile-friendly */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-brand/10 bg-surface/95 px-3 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur dark:border-brand-200/15 dark:bg-brand-950/95"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-base font-semibold text-brand dark:text-brand-100 sm:text-left">
            Total: {formatCOP(totals.total)}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => requestIssueAndCharge()}
              disabled={lookingUp || charging}
            >
              Emitir y cobrar
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => void submit(false)}
              disabled={lookingUp || charging}
            >
              Guardar borrador
            </Button>
          </div>
        </div>
      </div>

      {cashOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-brand/40 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={closeCashTender}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cash-tender-title"
            className="w-full max-w-md rounded-t-2xl border border-brand/15 bg-surface p-5 shadow-xl dark:border-brand-200/20 dark:bg-brand-950 sm:rounded-2xl"
            style={{
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="cash-tender-title"
              className="text-lg font-bold text-brand dark:text-brand-100"
            >
              Cobro en efectivo
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-brand-200">
              Indique con cuánto pagan para calcular el vuelto.
            </p>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 dark:bg-brand-900/60">
                <span className="text-sm font-medium text-slate-600 dark:text-brand-200">
                  Total
                </span>
                <span className="text-xl font-bold text-brand dark:text-brand-100">
                  {formatCOP(totals.total)}
                </span>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700 dark:text-brand-100">
                  Recibido
                </span>
                <input
                  ref={cashInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={receivedInput}
                  onChange={(e) => setReceivedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmCashCharge();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      closeCashTender();
                    }
                  }}
                  placeholder="0"
                  disabled={charging}
                  className="w-full min-h-14 rounded-xl border-2 border-brand/25 bg-surface px-4 py-3 text-center text-3xl font-bold tracking-tight text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 disabled:opacity-60 dark:border-brand-200/30 dark:text-brand-50 dark:focus:border-brand-200 dark:focus:ring-brand-800"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={charging}
                  onClick={() => setReceivedInput(String(totals.total))}
                  className="min-h-11 touch-manipulation rounded-xl border border-brand/20 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand dark:border-brand-200/25 dark:bg-brand-800 dark:text-brand-100"
                >
                  Exacto
                </button>
                {CASH_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={charging}
                    onClick={() => setReceivedInput(String(chip))}
                    className="min-h-11 touch-manipulation rounded-xl border border-brand/20 bg-surface px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-50 dark:border-brand-200/25 dark:text-brand-100 dark:hover:bg-brand-800"
                  >
                    {formatCOP(chip)}
                  </button>
                ))}
              </div>

              <div
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  cashDiff >= 0
                    ? "bg-emerald-50 dark:bg-emerald-950/40"
                    : "bg-jam-50 dark:bg-jam-950/30"
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    cashDiff >= 0
                      ? "text-emerald-800 dark:text-emerald-200"
                      : "text-jam dark:text-jam-100"
                  }`}
                >
                  {cashDiff >= 0 ? "Vuelto" : "Falta"}
                </span>
                <span
                  className={`text-2xl font-bold ${
                    cashDiff >= 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-jam"
                  }`}
                >
                  {formatCOP(Math.abs(cashDiff))}
                </span>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                type="button"
                className="w-full sm:flex-1"
                onClick={confirmCashCharge}
                disabled={!canConfirmCash || charging}
              >
                {charging ? "Cobrando…" : "Confirmar cobro"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:flex-1"
                onClick={closeCashTender}
                disabled={charging}
              >
                Atrás
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
