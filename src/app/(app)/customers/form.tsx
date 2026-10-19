"use client";

import { useState } from "react";
import { createCustomerAction } from "@/actions/customers";
import { Button, Input, Textarea } from "@/components/ui";

export function CustomerForm({
  onSuccess,
  onCancel,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
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
      setMsg("Cliente creado exitosamente.");
      form.reset();
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 350);
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo crear el cliente. Intente de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form id="customer-form" onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Nombre / Razón social"
          name="name"
          placeholder="Ej: Juan Pérez o Inversiones SAS"
          required
          autoFocus
        />
        <Input
          label="NIT o CC"
          name="nit"
          placeholder="Ej: 1020304050"
          required
        />
        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          placeholder="ejemplo@correo.com"
        />
        <Input
          label="Teléfono / Celular"
          name="phone"
          type="tel"
          placeholder="Ej: 300 123 4567"
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Dirección"
            name="address"
            rows={2}
            placeholder="Calle, carrera, barrio, apartamento..."
          />
        </div>
      </div>
      {error && (
        <div className="rounded-lg border border-jam/20 bg-jam-50 p-2.5 text-xs font-medium text-jam dark:bg-jam/10">
          {error}
        </div>
      )}
      {msg && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {msg}
        </div>
      )}
      <div className="flex items-center justify-end gap-2.5 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={pending}
          >
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Crear cliente"}
        </Button>
      </div>
    </form>
  );
}
