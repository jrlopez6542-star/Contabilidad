"use client";

import { useMemo, useState } from "react";
import { EmptyState, Input, Table } from "@/components/ui";
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

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) => {
      const hay = [c.name, c.nit, c.phone, c.email]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [customers, q]);

  const countLabel =
    filtered.length === 1
      ? "1 cliente"
      : `${filtered.length} clientes`;

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 -mx-1 space-y-2 bg-cream/95 px-1 py-2 backdrop-blur-sm dark:bg-brand-950/95 sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none dark:sm:bg-transparent">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600 dark:text-brand-200">
            {countLabel}
            {q.trim() && customers.length !== filtered.length && (
              <span className="font-normal text-slate-400">
                {" "}
                de {customers.length}
              </span>
            )}
          </p>
          <div className="w-full sm:max-w-xs">
            <Input
              label=""
              name="customer-search"
              type="search"
              placeholder="Buscar por nombre, NIT, teléfono o correo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          message={
            q.trim()
              ? "Ningún cliente coincide con la búsqueda."
              : "Aún no hay clientes. Registre el primero para facturar."
          }
        />
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {filtered.map((c) => (
              <CustomerMobileCard
                key={c.id}
                canWrite={canWrite}
                customer={c}
              />
            ))}
          </div>

          <div className="hidden sm:block">
            <Table>
              <thead className="bg-slate-50 dark:bg-brand-900/40">
                <tr>
                  <th className="px-3 py-3 sm:px-4 text-left font-medium text-slate-600 dark:text-brand-200">
                    Nombre
                  </th>
                  <th className="px-3 py-3 sm:px-4 text-left font-medium text-slate-600 dark:text-brand-200">
                    NIT/CC
                  </th>
                  <th className="hidden px-3 py-3 sm:table-cell sm:px-4 text-left font-medium text-slate-600 dark:text-brand-200">
                    Correo
                  </th>
                  <th className="px-3 py-3 sm:px-4 text-left font-medium text-slate-600 dark:text-brand-200">
                    Teléfono
                  </th>
                  <th className="hidden px-3 py-3 md:table-cell sm:px-4 text-center font-medium text-slate-600 dark:text-brand-200">
                    Facturas
                  </th>
                  {canWrite && (
                    <th className="px-3 py-3 sm:px-4 text-right font-medium text-slate-600 dark:text-brand-200" />
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
    </div>
  );
}
