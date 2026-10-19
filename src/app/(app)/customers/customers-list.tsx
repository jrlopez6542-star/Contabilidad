"use client";

import { useMemo, useState } from "react";
import { Button, EmptyState, Table } from "@/components/ui";
import { Modal } from "@/components/modal";
import { CustomerForm } from "./form";
import {
  CustomerEditRow,
  CustomerMobileCard,
  type CustomerListItem,
} from "./edit-row";

export function CustomersList({
  customers,
  canWrite,
}: {
  customers: CustomerListItem[];
  canWrite: boolean;
}) {
  const [q, setQ] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) => {
      const hay = [c.name, c.nit, c.phone, c.email, c.address]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [customers, q]);

  const totalWithInvoices = useMemo(
    () => customers.filter((c) => (c.invoiceCount ?? 0) > 0).length,
    [customers]
  );

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand dark:text-brand-100 sm:text-3xl">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-brand-200">
            {canWrite
              ? "Directorio general de clientes, NIT/CC, datos de contacto y facturas asociadas"
              : "Directorio de clientes (modo solo lectura)"}
          </p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto shadow-sm"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Nuevo cliente
            </Button>
          </div>
        )}
      </div>

      {/* Metrics / Quick Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-brand/10 bg-surface p-4 shadow-sm dark:border-brand-200/15">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-brand-200">
            Total clientes
          </p>
          <p className="mt-2 text-2xl font-black text-brand dark:text-brand-100">
            {customers.length}
          </p>
        </div>

        <div className="rounded-2xl border border-brand/10 bg-surface p-4 shadow-sm dark:border-brand-200/15">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-brand-200">
            Con facturación
          </p>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {totalWithInvoices}
          </p>
        </div>

        {q.trim() && (
          <div className="col-span-2 rounded-2xl border border-brand/20 bg-brand-50/50 p-4 shadow-sm dark:bg-brand-900/30 sm:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand dark:text-brand-200">
              Coincidencias
            </p>
            <p className="mt-2 text-2xl font-black text-brand dark:text-brand-100">
              {filtered.length}
            </p>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4 shadow-sm dark:border-brand-200/15 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="search"
            name="customer-search"
            placeholder="Buscar por nombre, NIT, teléfono, correo o dirección…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
            className="w-full min-h-11 rounded-xl border border-slate-200 bg-surface pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-brand-200/25 dark:text-brand-50 dark:placeholder:text-brand-200/50"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
        <div className="text-xs font-medium text-slate-500 dark:text-brand-200 sm:text-right">
          Mostrando {filtered.length} de {customers.length} cliente{customers.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Customer List Content */}
      {filtered.length === 0 ? (
        <EmptyState
          message={
            q.trim()
              ? `No se encontraron clientes que coincidan con «${q}».`
              : "Aún no hay clientes registrados en el sistema."
          }
          action={
            q.trim() ? (
              <Button variant="secondary" onClick={() => setQ("")}>
                Limpiar búsqueda
              </Button>
            ) : canWrite ? (
              <Button onClick={() => setIsModalOpen(true)}>
                Registrar primer cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile list view */}
          <div className="space-y-3 sm:hidden">
            {filtered.map((c) => (
              <CustomerMobileCard
                key={c.id}
                canWrite={canWrite}
                customer={c}
              />
            ))}
          </div>

          {/* Desktop full-width table view */}
          <div className="hidden sm:block w-full">
            <Table>
              <thead className="bg-slate-50/80 dark:bg-brand-900/40">
                <tr>
                  <th className="px-3 py-3 sm:px-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-brand-200">
                    Cliente / Razón Social
                  </th>
                  <th className="px-3 py-3 sm:px-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-brand-200">
                    NIT / CC
                  </th>
                  <th className="px-3 py-3 sm:px-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-brand-200">
                    Teléfono
                  </th>
                  <th className="hidden px-3 py-3 md:table-cell sm:px-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-brand-200">
                    Correo
                  </th>
                  <th className="hidden lg:table-cell px-3 py-3 sm:px-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-brand-200">
                    Dirección
                  </th>
                  <th className="px-3 py-3 sm:px-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-brand-200">
                    Facturas
                  </th>
                  {canWrite && (
                    <th className="px-3 py-3 sm:px-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-brand-200">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-brand-200/10">
                {filtered.map((c) => (
                  <CustomerEditRow
                    key={c.id}
                    canWrite={canWrite}
                    customer={c}
                  />
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}

      {/* Modal for creating a new customer */}
      {canWrite && (
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Nuevo cliente"
          subtitle="Registra los datos de identificación, contacto y dirección del cliente"
          maxWidth="max-w-2xl"
        >
          <CustomerForm
            onSuccess={() => setIsModalOpen(false)}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}
