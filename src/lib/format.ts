export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/** Fecha + hora en zona America/Bogota (ticket térmico / comprobantes). */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatDateInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  issued: "Emitida",
  paid: "Pagada",
  void: "Anulada",
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  issued: "bg-gold-100 text-amber-900",
  paid: "bg-brand-100 text-brand",
  void: "bg-jam-100 text-jam",
};

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  converted: "Convertida",
};

export const QUOTE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-gold-100 text-amber-900",
  accepted: "bg-brand-100 text-brand",
  rejected: "bg-jam-100 text-jam",
  converted: "bg-brand-50 text-brand-dark",
};

export const PAYMENT_METHODS = [
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" },
];

/** Métodos al crear/emitir una venta (POS rápido). */
export const SALE_PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
];

export const EXPENSE_CATEGORIES = [
  "Arriendo",
  "Servicios públicos",
  "Nómina",
  "Suministros",
  "Transporte",
  "Marketing",
  "Impuestos",
  "Software",
  "Otros",
];
