"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteInvoicesBulkAction } from "@/actions/invoices";
import {
  formatCOP,
  formatDate,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from "@/lib/format";
import { Badge, Button, EmptyState, LinkButton, Table } from "@/components/ui";
import { InvoiceRowActions } from "./row-actions";

export type InvoiceListItemData = {
  id: string;
  number: string;
  status: string;
  total: number;
  issuedAt: Date | string | null;
  createdAt: Date | string;
  customer: {
    id: string;
    name: string;
    nit: string;
  };
  payments: {
    amount: number;
  }[];
};

export function InvoiceList({
  invoices,
  canWrite,
}: {
  invoices: InvoiceListItemData[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    count: number;
    numbers: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allIds = invoices.map((inv) => inv.id);
  const selectedCount = selectedIds.length;
  const isAllSelected = invoices.length > 0 && selectedCount === invoices.length;
  const isSomeSelected = selectedCount > 0 && selectedCount < invoices.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds([...allIds]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (busy || selectedIds.length === 0) return;

    const count = selectedIds.length;
    const ok = window.confirm(
      `¿Desea eliminar permanentemente las ${count} facturas seleccionadas? Esta acción no se puede deshacer.`
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const res = await deleteInvoicesBulkAction(selectedIds);
      if (res && "error" in res) {
        setError(res.error);
      } else if (res && "ok" in res && res.ok) {
        setResult({ count: res.count, numbers: res.numbers });
        setSelectedIds([]);
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al procesar la eliminación."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* Banner de resultado exitoso */}
      {result && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>
              Se eliminaron con éxito {result.count}{" "}
              {result.count === 1 ? "factura" : "facturas"} (
              {result.numbers.join(", ")}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-300"
            aria-label="Cerrar notificación"
          >
            ×
          </button>
        </div>
      )}

      {/* Banner de error */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-jam-200 bg-jam-50 px-4 py-3 text-xs font-medium text-jam dark:border-jam/40 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0 text-jam"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-jam hover:text-jam-dark dark:text-red-300"
            aria-label="Cerrar error"
          >
            ×
          </button>
        </div>
      )}

      {/* Barra de selección masiva */}
      {canWrite && invoices.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/10 bg-surface px-4 py-3 shadow-sm dark:border-brand-200/15">
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-brand-100">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isSomeSelected;
                }}
                onChange={toggleSelectAll}
                disabled={busy}
                aria-label="Seleccionar todas las facturas"
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-brand-200/40 dark:bg-brand-900"
              />
              <span>
                {isAllSelected ? "Desmarcar todas" : "Seleccionar todas"} (
                {invoices.length})
              </span>
            </label>

            {selectedCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand dark:bg-brand-900/60 dark:text-gold">
                {selectedCount}{" "}
                {selectedCount === 1
                  ? "factura seleccionada"
                  : "facturas seleccionadas"}
              </span>
            )}
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={clearSelection}
                disabled={busy}
                className="!min-h-9 !px-3 !py-1 !text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteSelected}
                disabled={busy}
                className="!min-h-9 !px-3 !py-1 !text-xs font-semibold"
              >
                <svg
                  className="mr-1.5 h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                {busy ? "Eliminando…" : `Eliminar seleccionadas (${selectedCount})`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Lista vacía */}
      {invoices.length === 0 ? (
        <EmptyState
          message="Aún no hay facturas. Cree la primera para comenzar a vender."
          action={
            canWrite ? (
              <LinkButton href="/invoices/new">Nueva factura</LinkButton>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Vista móvil (< 640px) */}
          <div className="grid gap-3 sm:hidden">
            {invoices.map((inv) => {
              const isSelected = selectedIds.includes(inv.id);
              const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
              const balance =
                inv.status === "void" ? 0 : Math.max(0, inv.total - paid);

              return (
                <div
                  key={inv.id}
                  className={`rounded-2xl border bg-surface p-4 shadow-sm transition-all ${
                    isSelected
                      ? "border-brand ring-2 ring-brand/30 dark:border-gold dark:ring-gold/30 bg-amber-50/30 dark:bg-brand-900/30"
                      : "border-brand/10 dark:border-brand-200/15"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      {canWrite && (
                        <label className="mt-0.5 flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(inv.id)}
                            disabled={busy}
                            aria-label={`Seleccionar factura ${inv.number}`}
                            className="h-5 w-5 rounded border-slate-300 text-brand focus:ring-brand dark:border-brand-200/40 dark:bg-brand-900"
                          />
                        </label>
                      )}
                      <div>
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="text-base font-bold text-brand hover:underline dark:text-brand-100"
                        >
                          {inv.number}
                        </Link>
                        <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-brand-50">
                          {inv.customer.name}
                        </p>
                      </div>
                    </div>
                    <Badge className={INVOICE_STATUS_COLORS[inv.status]}>
                      {INVOICE_STATUS_LABELS[inv.status]}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-brand-200/10">
                    <div>
                      <span className="text-slate-400">Fecha: </span>
                      <span className="font-medium text-slate-600 dark:text-brand-200">
                        {formatDate(inv.issuedAt || inv.createdAt)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Total: </span>
                      <span className="font-bold text-slate-900 dark:text-brand-50">
                        {formatCOP(inv.total)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400">Saldo: </span>
                      <span
                        className={`text-xs font-bold ${
                          balance > 0
                            ? "text-amber-600 dark:text-gold"
                            : "text-slate-500"
                        }`}
                      >
                        {formatCOP(balance)}
                      </span>
                    </div>
                    {canWrite && (
                      <InvoiceRowActions
                        id={inv.id}
                        status={inv.status}
                        number={inv.number}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabla de escritorio y tablet (>= 640px) */}
          <div className="hidden sm:block">
            <Table>
              <thead className="bg-slate-50 dark:bg-brand-900/40">
                <tr>
                  {canWrite && (
                    <th className="w-10 whitespace-nowrap px-3 py-3 text-center sm:px-4">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeSelected;
                        }}
                        onChange={toggleSelectAll}
                        disabled={busy}
                        aria-label="Seleccionar todas las facturas"
                        className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-brand-200/40 dark:bg-brand-900"
                      />
                    </th>
                  )}
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Número
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Cliente
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Fecha
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Estado
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Total
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Saldo
                  </th>
                  {canWrite && (
                    <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-brand-200/10">
                {invoices.map((inv) => {
                  const isSelected = selectedIds.includes(inv.id);
                  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
                  const balance =
                    inv.status === "void" ? 0 : Math.max(0, inv.total - paid);

                  return (
                    <tr
                      key={inv.id}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-amber-50/70 dark:bg-brand-800/50"
                          : "hover:bg-slate-50/50 dark:hover:bg-brand-800/20"
                      }`}
                    >
                      {canWrite && (
                        <td className="w-10 px-3 py-3 text-center sm:px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(inv.id)}
                            disabled={busy}
                            aria-label={`Seleccionar factura ${inv.number}`}
                            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-brand-200/40 dark:bg-brand-900"
                          />
                        </td>
                      )}
                      <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium text-brand hover:underline dark:text-brand-100"
                        >
                          {inv.number}
                        </Link>
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-3 sm:max-w-none sm:px-4">
                        {inv.customer.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                        {formatDate(inv.issuedAt || inv.createdAt)}
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <Badge className={INVOICE_STATUS_COLORS[inv.status]}>
                          {INVOICE_STATUS_LABELS[inv.status]}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right sm:px-4">
                        {formatCOP(inv.total)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right sm:px-4">
                        {formatCOP(balance)}
                      </td>
                      {canWrite && (
                        <td className="px-3 py-3 text-right sm:px-4">
                          <InvoiceRowActions
                            id={inv.id}
                            status={inv.status}
                            number={inv.number}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
