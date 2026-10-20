import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCOP, formatDate } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = (params.id || "").trim();
    if (!rawId) {
      return new NextResponse("ID de factura inválido", { status: 400 });
    }

    const [invoice, company] = await Promise.all([
      prisma.invoice.findFirst({
        where: {
          OR: [{ id: rawId }, { number: rawId }],
        },
        include: { customer: true, items: true, payments: true },
      }),
      prisma.company.findFirst(),
    ]);

    if (!invoice) {
      return new NextResponse("Factura no encontrada", { status: 404 });
    }

    const companyName = company?.name || "Buñuelandia";
    const companyNit = company?.nit || "900.000.000-0";
    const companyPhone = company?.phone || "";
    const pdfUrl = `/api/invoices/public/${invoice.id}/pdf`;
    const issueDate = invoice.issuedAt || invoice.createdAt;
    const formattedDate = formatDate(issueDate);

    // Extraer Entrega específica de la orden desde invoice.notes para aislar datos
    let orderAddress = "";
    const isWhatsAppOrder = (invoice.notes || "").includes("Pedido WhatsApp:");
    if (invoice.notes) {
      const entregaMatch = invoice.notes.match(/(?:^|·\s*)Entrega:\s*([^·]+)/);
      if (entregaMatch) {
        orderAddress = entregaMatch[1].trim();
      }
    }
    const displayAddress = isWhatsAppOrder ? orderAddress : (invoice.customer?.address || "");

    const itemsHtml = invoice.items
      .map(
        (it) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 8px; text-align: left; font-size: 14px; color: #1e293b;">
            <div style="font-weight: 600;">${escapeHtml(it.description)}</div>
            <div style="font-size: 12px; color: #64748b;">Cant: ${it.quantity} × ${formatCOP(it.unitPrice)}</div>
          </td>
          <td style="padding: 12px 8px; text-align: right; font-weight: 600; font-size: 14px; color: #0f172a;">
            ${formatCOP(it.lineTotal)}
          </td>
        </tr>
      `
      )
      .join("");

    const paymentMethodLabel = invoice.paymentMethod
      ? invoice.paymentMethod.toUpperCase()
      : (invoice.payments[0]?.method || "PAGADO").toUpperCase();

    const isPaid = invoice.status === "paid";
    const statusBadgeText = isPaid ? "Factura Pagada" : "Factura Emitida";
    const statusBadgeBg = isPaid ? "#10b981" : "#f59e0b";
    const totalRowLabel = isPaid ? "TOTAL PAGADO" : "TOTAL A COBRAR";

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura Oficial ${escapeHtml(invoice.number)} - ${escapeHtml(companyName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 16px;
      display: flex;
      justify-content: center;
    }
    .container {
      width: 100%;
      max-width: 540px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #111b21 0%, #1a2730 100%);
      color: #ffffff;
      padding: 24px 20px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: #10b981;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .invoice-num {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .company-title {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 4px;
    }
    .body {
      padding: 20px;
    }
    .meta-box {
      background: #f1f5f9;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 20px;
      font-size: 13px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .meta-row:last-child {
      margin-bottom: 0;
    }
    .meta-label {
      color: #64748b;
      font-weight: 500;
    }
    .meta-val {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .totals-box {
      border-top: 2px dashed #cbd5e1;
      padding-top: 14px;
      margin-bottom: 24px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 20px;
      font-weight: 800;
      color: #059669;
    }
    .btn-download {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px;
      background: #007aff;
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 122, 255, 0.25);
      transition: background 0.2s;
    }
    .btn-download:hover {
      background: #0062cc;
    }
    .footer {
      text-align: center;
      padding: 16px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge" style="background: ${statusBadgeBg};">${statusBadgeText}</div>
      <div class="invoice-num">Factura #${escapeHtml(invoice.number)}</div>
      <div class="company-title">${escapeHtml(companyName)} · NIT ${escapeHtml(companyNit)}</div>
    </div>

    <div class="body">
      <div class="meta-box">
        <div class="meta-row">
          <span class="meta-label">Fecha de emisión:</span>
          <span class="meta-val">${escapeHtml(formattedDate)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Cliente:</span>
          <span class="meta-val">${escapeHtml(invoice.customer?.name || "Cliente General")}</span>
        </div>
        ${displayAddress ? `
        <div class="meta-row">
          <span class="meta-label">Dirección:</span>
          <span class="meta-val">${escapeHtml(displayAddress)}</span>
        </div>` : ""}
        <div class="meta-row">
          <span class="meta-label">Método de pago:</span>
          <span class="meta-val">${escapeHtml(paymentMethodLabel)}</span>
        </div>
      </div>

      <table>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="totals-box">
        <div class="total-row">
          <span style="font-size: 15px; color: #475569; font-weight: 700;">${totalRowLabel}</span>
          <span>${formatCOP(invoice.total)}</span>
        </div>
      </div>

      <a href="${pdfUrl}" class="btn-download" download="Factura_${escapeHtml(invoice.number)}.pdf">
        <span>Descargar Factura Oficial en PDF</span>
        <span>📥</span>
      </a>
    </div>

    <div class="footer">
      🥟 ¡Gracias por comprar en <strong>${escapeHtml(companyName)}</strong>! ${escapeHtml(companyPhone ? `· Tel: ${companyPhone}` : "")}
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("[public invoice html]", err);
    return new NextResponse("Error al cargar la factura", { status: 500 });
  }
}
