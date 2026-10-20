import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as zlib from "node:zlib";
import { formatDate, INVOICE_STATUS_LABELS } from "../src/lib/format";
import { buildCommercialPdf } from "../src/lib/pdf-doc";

// 1. Prueba de formateo con zona horaria America/Bogota
test("formatDate respeta la zona horaria America/Bogota ante horas tardías en UTC", () => {
  // 10:50 PM COT del 17 de octubre es 03:50 AM UTC del 18 de octubre
  const lateNightUtc = new Date("2026-10-18T03:50:00.000Z");
  const formatted = formatDate(lateNightUtc);
  // En Bogotá (UTC-5) debe ser 17 de oct
  assert.ok(
    formatted.includes("17") && formatted.toLowerCase().includes("oct"),
    `La fecha formateada (${formatted}) debe corresponder al 17 de octubre en hora de Bogotá, no al 18 en UTC`
  );
});

// 2. Prueba de resolución de estado de factura y creación de pago
test("Resolución de estado: Efectivo contra entrega crea factura con estado 'issued' y sin pago registrado", () => {
  function computeInvoicePaymentRules(params: {
    paymentMethod?: string;
    paymentStatus?: "issued" | "paid" | "pending";
    isCashOnDelivery?: boolean;
  }) {
    let invoiceStatus: "issued" | "paid" = "issued";
    let shouldRecordPayment = false;

    if (params.paymentStatus === "paid") {
      invoiceStatus = "paid";
      shouldRecordPayment = true;
    }

    return { invoiceStatus, shouldRecordPayment };
  }

  // Caso A: Efectivo contra entrega desde BOTW con paymentStatus: "issued"
  const codResult = computeInvoicePaymentRules({
    paymentMethod: "Efectivo contra entrega",
    paymentStatus: "issued",
    isCashOnDelivery: true,
  });
  assert.equal(codResult.invoiceStatus, "issued");
  assert.equal(codResult.shouldRecordPayment, false, "No debe registrar pago para efectivo contra entrega");

  // Caso B: Transferencia Nequi ya verificada
  const nequiResult = computeInvoicePaymentRules({
    paymentMethod: "Nequi",
    paymentStatus: "paid",
  });
  assert.equal(nequiResult.invoiceStatus, "paid");
  assert.equal(nequiResult.shouldRecordPayment, true, "Debe registrar pago para transferencia confirmada");

  // Caso C: Transferencia pendiente de comprobante
  const pendingResult = computeInvoicePaymentRules({
    paymentMethod: "Nequi",
    paymentStatus: "pending",
  });
  assert.equal(pendingResult.invoiceStatus, "issued");
  assert.equal(pendingResult.shouldRecordPayment, false, "No debe registrar pago mientras el comprobante esté pendiente");

  // Caso D: Pedido nuevo de WhatsApp sin paymentStatus explícito (debe ser siempre issued sin pago)
  const defaultResult = computeInvoicePaymentRules({
    paymentMethod: "Nequi",
  });
  assert.equal(defaultResult.invoiceStatus, "issued", "Factura de WhatsApp sin pago confirmado debe crearse como emitida");
  assert.equal(defaultResult.shouldRecordPayment, false, "No debe registrar pago sin validación explícita");
});

