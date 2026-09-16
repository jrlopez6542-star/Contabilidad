/**
 * Daily cash drawer (caja del día) helpers — America/Bogotá.
 * Payment.paidAt is the source of truth for method totals.
 */

import { prisma } from "./prisma";
import { bogotaDayRange } from "./dates";
import { appBaseUrl, sendEmail } from "./email";
import { formatCOP } from "./format";

export type DayBreakdown = {
  efectivo: number;
  transferencia: number;
  tarjeta: number;
  otro: number;
  expensesTotal: number;
  /** Expenses whose category/notes suggest cash outflow (heuristic). */
  cashExpenses: number;
  expectedCash: number;
};

const CASH_EXPENSE_HINT =
  /efectivo|caja|retiro|cambio|petty|cash/i;

export async function getDayBreakdown(dateStr: string): Promise<DayBreakdown> {
  const { start, end } = bogotaDayRange(dateStr);
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: { gte: start, lt: end } },
    }),
    prisma.expense.findMany({
      where: { date: { gte: start, lt: end } },
    }),
  ]);

  const totals = {
    efectivo: 0,
    transferencia: 0,
    tarjeta: 0,
    otro: 0,
  };
  for (const p of payments) {
    const m = (p.method || "otro").toLowerCase();
    if (m === "efectivo") totals.efectivo += p.amount;
    else if (m === "transferencia") totals.transferencia += p.amount;
    else if (m === "tarjeta") totals.tarjeta += p.amount;
    else totals.otro += p.amount;
  }

  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const cashExpenses = expenses
    .filter(
      (e) =>
        CASH_EXPENSE_HINT.test(e.category) || CASH_EXPENSE_HINT.test(e.notes)
    )
    .reduce((s, e) => s + e.amount, 0);

  // Expected cash in drawer ≈ efectivo cobrado − gastos detectados como efectivo
  const expectedCash = totals.efectivo - cashExpenses;

  return {
    ...totals,
    expensesTotal,
    cashExpenses,
    expectedCash,
  };
}

function parseEmails(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

/** Recipients for caja close only — never stockAlertEmails. */
export async function resolveCashCloseRecipients(): Promise<string[]> {
  const company = await prisma.company.findFirst();
  const fromCompany = parseEmails(company?.cashCloseEmails);
  if (fromCompany.length) return fromCompany;
  return parseEmails(process.env.CASH_CLOSE_EMAILS);
}

export async function sendCashCloseEmail(opts: {
  dateStr: string;
  breakdown: DayBreakdown;
  countedCash: number;
  difference: number;
  notes: string;
  closedByEmail: string;
}): Promise<{ sent: boolean; error?: string }> {
  const recipients = await resolveCashCloseRecipients();
  if (recipients.length === 0) {
    console.warn(
      "[caja] No cashCloseEmails / CASH_CLOSE_EMAILS — skip close email"
    );
    return { sent: false, error: "Sin destinatarios de caja." };
  }

  const base = appBaseUrl();
  const subject = `Cierre de caja ${opts.dateStr} — Buñuelandia`;
  const b = opts.breakdown;
  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;color:#1e293b">
      <h2 style="margin:0 0 8px">Cierre de caja — ${opts.dateStr}</h2>
      <p>Cerrado por: <strong>${opts.closedByEmail}</strong></p>
      <ul>
        <li>Efectivo cobrado: <strong>${formatCOP(b.efectivo)}</strong></li>
        <li>Transferencia: ${formatCOP(b.transferencia)}</li>
        <li>Tarjeta: ${formatCOP(b.tarjeta)}</li>
        <li>Otro: ${formatCOP(b.otro)}</li>
        <li>Gastos del día: ${formatCOP(b.expensesTotal)} (efectivo detectado: ${formatCOP(b.cashExpenses)})</li>
        <li>Efectivo esperado: <strong>${formatCOP(b.expectedCash)}</strong></li>
        <li>Efectivo contado: <strong>${formatCOP(opts.countedCash)}</strong></li>
        <li>Diferencia: <strong>${formatCOP(opts.difference)}</strong></li>
      </ul>
      ${opts.notes ? `<p>Notas: ${opts.notes.replace(/</g, "&lt;")}</p>` : ""}
      <p><a href="${base}/caja?date=${opts.dateStr}">Ver caja</a></p>
    </div>
  `;
  const text = [
    `Cierre de caja ${opts.dateStr}`,
    `Cerrado por: ${opts.closedByEmail}`,
    `Efectivo: ${formatCOP(b.efectivo)}`,
    `Transferencia: ${formatCOP(b.transferencia)}`,
    `Tarjeta: ${formatCOP(b.tarjeta)}`,
    `Otro: ${formatCOP(b.otro)}`,
    `Gastos: ${formatCOP(b.expensesTotal)}`,
    `Esperado: ${formatCOP(b.expectedCash)}`,
    `Contado: ${formatCOP(opts.countedCash)}`,
    `Diferencia: ${formatCOP(opts.difference)}`,
    opts.notes ? `Notas: ${opts.notes}` : "",
    `${base}/caja?date=${opts.dateStr}`,
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: string | undefined;
  let anyOk = false;
  for (const to of recipients) {
    const res = await sendEmail({ to, subject, html, text });
    if (res.ok) anyOk = true;
    else lastError = res.error;
  }
  if (!anyOk) {
    console.error("[caja] close email failed", lastError);
    return { sent: false, error: lastError || "No se pudo enviar el correo." };
  }
  return { sent: true };
}
