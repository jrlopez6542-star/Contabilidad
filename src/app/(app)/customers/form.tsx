"use client";

import { useState } from "react";
import { createCustomerAction } from "@/actions/customers";
import { Button, Input, Textarea } from "@/components/ui";

export function CustomerForm() {
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const res = await createCustomerAction(formData);
    if (res?.error) setError(res.error);
    else (document.getElementById("customer-form") as HTMLFormElement)?.reset();
  }

  return (
    <form id="customer-form" action={onSubmit} className="space-y-3">
      <Input label="Nombre / Razón social" name="name" required />
      <Input label="NIT o CC" name="nit" required />
      <Input label="Correo" name="email" type="email" />
      <Input label="Teléfono" name="phone" />
      <Textarea label="Dirección" name="address" rows={2} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full">
        Crear
      </Button>
    </form>
  );
}