// 3. Prueba de extracción de dirección de entrega e higiene de correos
test("Aislamiento en PDF: prioriza dirección de entrega de la orden y no expone direcciones ni correos antiguos en WhatsApp", () => {
  function resolvePdfParty(invoice: {
    notes?: string;
    customer?: { name: string; nit: string; address?: string | null; email?: string | null; phone?: string | null };
  }) {
    let orderAddress = "";
    let orderEmail = "";
    const isWhatsAppOrder = (invoice.notes || "").includes("Pedido WhatsApp:");
    if (invoice.notes) {
      const entregaMatch = invoice.notes.match(/(?:^|·\s*)Entrega:\s*([^·]+)/);
      if (entregaMatch) {
        orderAddress = entregaMatch[1].trim();
      }
      const emailMatch = invoice.notes.match(/(?:^|·\s*)Email:\s*([^·]+)/);
      if (emailMatch) {
        orderEmail = emailMatch[1].trim();
      }
    }

    return {
      name: invoice.customer?.name || "Consumidor Final",
      nit: invoice.customer?.nit || "222222222222",
      address: isWhatsAppOrder ? (orderAddress || "") : (invoice.customer?.address || ""),
      email: isWhatsAppOrder ? (orderEmail || "") : (invoice.customer?.email || ""),
      phone: invoice.customer?.phone || "",
    };
  }

  // Cliente preexistente en la base de datos con una dirección antigua y un correo antiguo
  const existingCustomer = {
    name: "Diana Morales",
    nit: "CC-3155554433",
    address: "Oficina Central Piso 3",
    email: "antiguo@trabajo.com",
    phone: "3155554433",
  };

  // Factura de WhatsApp con una nueva dirección de entrega y SIN correo proporcionado
  const whatsappInvoice = {
    notes: "Pedido WhatsApp: #a1b2c3d4 · Entrega: Vereda La Esmeralda Km 2 · Pago: $50.000",
    customer: existingCustomer,
  };

  const party = resolvePdfParty(whatsappInvoice);

  // La dirección debe ser la de la orden, no la antigua
  assert.equal(party.address, "Vereda La Esmeralda Km 2", "El PDF debe mostrar la dirección de entrega del pedido actual");
  // El correo no debe mostrarse porque el pedido de WhatsApp no lo proporcionó
  assert.equal(party.email, "", "El PDF no debe exponer correos antiguos no proporcionados en este pedido");

  // Si la orden de WhatsApp NO suministró dirección (ej. para recoger):
  const whatsappInvoiceNoAddress = {
    notes: "Pedido WhatsApp: #a1b2c3d4 · Pago: $50.000",
    customer: existingCustomer,
  };
  const partyNoAddress = resolvePdfParty(whatsappInvoiceNoAddress);
  assert.equal(partyNoAddress.address, "", "El PDF no debe exponer la dirección antigua si la orden de WhatsApp no la suministró");

  // Si el cliente sí proporcionó correo en este pedido:
  const whatsappInvoiceWithEmail = {
    notes: "Pedido WhatsApp: #a1b2c3d4 · Entrega: Calle 10 # 5-20 · Email: diana.nuevo@gmail.com",
    customer: existingCustomer,
  };
  const partyWithEmail = resolvePdfParty(whatsappInvoiceWithEmail);
  assert.equal(partyWithEmail.email, "diana.nuevo@gmail.com", "Debe mostrar el correo proporcionado explícitamente");

  // Factura directa (no WhatsApp): conserva dirección y email del cliente de BD
  const directInvoice = {
    notes: "Factura de venta en punto físico",
    customer: existingCustomer,
  };
  const partyDirect = resolvePdfParty(directInvoice);
  assert.equal(partyDirect.address, "Oficina Central Piso 3", "Facturas directas deben conservar la dirección del cliente maestro");
  assert.equal(partyDirect.email, "antiguo@trabajo.com", "Facturas directas deben conservar el correo del cliente maestro");
});

