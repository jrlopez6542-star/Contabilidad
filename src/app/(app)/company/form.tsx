"use client";

import { useState } from "react";
import { updateCompanyAction } from "@/actions/company";
import { Button, Input } from "@/components/ui";
import { CompanyLogo } from "@/components/company-logo";
import {
  companyLogoSrc,
  DEFAULT_LOGO,
  isDataImageUrl,
  isEphemeralUploadPath,
} from "@/lib/branding";

type Company = {
  name: string;
  nit: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  quotePrefix?: string;
  nextQuoteNumber?: number;
  unpaidAlertDays?: number;
  stockAlertEmails?: string;
  cashCloseEmails?: string;
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
        placeholder="Buñuelandia"
        defaultValue={company?.name || "Buñuelandia"}
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

      <div className="space-y-2 rounded-lg border border-brand/15 bg-cream-muted p-3">
        <p className="text-sm font-medium text-slate-800">Logo / marca</p>
        {company?.logoUrl ? (
          <div className="flex items-center gap-3">
            <CompanyLogo
              src={company.logoUrl}
              alt="Logo actual"
              className="h-12 w-12 rounded-lg object-contain ring-1 ring-slate-200 bg-white"
            />
            <p className="truncate text-xs text-slate-500">
              {company.logoUrl.startsWith("data:image/")
                ? "Imagen embebida (guardada en la base de datos)"
                : isEphemeralUploadPath(company.logoUrl)
                  ? `Ruta antigua no válida en Vercel → se usará ${DEFAULT_LOGO}`
                  : company.logoUrl}
            </p>
          </div>
        ) : null}
        <Input
          label="URL o ruta del logo (opcional)"
          name="logoUrl"
          placeholder={DEFAULT_LOGO}
          defaultValue={
            company?.logoUrl && isDataImageUrl(company.logoUrl)
              ? ""
              : company?.logoUrl && isEphemeralUploadPath(company.logoUrl)
                ? DEFAULT_LOGO
                : companyLogoSrc(company?.logoUrl)
          }
          disabled={readOnly}
        />
        {!readOnly && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Subir imagen (máx. ~1.5 MB; se guarda en la base de datos)
            </span>
            <input
              type="file"
              name="logoFile"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand hover:file:bg-brand-100"
            />
          </label>
        )}
        <p className="text-xs text-slate-500">
          La imagen se almacena como data URL en la empresa (funciona en Vercel).
          También puede usar una ruta como{" "}
          <code className="rounded bg-white px-1">{DEFAULT_LOGO}</code>.
          Deje la URL vacía para conservar el logo actual.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Prefijo factura"
          name="invoicePrefix"
          defaultValue={company?.invoicePrefix || "FV"}
          disabled={readOnly}
        />
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Próximo nº factura</p>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {company?.nextInvoiceNumber ?? 1}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Prefijo cotización"
          name="quotePrefix"
          defaultValue={company?.quotePrefix || "COT"}
          disabled={readOnly}
        />
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Próximo nº cotización</p>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {company?.nextQuoteNumber ?? 1}
          </p>
        </div>
      </div>
      <Input
        label="Días para alerta de facturas vencidas"
        name="unpaidAlertDays"
        type="number"
        min={1}
        defaultValue={company?.unpaidAlertDays ?? 30}
        disabled={readOnly}
      />

      <div className="space-y-3 rounded-lg border border-brand/15 bg-cream-muted p-3 dark:border-brand-200/25 dark:bg-brand-900/40">
        <p className="text-sm font-medium text-slate-800 dark:text-brand-100">
          Correos de notificación (separados por coma)
        </p>
        <Input
          label="Correos alerta de stock"
          name="stockAlertEmails"
          placeholder="bodega@empresa.com, admin@empresa.com"
          defaultValue={company?.stockAlertEmails || ""}
          disabled={readOnly}
        />
        <p className="text-xs text-slate-500 dark:text-brand-200/80">
          Destinatarios de alerta cuando el stock llega al mínimo. Alternativa: STOCK_ALERT_EMAILS.
        </p>
        <Input
          label="Correos cierre de caja"
          name="cashCloseEmails"
          placeholder="caja@empresa.com, contador@empresa.com"
          defaultValue={company?.cashCloseEmails || ""}
          disabled={readOnly}
        />
        <p className="text-xs text-slate-500 dark:text-brand-200/80">
          Destinatarios del aviso al cerrar la caja del día (no se mezclan con stock). Alternativa: CASH_CLOSE_EMAILS.
        </p>
      </div>

      {error && <p className="text-sm text-jam">{error}</p>}
      {msg && <p className="text-sm text-brand">{msg}</p>}
      {!readOnly && <Button type="submit">Guardar</Button>}
    </form>
  );
}
