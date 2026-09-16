/**
 * Low-stock email alerts.
 *
 * Dedup strategy: notify only when crossing the threshold
 * (previousStock > minStock AND newStock <= minStock). Staying at/below
 * min does not re-send on every subsequent sale/adjust. Manual "Enviar
 * alerta ahora" from the dashboard bypasses this and emails the current list.
 *
 * Recipients: Company.stockAlertEmails (comma-separated), else STOCK_ALERT_EMAILS env.
 * Soft-fail if Resend is missing — never throw into issue/adjust flows.
 */

import { prisma } from "./prisma";
import { appBaseUrl, sendEmail } from "./email";
import type { PackagingCrossEvent } from "./packaging";

export type StockCrossEvent = {
  productId: string;
  sku: string;
  name: string;
  previousStock: number;
  newStock: number;
  minStock: number;
};

function parseEmails(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export async function resolveStockAlertRecipients(): Promise<string[]> {
  const company = await prisma.company.findFirst();
  const fromCompany = parseEmails(company?.stockAlertEmails);
  if (fromCompany.length) return fromCompany;
  return parseEmails(process.env.STOCK_ALERT_EMAILS);
}

export function crossedLowStockThreshold(
  previousStock: number,
  newStock: number,
  minStock: number
): boolean {
  return previousStock > minStock && newStock <= minStock;
}

function buildAlertHtml(
  products: {
    sku: string;
    name: string;
    stock: number;
    minStock: number;
  }[],
  manual: boolean
): { subject: string; html: string; text: string } {
  const base = appBaseUrl();
  const productsUrl = `${base}/products`;
  const subject = "Alerta de stock — Buñuelandia";
  const intro = manual
    ? "Alerta manual de productos con stock bajo:"
    : "Uno o más productos cruzaron el umbral de stock mínimo:";
  const rows = products
    .map(
      (p) =>
        `<li><strong>${escapeHtml(p.sku)}</strong> — ${escapeHtml(p.name)}: stock <strong>${p.stock}</strong> (mín. ${p.minStock})</li>`
    )
    .join("");
  const textLines = products
    .map((p) => `- ${p.sku} — ${p.name}: stock ${p.stock} (mín. ${p.minStock})`)
    .join("\n");
  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;color:#1e293b">
      <p>${intro}</p>
      <ul>${rows}</ul>
      <p><a href="${productsUrl}">Ver productos</a></p>
    </div>
  `;
  const text = `${intro}\n${textLines}\n\nProductos: ${productsUrl}`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Soft-fail email for products that just crossed minStock. */
export async function notifyStockCrossings(
  events: StockCrossEvent[]
): Promise<{ sent: boolean; error?: string }> {
  const crossed = events.filter((e) =>
    crossedLowStockThreshold(e.previousStock, e.newStock, e.minStock)
  );
  if (crossed.length === 0) return { sent: false };

  const recipients = await resolveStockAlertRecipients();
  if (recipients.length === 0) {
    console.warn("[stock-alerts] No recipients configured (stockAlertEmails / STOCK_ALERT_EMAILS)");
    return { sent: false, error: "Sin destinatarios de alerta de stock." };
  }

  const payload = buildAlertHtml(
    crossed.map((e) => ({
      sku: e.sku,
      name: e.name,
      stock: e.newStock,
      minStock: e.minStock,
    })),
    false
  );

  let lastError: string | undefined;
  let anyOk = false;
  for (const to of recipients) {
    const res = await sendEmail({ to, ...payload });
    if (res.ok) anyOk = true;
    else lastError = res.error;
  }
  if (!anyOk) {
    console.error("[stock-alerts] send failed", lastError);
    return { sent: false, error: lastError || "No se pudo enviar el correo." };
  }
  return { sent: true };
}

/** Soft-fail email for packaging supplies that just crossed minStock. */
export async function notifyPackagingLow(
  events: PackagingCrossEvent[]
): Promise<{ sent: boolean; error?: string }> {
  const crossed = events.filter(
    (e) => e.previous > e.minStock && e.after <= e.minStock
  );
  if (crossed.length === 0) return { sent: false };

  const recipients = await resolveStockAlertRecipients();
  if (recipients.length === 0) {
    console.warn(
      "[stock-alerts] No recipients configured (stockAlertEmails / STOCK_ALERT_EMAILS)"
    );
    return { sent: false, error: "Sin destinatarios de alerta de stock." };
  }

  const suppliesUrl = `${appBaseUrl()}/insumos`;
  const subject = "Alerta de cajas de empaque — Buñuelandia";
  const intro = "Cajas de empaque que cruzaron el mínimo de stock:";
  const rows = crossed
    .map(
      (s) =>
        `<li><strong>${escapeHtml(s.code)}</strong> — ${escapeHtml(s.name)}: quedan <strong>${s.after}</strong> (mín. ${s.minStock})</li>`
    )
    .join("");
  const textRows = crossed
    .map((s) => `- ${s.code} — ${s.name}: quedan ${s.after} (mín. ${s.minStock})`)
    .join("\n");
  const payload = {
    subject,
    html: `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#1e293b"><p>${intro}</p><ul>${rows}</ul><p><a href="${suppliesUrl}">Ver insumos</a></p></div>`,
    text: `${intro}\n${textRows}\n\nInsumos: ${suppliesUrl}`,
  };

  let lastError: string | undefined;
  let anyOk = false;
  for (const to of recipients) {
    const res = await sendEmail({ to, ...payload });
    if (res.ok) anyOk = true;
    else lastError = res.error;
  }
  if (!anyOk) {
    console.error("[stock-alerts] packaging send failed", lastError);
    return { sent: false, error: lastError || "No se pudo enviar el correo." };
  }
  return { sent: true };
}

/** Manual dashboard alert: current low-stock list (no threshold dedupe). */
export async function sendManualLowStockAlert(): Promise<{
  ok: boolean;
  error?: string;
  count?: number;
}> {
  const products = await prisma.product.findMany({
    where: { active: true, trackStock: true },
    orderBy: { stock: "asc" },
  });
  const low = products.filter((p) => p.stock <= p.minStock);
  if (low.length === 0) {
    return { ok: false, error: "No hay productos con stock bajo." };
  }

  const recipients = await resolveStockAlertRecipients();
  if (recipients.length === 0) {
    return {
      ok: false,
      error:
        "Configure correos de alerta de stock en Empresa (o STOCK_ALERT_EMAILS).",
    };
  }

  const payload = buildAlertHtml(
    low.map((p) => ({
      sku: p.sku,
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
    })),
    true
  );

  let lastError: string | undefined;
  let anyOk = false;
  for (const to of recipients) {
    const res = await sendEmail({ to, ...payload });
    if (res.ok) anyOk = true;
    else lastError = res.error;
  }
  if (!anyOk) {
    return { ok: false, error: lastError || "No se pudo enviar el correo." };
  }
  return { ok: true, count: low.length };
}

/** Active products with trackStock and stock <= minStock (dashboard / alerts). */
export async function getLowStockProducts() {
  const products = await prisma.product.findMany({
    where: { active: true, trackStock: true },
    orderBy: { stock: "asc" },
  });
  return products.filter((p) => p.stock <= p.minStock);
}

/** Active C4/C10 packaging supplies at or below their positive minimum. */
export async function getLowPackagingSupplies() {
  const supplies = await prisma.supply.findMany({
    where: {
      active: true,
      code: { in: ["C4", "C10"] },
      minStock: { gt: 0 },
    },
    orderBy: { code: "asc" },
  });
  return supplies.filter((s) => s.quantity <= s.minStock);
}
