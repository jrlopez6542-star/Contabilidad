"use client";

import { useState } from "react";
import { updateCompanyAction } from "@/actions/company";
import { Button, Input } from "@/components/ui";

type Company = {
  name: string;
  nit: string;
  address: string;
  phone: string;
  email: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
} | null;

export function CompanyForm({
  company,
  readOnly = false,
}: {
  company: Company;
  readOnly?: boolean;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    if (readOnly) return;
    setMsg(null);
    setError(null);
    const res = await updateCompanyAction(formData);
    if (res?.error) setError(res.error);
    else setMsg("Datos guardados correctamente.");
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <Input
        label="Razón social"
        name="name"
        required
        defaultValue={company?.name || ""}
        disabled={readOnly}
      />
      <Input
        label="NIT"
        name="nit"
        required
        defaultValue={company?.nit || ""}
        disabled={readOnly}
      />
      <Input
        label="Dirección"
        name="address"
        defaultValue={company?.address || ""}
        disabled={readOnly}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Teléfono"
          name="phone"
          defaultValue={company?.phone || ""}
          disabled={readOnly}
        />
        <Input
          label="Correo"
          name="email"
          type="email"
          defaultValue={company?.email || ""}
          disabled={readOnly}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Prefijo factura"
          name="invoicePrefix"
          defaultValue={company?.invoicePrefix || "FV"}
          disabled={readOnly}
        />
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Próximo número</p>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {company?.nextInvoiceNumber ?? 1}
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      {!readOnly && <Button type="submit">Guardar</Button>}
    </form>
  );
}