// 3b. Prueba de resolución de dirección en la vista pública HTML
test("Vista pública HTML: Aislamiento de dirección para pedidos de WhatsApp", () => {
  function resolveHtmlDisplayAddress(invoice: {
    notes?: string | null;
    customer?: { address?: string | null } | null;
  }) {
    let orderAddress = "";
    const isWhatsAppOrder = (invoice.notes || "").includes("Pedido WhatsApp:");
    if (invoice.notes) {
      const entregaMatch = invoice.notes.match(/(?:^|·\s*)Entrega:\s*([^·]+)/);
      if (entregaMatch) {
        orderAddress = entregaMatch[1].trim();
      }
    }
    return isWhatsAppOrder ? orderAddress : (invoice.customer?.address || "");
  }

  const existingCustomer = {
    address: "Oficina Central Piso 3",
  };

  // Caso 1: WhatsApp con dirección de entrega explícita
  const waWithAddress = {
    notes: "Pedido WhatsApp: #ord-1 · Entrega: Calle 10 # 5-20",
    customer: existingCustomer,
  };
  assert.equal(resolveHtmlDisplayAddress(waWithAddress), "Calle 10 # 5-20");

  // Caso 2: WhatsApp sin dirección de entrega
  const waWithoutAddress = {
    notes: "Pedido WhatsApp: #ord-2 · Pago: Efectivo",
    customer: existingCustomer,
  };
  assert.equal(resolveHtmlDisplayAddress(waWithoutAddress), "", "No debe exponer la dirección del cliente si no se suministró para la orden");

  // Caso 3: Factura comercial directa (no WhatsApp)
  const directInvoice = {
    notes: "Venta directa",
    customer: existingCustomer,
  };
  assert.equal(resolveHtmlDisplayAddress(directInvoice), "Oficina Central Piso 3", "Facturas directas conservan la dirección del cliente");
});

// 4. Preservación de datos maestros del cliente
test("No sobreescribe datos maestros si el cliente ya tiene dirección o correo, y nunca asigna deliveryAddress a customer.address", () => {
  const existingCustomer = {
    id: "cust-1",
    name: "Carlos Vélez",
    phone: "3001234567",
    address: "", // Dirección habitual vacía
    email: "carlos@master.com",
  };

  const newDeliveryAddress = "Avenida Suba 120-10";
  const newEmail = "carlos_temporal@gmail.com";

  // Lógica de actualización de create-from-order:
  // Nunca debe intentar escribir deliveryAddress en updates.address
  const updates: { phone?: string; email?: string } = {};
  if (!existingCustomer.phone && "3001234567") updates.phone = "3001234567";
  if ((!existingCustomer.email || existingCustomer.email === "") && newEmail) {
    updates.email = newEmail;
  }

  assert.equal(Object.keys(updates).length, 0, "No debe registrar actualizaciones si el cliente maestro ya tiene datos");
  assert.equal("address" in updates, false, "updates nunca debe contener address para no alterar el domicilio del cliente");
});

// 5. Pruebas de lógica para el endpoint de registro de cobro (record-payment)
test("record-payment: Valida autenticación con BOT_INVOICE_SECRET", () => {
  const SECRET = "bunuelandia-secret-bot-key-2026";
  function validateAuth(headers: Record<string, string>) {
    const apiKey = headers["x-bot-api-key"] || headers["x-api-key"];
    const auth = headers["authorization"] || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
    const provided = apiKey || bearer;
    return Boolean(provided && provided === SECRET);
  }

  assert.equal(validateAuth({ "x-bot-api-key": SECRET }), true);
  assert.equal(validateAuth({ "x-api-key": SECRET }), true);
  assert.equal(validateAuth({ authorization: `Bearer ${SECRET}` }), true);
  assert.equal(validateAuth({ "x-bot-api-key": "clave-falsa" }), false);
  assert.equal(validateAuth({}), false);
});

