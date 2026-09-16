import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.company.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();

  const [adminHash, vendedorHash, contadorHash] = await Promise.all([
    bcrypt.hash("Admin123!", 10),
    bcrypt.hash("Vendedor123!", 10),
    bcrypt.hash("Contador123!", 10),
  ]);

  await prisma.user.createMany({
    data: [
      {
        email: "admin@demo.co",
        name: "Administrador Demo",
        passwordHash: adminHash,
        role: "admin",
        active: true,
      },
      {
        email: "vendedor@demo.co",
        name: "Vendedor Demo",
        passwordHash: vendedorHash,
        role: "vendedor",
        active: true,
      },
      {
        email: "contador@demo.co",
        name: "Contador Demo",
        passwordHash: contadorHash,
        role: "contador",
        active: true,
      },
    ],
  });

  await prisma.company.create({
    data: {
      name: "Buñuelandia",
      nit: "901234567-8",
      address: "Calle 100 # 19-61, Bogotá D.C.",
      phone: "+57 601 555 0100",
      email: "facturacion@bunuelandia.co",
      logoUrl: "/logo-bunuelandia.png",
      invoicePrefix: "FV",
      nextInvoiceNumber: 3,
      quotePrefix: "COT",
      nextQuoteNumber: 2,
      unpaidAlertDays: 30,
    },
  });

  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: "SRV-CONS",
        name: "Consultoría empresarial (hora)",
        price: 180000,
        ivaRate: 19,
        stock: 0,
        minStock: 0,
        trackStock: false,
        active: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: "SRV-SOP",
        name: "Soporte técnico mensual",
        price: 450000,
        ivaRate: 19,
        stock: 0,
        minStock: 0,
        trackStock: false,
        active: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: "PROD-LIC",
        name: "Licencia software anual",
        price: 1200000,
        ivaRate: 19,
        stock: 25,
        minStock: 5,
        trackStock: true,
        active: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: "SRV-CAP",
        name: "Capacitación in-company (día)",
        price: 850000,
        ivaRate: 19,
        stock: 0,
        minStock: 0,
        trackStock: false,
        active: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: "PROD-USB",
        name: "Memoria USB 64GB",
        price: 45000,
        ivaRate: 19,
        stock: 3,
        minStock: 10,
        trackStock: true,
        active: true,
      },
    }),
  ]);

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: "Industrias del Norte SAS",
        nit: "800123456-1",
        email: "compras@industriasdelnorte.com",
        phone: "+57 604 444 2211",
        address: "Cra 43A # 1 Sur-150, Medellín",
      },
    }),
    prisma.customer.create({
      data: {
        name: "Café Sierra Ltda",
        nit: "900987654-3",
        email: "admin@cafesierra.co",
        phone: "+57 602 333 7788",
        address: "Av. 6N # 28-40, Cali",
      },
    }),
    prisma.customer.create({
      data: {
        name: "María Gómez",
        nit: "1020304050",
        email: "maria.gomez@email.com",
        phone: "+57 300 111 2233",
        address: "Calle 72 # 10-34, Bogotá",
      },
    }),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 5);

  const inv1 = await prisma.invoice.create({
    data: {
      number: "FV-0001",
      customerId: customers[0].id,
      status: "paid",
      subtotal: 900000,
      ivaTotal: 171000,
      total: 1071000,
      notes: "Servicios de consultoría Q1",
      issuedAt: monthStart,
      items: {
        create: [
          {
            productId: products[0].id,
            description: products[0].name,
            quantity: 5,
            unitPrice: 180000,
            ivaRate: 19,
            lineSubtotal: 900000,
            lineIva: 171000,
            lineTotal: 1071000,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 1071000,
            method: "transferencia",
            paidAt: new Date(now.getFullYear(), now.getMonth(), 8),
            notes: "Pago completo",
          },
        ],
      },
    },
  });

  // Unpaid issued — make it old enough to trigger overdue alert
  const oldIssued = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
  await prisma.invoice.create({
    data: {
      number: "FV-0002",
      customerId: customers[1].id,
      status: "issued",
      subtotal: 1650000,
      ivaTotal: 313500,
      total: 1963500,
      notes: "Soporte + licencia",
      issuedAt: oldIssued,
      items: {
        create: [
          {
            productId: products[1].id,
            description: products[1].name,
            quantity: 1,
            unitPrice: 450000,
            ivaRate: 19,
            lineSubtotal: 450000,
            lineIva: 85500,
            lineTotal: 535500,
          },
          {
            productId: products[2].id,
            description: products[2].name,
            quantity: 1,
            unitPrice: 1200000,
            ivaRate: 19,
            lineSubtotal: 1200000,
            lineIva: 228000,
            lineTotal: 1428000,
          },
        ],
      },
    },
  });
  // Stock already decreased conceptually for issued FV-0002 license
  await prisma.product.update({
    where: { id: products[2].id },
    data: { stock: 24 },
  });

  await prisma.quote.create({
    data: {
      number: "COT-0001",
      customerId: customers[2].id,
      status: "sent",
      subtotal: 850000,
      ivaTotal: 161500,
      total: 1011500,
      notes: "Capacitación equipo comercial",
      validUntil: new Date(now.getFullYear(), now.getMonth() + 1, 15),
      items: {
        create: [
          {
            productId: products[3].id,
            description: products[3].name,
            quantity: 1,
            unitPrice: 850000,
            ivaRate: 19,
            lineSubtotal: 850000,
            lineIva: 161500,
            lineTotal: 1011500,
          },
        ],
      },
    },
  });

  await prisma.expense.createMany({
    data: [
      {
        date: new Date(now.getFullYear(), now.getMonth(), 3),
        category: "Arriendo",
        amount: 2500000,
        notes: "Oficina Bogotá",
      },
      {
        date: new Date(now.getFullYear(), now.getMonth(), 5),
        category: "Servicios públicos",
        amount: 380000,
        notes: "Energía e internet",
      },
      {
        date: new Date(now.getFullYear(), now.getMonth(), 10),
        category: "Software",
        amount: 150000,
        notes: "Suscripciones SaaS",
      },
      {
        date: new Date(now.getFullYear(), now.getMonth(), 14),
        category: "Marketing",
        amount: 420000,
        notes: "Campañas digitales",
      },
    ],
  });

  console.log("Seed OK");
  console.log("Logins:");
  console.log("  admin@demo.co / Admin123! (admin)");
  console.log("  vendedor@demo.co / Vendedor123! (vendedor)");
  console.log("  contador@demo.co / Contador123! (contador)");
  console.log("Invoices:", inv1.number, "FV-0002");
  console.log("Quote: COT-0001");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
