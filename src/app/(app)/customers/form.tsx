"use client";

import { useState } from "react";
import { createCustomerAction } from "@/actions/customers";
import { Button, Input, Textarea } from "@/components/ui";

export function CustomerForm() {
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    setMsg(null);
    setPending(true);
    try {
      const formData = new FormData(form);
      const res = await createCustomerAction(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setMsg("Cliente creado.");
      form.reset();
    } catch (err) {
      console.error(err);
      setError("No se pudo crear el cliente. Intente de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form id="customer-form" onSubmit={onSubmit} className="space-y-3">
      <Input label="Nombre / Razón social" name="name" required />
      <Input label="NIT o CC" name="nit" required />
      <Input label="Correo" name="email" type="email" />
      <Input label="Teléfono" name="phone" />
      <Textarea label="Dirección" name="address" rows={2} />
      {error && <p className="text-sm text-jam">{error}</p>}
      {msg && <p className="text-sm text-brand">{msg}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creando…" : "Crear"}
      </Button>
    </form>
  );
}