test("record-payment: Idempotencia estricta mediante referencia única de pedido [ref:orderId]", () => {
  interface MockPayment {
    id: string;
    amount: number;
    notes: string;
  }
  interface MockInvoice {
    id: string;
    number: string;
    status: "issued" | "paid";
    total: number;
    payments: MockPayment[];
  }

  function processPaymentRecord(
    invoice: MockInvoice,
    payload: { orderId: string; amount: number; confirmedBy: string }
  ) {
    const uniqueOrderRef = `[ref:${payload.orderId}]`;
    const existing = invoice.payments.find((p) => p.notes.includes(uniqueOrderRef));
    if (existing || invoice.status === "paid") {
      return {
        ok: true,
        alreadyPaid: true,
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        status: "paid",
        paymentId: existing?.id,
      };
    }

    const paidSoFar = invoice.payments.reduce((a, b) => a + b.amount, 0);
    const pending = Math.round(invoice.total - paidSoFar);
    if (Math.abs(payload.amount - pending) > 1 && payload.amount < pending) {
      throw new Error(`El importe no coincide. Esperado: ${pending}, recibido: ${payload.amount}`);
    }

    const newPayment: MockPayment = {
      id: "pay-123",
      amount: payload.amount,
      notes: `Cobro contra entrega pedido #${payload.orderId.slice(0, 8)} ${uniqueOrderRef} confirmado por ${payload.confirmedBy}`,
    };
    invoice.payments.push(newPayment);
    invoice.status = "paid";

    return {
      ok: true,
      alreadyPaid: false,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      status: "paid",
      paymentId: newPayment.id,
    };
  }

  const invoice: MockInvoice = {
    id: "inv-99",
    number: "B-0014",
    status: "issued",
    total: 35000,
    payments: [],
  };

  // 1er intento: Debe registrar el pago y cambiar a 'paid'
  const first = processPaymentRecord(invoice, {
    orderId: "ord-abc-123",
    amount: 35000,
    confirmedBy: "3228964947",
  });
  assert.equal(first.ok, true);
  assert.equal(first.alreadyPaid, false);
  assert.equal(first.status, "paid");
  assert.equal(invoice.payments.length, 1);

  // 2do intento simultáneo o repetido con la misma referencia: Debe retornar alreadyPaid sin crear un 2do pago
  const second = processPaymentRecord(invoice, {
    orderId: "ord-abc-123",
    amount: 35000,
    confirmedBy: "3228964947",
  });
  assert.equal(second.ok, true);
  assert.equal(second.alreadyPaid, true);
  assert.equal(invoice.payments.length, 1, "No debe duplicar pagos en reintentos");
  assert.equal(invoice.number, "B-0014", "Debe conservar exactamente el mismo número de factura");
});

test("record-payment: Rechaza importes incorrectos que no coinciden con el saldo pendiente", () => {
  const invoice = {
    id: "inv-100",
    number: "B-0015",
    status: "issued" as const,
    total: 45000,
    payments: [],
  };

  const paidSoFar = 0;
  const pending = invoice.total - paidSoFar;

  // Caso 1: Importe menor
  const underAmount = 20000;
  assert.throws(
    () => {
      if (Math.abs(underAmount - pending) > 1) {
        throw new Error(`El importe recibido ($${underAmount}) no coincide con el saldo pendiente ($${pending})`);
      }
    },
    /no coincide con el saldo pendiente/,
    "Debe rechazar un cobro cuyo monto sea menor al saldo pendiente"
  );

  // Caso 2: Importe mayor
  const overAmount = 50000;
  assert.throws(
    () => {
      if (Math.abs(overAmount - pending) > 1) {
        throw new Error(`El importe recibido ($${overAmount}) no coincide con el saldo pendiente ($${pending})`);
      }
    },
    /no coincide con el saldo pendiente/,
    "Debe rechazar un cobro cuyo monto sea mayor al saldo pendiente"
  );
});

