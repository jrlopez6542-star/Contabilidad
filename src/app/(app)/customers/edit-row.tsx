"use client";

import { useState } from "react";
import {
  deleteCustomerAction,
  updateCustomerAction,
} from "@/actions/customers";
import { Button, Input, Textarea } from "@/components/ui";

export type CustomerListItem = {
  id: string;
  name: string;
  nit: string;
  email: string;
  phone: string;
  address: string;
  invoiceCount?: number;
};

function CustomerEditFields({
  customer,
  onDone,
}: {
  customer: CustomerListItem;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    setPending(true);
    try {
      const formData = new FormData(form);
      formData.set("id", customer.id);
      const res = await updateCustomerAction(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onDone();
    } catch (err) {
      console.error(err);
      setError("No se pudo actualizar el cliente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <Input
        label="Nombre / Razón social"
        name="name"
        required
        defaultValue={customer.name}
      />
      <Input
        label="NIT o CC"
        name="nit"
        required
        defaultValue={customer.nit}
      />
      <Input
        label="Correo electrónico"
        name="email"
        type="email"
        defaultValue={customer.email}
      />
      <Input
        label="Teléfono / Celular"
        name="phone"
        type="tel"
        defaultValue={customer.phone}
      />
      <div className="sm:col-span-2">
        <Textarea
          label="Dirección"
          name="address"
          rows={2}
          defaultValue={customer.address}
        />
      </div>
      {error && (
        <div className="rounded-lg border border-jam/20 bg-jam-50 p-2.5 text-xs font-medium text-jam dark:bg-jam/10 sm:col-span-2">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-2.5 sm:col-span-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onDone}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function useCustomerActions(customer: CustomerListItem) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (
      !confirm(
        `¿Eliminar el cliente «${customer.name}»? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setError(null);
    setDeleting(true);
    try {
      const res = await deleteCustomerAction(customer.id);
      if (res?.error) {
        setError(res.error);
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
      const msg = "No se pudo eliminar el cliente.";
      setError(msg);
      alert(msg);
    } finally {
      setDeleting(false);
    }
  }

  return { open, setOpen, error, setError, deleting, onDelete };
}

export function CustomerEditRow({
  customer,
  canWrite,
}: {
  customer: CustomerListItem;
  canWrite: boolean;
}) {
  const { open, setOpen, error, setError, deleting, onDelete } =
    useCustomerActions(customer);

  const initial = (customer.name.trim().charAt(0) || "?").toUpperCase();

  return (
    <>
      <tr className="hover:bg-brand/5 dark:hover:bg-brand-900/30 transition-colors">
        <td className="px-3 py-3 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 font-bold text-brand dark:bg-brand-800/40 dark:text-brand-100">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-brand-50 truncate">
                {customer.name}
              </p>
            </div>
          </div>
        </td>
        <td className="px-3 py-3 sm:px-4">
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700 dark:bg-brand-900/40 dark:text-brand-200">
            {customer.nit}
          </span>
        </td>
        <td className="px-3 py-3 sm:px-4 text-slate-700 dark:text-brand-100">
          {customer.phone || <span className="text-slate-400">—</span>}
        </td>
        <td className="hidden px-3 py-3 md:table-cell sm:px-4 text-slate-700 dark:text-brand-100">
          {customer.email || <span className="text-slate-400">—</span>}
        </td>
        <td className="hidden lg:table-cell px-3 py-3 sm:px-4 text-xs text-slate-600 dark:text-brand-200">
          {customer.address || <span className="text-slate-400">—</span>}
        </td>
        <td className="px-3 py-3 sm:px-4 text-center">
          {(customer.invoiceCount ?? 0) > 0 ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              {customer.invoiceCount} factura{(customer.invoiceCount ?? 0) === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-brand-300/60">0</span>
          )}
        </td>
        {canWrite && (
          <td className="px-3 py-3 sm:px-4 text-right">
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setOpen((v) => !v);
                  setError(null);
                }}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand-50 dark:hover:bg-brand-900/40"
              >
                {open ? "Cerrar" : "Editar"}
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-jam hover:bg-jam/10 disabled:opacity-50"
              >
                {deleting ? "…" : "Eliminar"}
              </button>
            </div>
            {error && !open && (
              <p className="mt-1 text-xs text-jam">{error}</p>
            )}
          </td>
        )}
      </tr>
      {canWrite && open && (
        <tr>
          <td
            colSpan={canWrite ? 7 : 6}
            className="bg-slate-50/80 p-4 sm:p-6 dark:bg-brand-900/20"
          >
            <div className="rounded-xl border border-brand/10 bg-surface p-4 shadow-sm dark:border-brand-200/15">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-brand dark:text-brand-100">
                  Editar cliente: {customer.name}
                </h3>
                <span className="font-mono text-xs text-slate-400">
                  NIT: {customer.nit}
                </span>
              </div>
              <CustomerEditFields
                customer={customer}
                onDone={() => setOpen(false)}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function CustomerMobileCard({
  customer,
  canWrite,
}: {
  customer: CustomerListItem;
  canWrite: boolean;
}) {
  const { open, setOpen, error, setError, deleting, onDelete } =
    useCustomerActions(customer);

  const initial = (customer.name.trim().charAt(0) || "?").toUpperCase();

  return (
    <div className="rounded-xl border border-brand/10 bg-surface p-4 shadow-sm dark:border-brand-200/15">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 font-bold text-brand dark:bg-brand-800/40 dark:text-brand-100">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-brand dark:text-brand-100 truncate">
              {customer.name}
            </p>
            <p className="mt-0.5 font-mono text-xs text-slate-600 dark:text-brand-200">
              NIT: {customer.nit}
            </p>
            {customer.phone && (
              <p className="mt-1 text-xs text-slate-600 dark:text-brand-200">
                Tel: {customer.phone}
              </p>
            )}
            {customer.email && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-brand-300 truncate">
                {customer.email}
              </p>
            )}
            {customer.address && (
              <p className="mt-1 text-xs text-slate-500 italic">
                {customer.address}
              </p>
            )}
            {(customer.invoiceCount ?? 0) > 0 && (
              <p className="mt-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {customer.invoiceCount} factura
                {(customer.invoiceCount ?? 0) === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>
        {canWrite && (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen((v) => !v);
                setError(null);
              }}
              className="rounded-lg px-2 py-1 text-xs font-medium text-brand hover:bg-brand-50"
            >
              {open ? "Cerrar" : "Editar"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="rounded-lg px-2 py-1 text-xs font-medium text-jam hover:bg-jam/10 disabled:opacity-50"
            >
              {deleting ? "…" : "Eliminar"}
            </button>
          </div>
        )}
      </div>
      {error && !open && (
        <p className="mt-2 text-xs text-jam">{error}</p>
      )}
      {canWrite && open && (
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-brand-200/15">
          <CustomerEditFields
            customer={customer}
            onDone={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
