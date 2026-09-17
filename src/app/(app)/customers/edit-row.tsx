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
        label="Correo"
        name="email"
        type="email"
        defaultValue={customer.email}
      />
      <Input label="Teléfono" name="phone" defaultValue={customer.phone} />
      <div className="sm:col-span-2">
        <Textarea
          label="Dirección"
          name="address"
          rows={2}
          defaultValue={customer.address}
        />
      </div>
      {error && <p className="text-sm text-jam sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
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

  return (
    <>
      <tr>
        <td className="px-3 py-3 sm:px-4">
          <p className="font-medium">{customer.name}</p>
          {customer.address && (
            <p className="text-xs text-slate-500">{customer.address}</p>
          )}
        </td>
        <td className="px-3 py-3 sm:px-4 font-mono text-xs">{customer.nit}</td>
        <td className="hidden px-3 py-3 sm:table-cell sm:px-4">
          {customer.email || "—"}
        </td>
        <td className="px-3 py-3 sm:px-4">{customer.phone || "—"}</td>
        <td className="hidden px-3 py-3 md:table-cell sm:px-4 text-center tabular-nums text-slate-600">
          {customer.invoiceCount ?? 0}
        </td>
        {canWrite && (
          <td className="px-3 py-3 sm:px-4 text-right">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpen((v) => !v);
                  setError(null);
                }}
                className="text-xs font-medium text-brand hover:underline"
              >
                {open ? "Cerrar" : "Editar"}
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="text-xs font-medium text-jam hover:underline disabled:opacity-50"
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
          <td colSpan={canWrite ? 6 : 5} className="bg-slate-50 px-3 py-4 sm:px-4">
            <CustomerEditFields
              customer={customer}
              onDone={() => setOpen(false)}
            />
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

  return (
    <div className="rounded-xl border border-brand/10 bg-surface p-4 shadow-sm dark:border-brand-200/15">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-brand dark:text-brand-100 truncate">
            {customer.name}
          </p>
          <p className="mt-0.5 font-mono text-xs text-slate-600 dark:text-brand-200">
            {customer.nit}
          </p>
          {customer.phone && (
            <p className="mt-1 text-sm text-slate-600 dark:text-brand-200">
              {customer.phone}
            </p>
          )}
          {(customer.invoiceCount ?? 0) > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {customer.invoiceCount} factura
              {(customer.invoiceCount ?? 0) === 1 ? "" : "s"}
            </p>
          )}
        </div>
        {canWrite && (
          <div className="flex shrink-0 flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen((v) => !v);
                setError(null);
              }}
              className="text-xs font-medium text-brand hover:underline"
            >
              {open ? "Cerrar" : "Editar"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="text-xs font-medium text-jam hover:underline disabled:opacity-50"
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
