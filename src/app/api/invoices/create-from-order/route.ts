import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcTotals, LineInput } from "@/lib/invoices";
import { decreaseStockForItems } from "@/lib/inventory";
import { decreasePackagingForItems } from "@/lib/packaging";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const BOT_INVOICE_SECRET =
  process.env.BOT_INVOICE_SECRET || "bunuelandia-secret-bot-key-2026";

function normalizePaymentMethod(raw: string): "efectivo" | "transferencia" {
  const m = (raw || "").trim().toLowerCase();
  if (
    m.includes("nequi") ||
    m.includes("bre-b") ||
    m.includes("breb") ||
    m.includes("transf") ||
    m.includes("bancolombia") ||
    m.includes("daviplata")
  ) {
    return "transferencia";
  }
  return "efectivo";
}

interface OrderItemInput {
  sku?: string;
  name?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
}

interface CreateOrderInvoiceBody {
  orderId?: string;
  customerName?: string;
  phone?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  paymentMethod?: string;
  changeAmount?: string;
  items: OrderItemInput[];
  deliveryFee?: number;
  total?: number;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validar autenticación con token secreto
    const apiKeyHeader =
      req.headers.get("x-bot-api-key") || req.headers.get("x-api-key");
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
    const providedSecret = apiKeyHeader || bearerToken;

    if (!providedSecret || providedSecret !== BOT_INVOICE_SECRET) {
      return NextResponse.json(
        { error: "No autorizado. Token de API inválido o ausente." },
        { status: 401 }
      );
    }

