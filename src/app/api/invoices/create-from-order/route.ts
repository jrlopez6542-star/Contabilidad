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

    const result = await prisma.$transaction(async (tx) => {
      // 3. Buscar o crear cliente
      let customer = null;
      if (cleanPhone) {
        customer = await tx.customer.findFirst({
          where: {
            OR: [
              { phone: { contains: cleanPhone.slice(-10) } },
              { nit: cleanPhone },
            ],
          },
        });
      }
      if (!customer && customerName) {
        customer = await tx.customer.findFirst({
          where: { name: { equals: customerName } },
        });
      }

      if (!customer) {
        customer = await tx.customer.create({
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
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: updates,
          });
        }
      }

      // 4. Preparar productos e insumos de empaque
      // Aseguramos insumo de cajas C4 en el inventario de insumos para que no falle la deducción de empaque
      try {
        const supplyC4 = await tx.supply.findUnique({ where: { code: "C4" } });
        if (!supplyC4) {
          await tx.supply.create({
            data: {
              code: "C4",
              name: "Cajas x4",
              unit: "unidad",
              quantity: 500,
              minStock: 20,
            },
          });
        } else if (supplyC4.quantity < 50) {
          await tx.supply.update({
            where: { id: supplyC4.id },
            data: { quantity: supplyC4.quantity + 500 },
          });
        }
      } catch {
        // En caso de que la tabla supply no esté disponible en algún entorno
      }

      const lineInputs: LineInput[] = [];

      for (const item of items) {
        const itemSku = (item.sku || "").trim().toUpperCase();
        const itemName = item.name || item.description || itemSku || "Producto Buñuelandia";
        const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
        const unitPrice = Math.max(0, Math.round(Number(item.unitPrice) || 0));

        let product = null;
        if (itemSku) {
          product = await tx.product.findUnique({ where: { sku: itemSku } });
        }
        if (!product && itemName) {
          product = await tx.product.findFirst({
            where: { name: { equals: itemName } },
          });
        }

        // Si no existe el producto en Contabilidad, crearlo automáticamente para sincronizar el catálogo
        if (!product) {
          product = await tx.product.create({
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
          // Si maneja inventario pero no tiene stock suficiente, reabastecemos para registrar la venta real
          await tx.product.update({
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

      // Si hay tarifa de domicilio, agregar como ítem de servicio
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

      // 6. Obtener número de factura oficial (FV-XXXX)
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

      // 7. Construir notas informativas
      const notesParts: string[] = [];
      if (orderId) notesParts.push(`Pedido WhatsApp: #${orderId.slice(0, 8)}`);
      if (deliveryAddress) notesParts.push(`Entrega: ${deliveryAddress}`);
      if (deliveryNotes) notesParts.push(`Notas: ${deliveryNotes}`);
      if (changeAmount) notesParts.push(`Pago: ${changeAmount}`);
      const notes = notesParts.join(" · ");

      // 8. Crear factura en estado 'paid'
      const invoice = await tx.invoice.create({
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

      // 9. Descontar inventario y empaques
      try {
        const stockMeta = {
          reason: `Venta WhatsApp ${number}`,
          refType: "invoice" as const,
          refId: invoice.id,
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

      // 10. Registrar el pago de la factura
      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: calculatedTotal,
          method: normPaymentMethod,
          paidAt: new Date(),
          notes: changeAmount
            ? `WhatsApp: ${changeAmount}`
            : `Pago registrado vía WhatsApp (${paymentMethod})`,
        },
      });

      return {
        invoice,
        customer,
        total: calculatedTotal,
      };
    });

    // 11. Registrar en auditoría
    await writeAudit(
      null,
      "issue",
      "invoice",
      result.invoice.id,
      `Emitió factura ${result.invoice.number} (${normPaymentMethod}) automáticamente desde WhatsApp`
    );

    const appBaseUrl =
      process.env.APP_URL || "https://contabilidad-app-fawn.vercel.app";

    return NextResponse.json({
      ok: true,
      invoiceNumber: result.invoice.number,
      invoiceId: result.invoice.id,
      total: result.total,
      customerName: result.customer.name,
      invoiceUrl: `${appBaseUrl}/invoices/${result.invoice.id}`,
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
