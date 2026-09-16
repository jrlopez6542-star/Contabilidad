"use client";

import { useState } from "react";
import { updateCustomerAction } from "@/actions/customers";
import { Button, Input, Textarea } from "@/components/ui";

type Customer = {
  id: string;
  name: string;
  nit: string;
  email: string;
  phone: string;
  address: string;
};

export function CustomerEditRow({
  customer,
  canWrite,
}: {
  customer: Customer;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    setMsg(null);
    formData.set("id", customer.id);
    const res = await updateCustomerAction(formData);
    if (res?.error) setError(res.error);
    else {
      setMsg("Cliente actualizado.");
      setOpen(false);
    }
  }

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
        <td className="px-3 py-3 sm:px-4">{customer.email || "—"}</td>
        <td className="px-3 py-3 sm:px-4">{customer.phone || "—"}</td>
        {canWrite && (
          <td className="px-3 py-3 sm:px-4 text-right">
            <button
              type="button"
              onClick={() => {
                setOpen((v) => !v);
                setError(null);
                setMsg(null);
              }}
              className="text-xs font-medium text-brand hover:underline"
            >
              {open ? "Cerrar" : "Editar"}
            </button>
          </td>
        )}
      </tr>
      {canWrite && open && (
        <tr>
          <td colSpan={5} className="bg-slate-50 px-3 py-4 sm:px-4">
            <form action={onSubmit} className="grid gap-3 sm:grid-cols-2">
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
              <Input
                label="Teléfono"
                name="phone"
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
                <p className="text-sm text-jam sm:col-span-2">{error}</p>
              )}
              {msg && (
                <p className="text-sm text-brand sm:col-span-2">{msg}</p>
              )}
              <div className="sm:col-span-2">
                <Button type="submit">Guardar cambios</Button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