    // 2. Parsear el cuerpo de la solicitud
    const body = (await req.json()) as CreateOrderInvoiceBody;
    const {
      orderId,
      customerName,
      phone,
      deliveryAddress,
      deliveryNotes,
      paymentMethod = "efectivo",
      changeAmount,
      items = [],
      deliveryFee = 0,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "La orden no contiene items para facturar." },
        { status: 400 }
      );
    }

    const normPaymentMethod = normalizePaymentMethod(paymentMethod);
    const cleanPhone = (phone || "").replace(/[^0-9]/g, "");

    // 3. Buscar o crear cliente (fuera de la transacción para máxima velocidad)
    let customer = null;
    if (cleanPhone) {
      customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: { contains: cleanPhone.slice(-10) } },
            { nit: cleanPhone },
          ],
        },
      });
    }
    if (!customer && customerName) {
      customer = await prisma.customer.findFirst({
        where: { name: { equals: customerName } },
      });
    }

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName || `Cliente WhatsApp ${cleanPhone.slice(-4) || "General"}`,
          nit: cleanPhone || `CC-${Date.now().toString().slice(-6)}`,
          phone: cleanPhone,
          address: deliveryAddress || "",
          email: "",
        },
      });
    } else {
      const updates: { phone?: string; address?: string } = {};
      if (!customer.phone && cleanPhone) updates.phone = cleanPhone;
      if ((!customer.address || customer.address === "") && deliveryAddress) {
        updates.address = deliveryAddress;
      }
      if (Object.keys(updates).length > 0) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: updates,
        });
      }
    }

    // 4. Preparar productos e insumos de empaque
    try {
      const supplyC4 = await prisma.supply.findUnique({ where: { code: "C4" } });
      if (!supplyC4) {
        await prisma.supply.create({
          data: {
            code: "C4",
            name: "Cajas x4",
            unit: "unidad",
            quantity: 500,
            minStock: 20,
          },
        });
      } else if (supplyC4.quantity < 50) {
        await prisma.supply.update({
          where: { id: supplyC4.id },
          data: { quantity: supplyC4.quantity + 500 },
        });
      }
    } catch {
      // Si la tabla supply no está disponible
    }

    const lineInputs: LineInput[] = [];

    for (const item of items) {
      const itemSku = (item.sku || "").trim().toUpperCase();
      const itemName = item.name || item.description || itemSku || "Producto Buñuelandia";
      const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
      const unitPrice = Math.max(0, Math.round(Number(item.unitPrice) || 0));

      let product = null;
      if (itemSku) {
        product = await prisma.product.findUnique({ where: { sku: itemSku } });
      }
      if (!product && itemName) {
        product = await prisma.product.findFirst({
          where: { name: { equals: itemName } },
        });
      }

      if (!product) {
        product = await prisma.product.create({
          data: {
            sku: itemSku || `P-${Date.now().toString().slice(-6)}`,
            name: itemName,
            price: unitPrice,
            ivaRate: 0,
            stock: 100,
            minStock: 5,
            trackStock: false,
            active: true,
          },
        });
      } else if (product.trackStock && product.stock < quantity) {
        await prisma.product.update({
          where: { id: product.id },
          data: { stock: product.stock + quantity + 50 },
        });
      }

      lineInputs.push({
        productId: product.id,
        description: itemName,
        quantity,
        unitPrice,
        ivaRate: product.ivaRate || 0,
      });
    }

    // Agregar servicio de domicilio si aplica
    if (deliveryFee && deliveryFee > 0) {
      lineInputs.push({
        productId: null,
        description: "Servicio de Domicilio",
        quantity: 1,
        unitPrice: Math.round(deliveryFee),
        ivaRate: 0,
      });
    }

    // 5. Calcular totales
    const { items: computed, subtotal, ivaTotal, total: calculatedTotal } =
      calcTotals(lineInputs);

    // 6. Transacción atómica ultrarrápida con timeout extendido
    const invoice = await prisma.$transaction(
      async (tx) => {
        let company = await tx.company.findFirst();
        if (!company) {
          company = await tx.company.create({
            data: {
              name: "Buñuelandia",
              nit: "900000000-0",
              logoUrl: "/logo-bunuelandia.png",
            },
          });
        }
        const number = `${company.invoicePrefix}-${String(
          company.nextInvoiceNumber
        ).padStart(4, "0")}`;

        await tx.company.update({
          where: { id: company.id },
          data: { nextInvoiceNumber: company.nextInvoiceNumber + 1 },
        });

        const notesParts: string[] = [];
        if (orderId) notesParts.push(`Pedido WhatsApp: #${orderId.slice(0, 8)}`);
        if (deliveryAddress) notesParts.push(`Entrega: ${deliveryAddress}`);
        if (deliveryNotes) notesParts.push(`Notas: ${deliveryNotes}`);
        if (changeAmount) notesParts.push(`Pago: ${changeAmount}`);
        const notes = notesParts.join(" · ");

        const createdInvoice = await tx.invoice.create({
          data: {
            number,
            customerId: customer.id,
            notes,
            paymentMethod: normPaymentMethod,
            status: "paid",
            issuedAt: new Date(),
            subtotal,
            ivaTotal,
            total: calculatedTotal,
            items: {
              create: computed.map((i) => ({
                productId: i.productId || null,
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                ivaRate: i.ivaRate,
                lineSubtotal: i.lineSubtotal,
                lineIva: i.lineIva,
                lineTotal: i.lineTotal,
              })),
            },
          },
        });

        try {
          const stockMeta = {
            reason: `Venta WhatsApp ${number}`,
            refType: "invoice" as const,
            refId: createdInvoice.id,
            refNumber: number,
            userEmail: "bot@whatsapp",
          };
          await decreaseStockForItems(tx, computed, stockMeta);
        } catch (err) {
          console.warn("[bot-invoice] Error descontando stock:", err);
        }

        try {
          await decreasePackagingForItems(tx, computed, {
            reason: `Empaque WhatsApp ${number}`,
            refNumber: number,
            userEmail: "bot@whatsapp",
          });
        } catch (err) {
          console.warn("[bot-invoice] Error descontando empaques:", err);
        }

        await tx.payment.create({
          data: {
            invoiceId: createdInvoice.id,
            amount: calculatedTotal,
            method: normPaymentMethod,
            paidAt: new Date(),
            notes: changeAmount
              ? `WhatsApp: ${changeAmount}`
              : `Pago registrado vía WhatsApp (${paymentMethod})`,
          },
        });

        return createdInvoice;
      },
      {
        maxWait: 10000,
        timeout: 25000,
      }
    );

    // 7. Registrar en auditoría
    await writeAudit(
      null,
      "issue",
      "invoice",
      invoice.id,
      `Emitió factura ${invoice.number} (${normPaymentMethod}) automáticamente desde WhatsApp`
    );

    const appBaseUrl =
      process.env.APP_URL || "https://contabilidad-app-fawn.vercel.app";

    return NextResponse.json({
      ok: true,
      invoiceNumber: invoice.number,
      invoiceId: invoice.id,
      total: calculatedTotal,
      customerName: customer.name,
      invoiceUrl: `${appBaseUrl}/api/invoices/public/${invoice.id}`,
      invoicePdfUrl: `${appBaseUrl}/api/invoices/public/${invoice.id}/pdf`,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Error interno al crear factura.";
    console.error("[bot-invoice] Error creando factura desde WhatsApp:", err);
    return NextResponse.json(
      {
        ok: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