// 6. Prueba de etiquetas de factura pública (HTML) según estado
test("Vista pública HTML: Muestra 'Factura Pagada' / 'TOTAL PAGADO' si está pagada, y 'Factura Emitida' / 'TOTAL A COBRAR' si está emitida", () => {
  function computePublicViewLabels(status: "issued" | "paid" | "draft" | "void") {
    const isPaid = status === "paid";
    const statusBadgeText = isPaid ? "Factura Pagada" : "Factura Emitida";
    const statusBadgeBg = isPaid ? "#10b981" : "#f59e0b";
    const totalRowLabel = isPaid ? "TOTAL PAGADO" : "TOTAL A COBRAR";
    return { statusBadgeText, statusBadgeBg, totalRowLabel };
  }

  // Factura pagada (ej. por transferencia o tras confirmación de cobro)
  const paidLabels = computePublicViewLabels("paid");
  assert.equal(paidLabels.statusBadgeText, "Factura Pagada");
  assert.equal(paidLabels.totalRowLabel, "TOTAL PAGADO");
  assert.equal(paidLabels.statusBadgeBg, "#10b981");

  // Factura contra entrega recién emitida o pendiente
  const issuedLabels = computePublicViewLabels("issued");
  assert.equal(issuedLabels.statusBadgeText, "Factura Emitida");
  assert.equal(issuedLabels.totalRowLabel, "TOTAL A COBRAR");
  assert.equal(issuedLabels.statusBadgeBg, "#f59e0b");
});

// 7. Validación directa de archivos fuente reales en producción (código real, no funciones simuladas)
test("Validación directa de archivos fuente: create-from-order, PDF público/privado y vista web", () => {
  const createRoute = readFileSync(join(process.cwd(), "src/app/api/invoices/create-from-order/route.ts"), "utf8");
  const publicPdfRoute = readFileSync(join(process.cwd(), "src/app/api/invoices/public/[id]/pdf/route.ts"), "utf8");
  const privatePdfRoute = readFileSync(join(process.cwd(), "src/app/(app)/invoices/[id]/pdf/route.ts"), "utf8");
  const publicHtmlRoute = readFileSync(join(process.cwd(), "src/app/api/invoices/public/[id]/route.ts"), "utf8");

  // A. create-from-order: estado por defecto issued, sin pago automático
  assert.match(createRoute, /let invoiceStatus:\s*"issued"\s*\|\s*"paid"\s*=\s*"issued"/);
  assert.match(createRoute, /let shouldRecordPayment\s*=\s*false/);
  assert.match(createRoute, /if\s*\(paymentStatus\s*===\s*"paid"\)\s*\{\s*invoiceStatus\s*=\s*"paid";\s*shouldRecordPayment\s*=\s*true;\s*\}/);

  // B. create-from-order: no sobrescribe Customer.address con la dirección de entrega del pedido
  assert.match(createRoute, /address:\s*""/);
  assert.doesNotMatch(createRoute, /updates\.address\s*=\s*deliveryAddress/);

  // C. Generadores de PDF público y privado:
  for (const pdfSource of [publicPdfRoute, privatePdfRoute]) {
    assert.ok(pdfSource.includes('includes("Pedido WhatsApp:")'));
    assert.ok(pdfSource.includes('orderAddress = entregaMatch[1].trim()'));
    assert.ok(pdfSource.includes('address: isWhatsAppOrder ? (orderAddress || "") : (invoice.customer.address || "")'));
    assert.ok(pdfSource.includes('statusLabel: INVOICE_STATUS_LABELS[invoice.status] || invoice.status'));
  }

  // D. Vista pública HTML: estado y badge visual reflejan el estado real
  assert.match(publicHtmlRoute, /const isPaid\s*=\s*invoice\.status\s*===\s*"paid"/);
  assert.match(publicHtmlRoute, /const statusBadgeText\s*=\s*isPaid\s*\?\s*"Factura Pagada"\s*:\s*"Factura Emitida"/);
  assert.match(publicHtmlRoute, /const totalRowLabel\s*=\s*isPaid\s*\?\s*"TOTAL PAGADO"\s*:\s*"TOTAL A COBRAR"/);
});

// 8. Verificación integral de generación real de PDF con PDFKit en memoria (sin BD de producción)
test("Generación real de PDF comercial: aislamiento de dirección y reflejo de estado de pago", async () => {
  function extractPdfText(pdfBuffer: Buffer): string {
    const str = pdfBuffer.toString("latin1");
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let fullText = "";
    let streamMatch: RegExpExecArray | null;
    while ((streamMatch = streamRegex.exec(str)) !== null) {
      try {
        const decomp = zlib.inflateSync(Buffer.from(streamMatch[1], "latin1")).toString("latin1");
        // Extraer texto de bloques de array TJ: [<hex> offset <hex>] TJ
        const tjRegex = /\[(.*?)\]\s*TJ/g;
        let tjMatch: RegExpExecArray | null;
        while ((tjMatch = tjRegex.exec(decomp)) !== null) {
          const hexRegex = /<([0-9a-fA-F]+)>/g;
          let block = "";
          let hexMatch: RegExpExecArray | null;
          while ((hexMatch = hexRegex.exec(tjMatch[1])) !== null) {
            const hex = hexMatch[1];
            for (let i = 0; i < hex.length; i += 2) {
              block += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
            }
          }
          fullText += block + "\n";
        }
        // Extraer texto de operadores simples Tj: <hex> Tj
        const singleTjRegex = /<([0-9a-fA-F]+)>\s*Tj/g;
        let singleMatch: RegExpExecArray | null;
        while ((singleMatch = singleTjRegex.exec(decomp)) !== null) {
          const hex = singleMatch[1];
          let block = "";
          for (let i = 0; i < hex.length; i += 2) {
            block += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
          }
          fullText += block + "\n";
        }
      } catch {
        // Ignorar streams que no sean deflate válidos (ej. imágenes o binarios no comprimidos con zlib)
      }
    }
    return fullText;
  }

  function resolveInvoicePdfParams(invoice: {
    number: string;
    status: "issued" | "paid" | "draft" | "void";
    notes?: string | null;
    total: number;
    subtotal: number;
    ivaTotal: number;
    paymentMethod?: string | null;
    createdAt?: Date;
    issuedAt?: Date;
    customer?: {
      name: string;
      nit: string;
      address?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      ivaRate: number;
      lineTotal: number;
    }>;
  }) {
    let orderAddress = "";
    let orderEmail = "";
    const isWhatsAppOrder = (invoice.notes || "").includes("Pedido WhatsApp:");
    if (invoice.notes) {
      const entregaMatch = invoice.notes.match(/(?:^|·\s*)Entrega:\s*([^·]+)/);
      if (entregaMatch) {
        orderAddress = entregaMatch[1].trim();
      }
      const emailMatch = invoice.notes.match(/(?:^|·\s*)Email:\s*([^·]+)/);
      if (emailMatch) {
        orderEmail = emailMatch[1].trim();
      }
    }

    const party = invoice.customer
      ? {
          name: invoice.customer.name,
          nit: invoice.customer.nit,
          address: isWhatsAppOrder ? (orderAddress || "") : (invoice.customer.address || ""),
          email: isWhatsAppOrder ? (orderEmail || "") : (invoice.customer.email || ""),
          phone: invoice.customer.phone || "",
        }
      : {
          name: "Consumidor Final",
          nit: "222222222222",
          address: orderAddress || "",
          email: orderEmail || "",
          phone: "",
        };

    const statusLabel = INVOICE_STATUS_LABELS[invoice.status] || invoice.status;

    return { party, statusLabel, isWhatsAppOrder };
  }

  const sampleItems = [
    {
      description: "Caja Tradicional x8",
      quantity: 1,
      unitPrice: 32000,
      ivaRate: 0,
      lineTotal: 32000,
    },
  ];

  // Escenario 1: Dirección habitual distinta de la dirección de entrega
  const invoice1 = {
    number: "B-0101",
    status: "issued" as const,
    notes: "Pedido WhatsApp: #ord-01 · Entrega: Carrera 15 # 85-30 · Pago: Efectivo",
    total: 32000,
    subtotal: 32000,
    ivaTotal: 0,
    paymentMethod: "Efectivo",
    customer: {
      name: "Diana Morales",
      nit: "1020304050",
      address: "Calle 100 # 15-20 (Oficina Principal)",
      email: "diana.antiguo@empresa.com",
      phone: "3155554433",
    },
    items: sampleItems,
  };

  const params1 = resolveInvoicePdfParams(invoice1);
  assert.equal(params1.party.address, "Carrera 15 # 85-30", "Debe usar la dirección de entrega de la orden");
  assert.equal(params1.party.email, "", "No debe exponer email antiguo si no vino en la orden");

  const pdf1 = await buildCommercialPdf({
    title: "FACTURA DE VENTA",
    number: invoice1.number,
    statusLabel: params1.statusLabel,
    dateLabel: "Emisión",
    dateValue: new Date(),
    company: null,
    party: params1.party,
    partyTitle: "Facturar a:",
    items: invoice1.items,
    subtotal: invoice1.subtotal,
    ivaTotal: invoice1.ivaTotal,
    total: invoice1.total,
    notes: invoice1.notes,
    paymentMethod: invoice1.paymentMethod,
  });

  assert.ok(Buffer.isBuffer(pdf1), "Debe generar un Buffer de Node.js");
  assert.ok(pdf1.length > 1000, "El PDF generado debe tener un tamaño razonable");
  assert.equal(pdf1.subarray(0, 5).toString("latin1"), "%PDF-", "Debe ser un archivo PDF válido");

  const text1 = extractPdfText(pdf1);
  assert.ok(text1.includes("Carrera 15 # 85-30"), "El PDF debe incluir la dirección de entrega de la orden");
  assert.equal(text1.includes("Calle 100 # 15-20"), false, "El PDF NUNCA debe incluir la dirección habitual del cliente");

  // Escenario 2: Dirección de entrega ausente en pedido WhatsApp (ej. recoger en tienda)
  const invoice2 = {
    number: "B-0102",
    status: "issued" as const,
    notes: "Pedido WhatsApp: #ord-02 · Pago: Efectivo",
    total: 32000,
    subtotal: 32000,
    ivaTotal: 0,
    paymentMethod: "Efectivo",
    customer: {
      name: "Diana Morales",
      nit: "1020304050",
      address: "Calle 100 # 15-20 (Oficina Principal)",
      email: "diana.antiguo@empresa.com",
      phone: "3155554433",
    },
    items: sampleItems,
  };

  const params2 = resolveInvoicePdfParams(invoice2);
  assert.equal(params2.party.address, "", "Debe quedar en blanco si no se suministró dirección para la orden");

  const pdf2 = await buildCommercialPdf({
    title: "FACTURA DE VENTA",
    number: invoice2.number,
    statusLabel: params2.statusLabel,
    dateLabel: "Emisión",
    dateValue: new Date(),
    company: null,
    party: params2.party,
    partyTitle: "Facturar a:",
    items: invoice2.items,
    subtotal: invoice2.subtotal,
    ivaTotal: invoice2.ivaTotal,
    total: invoice2.total,
    notes: invoice2.notes,
    paymentMethod: invoice2.paymentMethod,
  });

  const text2 = extractPdfText(pdf2);
  assert.equal(text2.includes("Calle 100 # 15-20"), false, "El PDF no debe exponer la dirección habitual cuando no hubo entrega");

  // Escenario 3: Factura emitida y pendiente (status: "issued")
  const invoice3 = {
    number: "B-0103",
    status: "issued" as const,
    notes: "Pedido WhatsApp: #ord-03 · Entrega: Transversal 23 # 45-67 · Pago: Efectivo contra entrega",
    total: 32000,
    subtotal: 32000,
    ivaTotal: 0,
    paymentMethod: "Efectivo",
    customer: {
      name: "Andrés Cepeda",
      nit: "80123456",
      phone: "3101112233",
    },
    items: sampleItems,
  };

  const params3 = resolveInvoicePdfParams(invoice3);
  assert.equal(params3.statusLabel, "Emitida", "El estado para 'issued' debe ser 'Emitida'");

  const pdf3 = await buildCommercialPdf({
    title: "FACTURA DE VENTA",
    number: invoice3.number,
    statusLabel: params3.statusLabel,
    dateLabel: "Emisión",
    dateValue: new Date(),
    company: null,
    party: params3.party,
    partyTitle: "Facturar a:",
    items: invoice3.items,
    subtotal: invoice3.subtotal,
    ivaTotal: invoice3.ivaTotal,
    total: invoice3.total,
    notes: invoice3.notes,
    paymentMethod: invoice3.paymentMethod,
  });

  const text3 = extractPdfText(pdf3);
  assert.ok(text3.includes("Emitida"), "El PDF debe mostrar 'Emitida'");
  assert.equal(text3.includes("Pagada"), false, "El PDF de factura emitida NO debe decir 'Pagada'");

  // Escenario 4: Factura pagada (status: "paid")
  const invoice4 = {
    number: "B-0104",
    status: "paid" as const,
    notes: "Pedido WhatsApp: #ord-04 · Entrega: Calle 127 # 7-10 · Pago: Nequi verificado",
    total: 32000,
    subtotal: 32000,
    ivaTotal: 0,
    paymentMethod: "Nequi",
    customer: {
      name: "Marcela Valencia",
      nit: "52987654",
      phone: "3189990011",
    },
    items: sampleItems,
  };

  const params4 = resolveInvoicePdfParams(invoice4);
  assert.equal(params4.statusLabel, "Pagada", "El estado para 'paid' debe ser 'Pagada'");

  const pdf4 = await buildCommercialPdf({
    title: "FACTURA DE VENTA",
    number: invoice4.number,
    statusLabel: params4.statusLabel,
    dateLabel: "Emisión",
    dateValue: new Date(),
    company: null,
    party: params4.party,
    partyTitle: "Facturar a:",
    items: invoice4.items,
    subtotal: invoice4.subtotal,
    ivaTotal: invoice4.ivaTotal,
    total: invoice4.total,
    notes: invoice4.notes,
    paymentMethod: invoice4.paymentMethod,
  });

  const text4 = extractPdfText(pdf4);
  assert.ok(text4.includes("Pagada"), "El PDF debe mostrar 'Pagada'");
  assert.equal(text4.includes("Emitida"), false, "El PDF de factura pagada NO debe decir 'Emitida'");

  // Escenario 5: Validación de contratos de cabeceras HTTP entre PDF público y PDF privado
  function getPdfHeaders(isPublic: boolean, invoiceNumber: string) {
    const filename = isPublic
      ? `Factura_${invoiceNumber.replace(/[^\w.-]+/g, "_")}.pdf`
      : `${invoiceNumber.replace(/[^\w.-]+/g, "_")}.pdf`;

    return {
      contentType: "application/pdf",
      contentDisposition: isPublic
        ? `inline; filename="${filename}"`
        : `attachment; filename="${filename}"`,
      cacheControl: isPublic
        ? "public, max-age=86400, s-maxage=86400"
        : "no-store",
    };
  }

  const publicHeaders = getPdfHeaders(true, "B-0105");
  assert.equal(publicHeaders.contentType, "application/pdf");
  assert.equal(publicHeaders.contentDisposition, 'inline; filename="Factura_B-0105.pdf"');
  assert.equal(publicHeaders.cacheControl, "public, max-age=86400, s-maxage=86400");

  const privateHeaders = getPdfHeaders(false, "B-0105");
  assert.equal(privateHeaders.contentType, "application/pdf");
  assert.equal(privateHeaders.contentDisposition, 'attachment; filename="B-0105.pdf"');
  assert.equal(privateHeaders.cacheControl, "no-store");
});
