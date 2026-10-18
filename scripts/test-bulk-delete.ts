import { prisma } from "../src/lib/prisma";
import { executeDeleteInvoicesBulk } from "../src/lib/invoices";

async function runTests() {
  console.log("=== INICIANDO PRUEBAS AUTOMATIZADAS DE ELIMINACIÓN MASIVA ===");
  let failed = 0;
  let passed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✖ [FAIL] ${name}`);
      failed++;
    }
  }

  // 0. Capturar estado inicial de la base de datos para garantizar integridad
  const initialInvoices = await prisma.invoice.findMany({
    select: { id: true, number: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  const initialInvoiceCount = initialInvoices.length;
  console.log(`Facturas iniciales en base de datos: ${initialInvoiceCount}`);
  for (const inv of initialInvoices) {
    console.log(`   - ${inv.number} (${inv.status})`);
  }

  const mockSession = {
    id: "test-user-id",
    email: "test@bunuelandia.local",
    name: "Tester",
    role: "admin" as const,
  };

  // -------------------------------------------------------------------------
  // 1. Prueba: Selección vacía
  // -------------------------------------------------------------------------
  console.log("\n[Test 1] Selección vacía:");
  const emptyRes1 = await executeDeleteInvoicesBulk([], mockSession);
  assert(
    "error" in emptyRes1 && emptyRes1.error.includes("No se seleccionó ninguna factura"),
    "Rechaza array vacío con mensaje descriptivo"
  );

  const emptyRes2 = await executeDeleteInvoicesBulk(["   ", ""], mockSession);
  assert(
    "error" in emptyRes2 && emptyRes2.error.includes("No se seleccionaron facturas válidas"),
    "Rechaza array con strings en blanco"
  );

  // -------------------------------------------------------------------------
  // 2. Prueba: IDs inexistentes
  // -------------------------------------------------------------------------
  console.log("\n[Test 2] Facturas inexistentes:");
  const notFoundRes = await executeDeleteInvoicesBulk(
    ["cuid-inexistente-0001", "cuid-inexistente-0002"],
    mockSession
  );
  assert(
    "error" in notFoundRes && notFoundRes.error.includes("No se encontraron facturas para eliminar"),
    "Rechaza IDs que no existen sin fallar ni romper el servidor"
  );

  // -------------------------------------------------------------------------
  // 3. Prueba: Eliminación parcial y aislamiento
  // -------------------------------------------------------------------------
  console.log("\n[Test 3] Eliminación parcial y aislamiento con registros temporales:");

  // Crear cliente temporal de prueba
  const tempCustomer = await prisma.customer.create({
    data: {
      name: "Cliente Temporal Test",
      nit: `NIT-TEST-${Date.now()}`,
    },
  });

  // Crear 2 facturas temporales de prueba
  const tempInvoice1 = await prisma.invoice.create({
    data: {
      number: `TEMP-${Date.now()}-1`,
      customerId: tempCustomer.id,
      status: "draft",
      subtotal: 10000,
      total: 10000,
    },
  });

  const tempInvoice2 = await prisma.invoice.create({
    data: {
      number: `TEMP-${Date.now()}-2`,
      customerId: tempCustomer.id,
      status: "draft",
      subtotal: 20000,
      total: 20000,
    },
  });

  // Eliminar ÚNICAMENTE la factura 1 del lote temporal
  const partialRes = await executeDeleteInvoicesBulk([tempInvoice1.id], mockSession);
  assert(
    "ok" in partialRes && partialRes.ok && partialRes.count === 1,
    "Elimina exitosamente solo la factura seleccionada"
  );

  const check1 = await prisma.invoice.findUnique({ where: { id: tempInvoice1.id } });
  const check2 = await prisma.invoice.findUnique({ where: { id: tempInvoice2.id } });
  assert(check1 === null, "La factura 1 fue eliminada permanentemente");
  assert(check2 !== null, "La factura 2 permanece intacta (no se eliminó)");

  // Ahora eliminar la factura 2 temporal
  const del2Res = await executeDeleteInvoicesBulk([tempInvoice2.id], mockSession);
  assert("ok" in del2Res && del2Res.ok, "Elimina la factura 2 temporal");

  // Limpiar cliente temporal
  await prisma.customer.delete({ where: { id: tempCustomer.id } });

  // -------------------------------------------------------------------------
  // 4. Prueba: Rollback de transacción
  // -------------------------------------------------------------------------
  console.log("\n[Test 4] Rollback de transacción ante error:");
  const tempCustomerRollback = await prisma.customer.create({
    data: {
      name: "Cliente Rollback Test",
      nit: `NIT-ROLLBACK-${Date.now()}`,
    },
  });

  const rollbackInv = await prisma.invoice.create({
    data: {
      number: `ROLLBACK-${Date.now()}`,
      customerId: tempCustomerRollback.id,
      status: "draft",
      total: 5000,
    },
  });

  // Simular una falla dentro de una transacción idéntica al flujo de bulk delete
  let rollbackCaught = false;
  try {
    await prisma.$transaction(async (tx) => {
      // Paso 1: Eliminar la factura
      await tx.invoice.delete({ where: { id: rollbackInv.id } });
      // Paso 2: Provocar un error forzado antes de commit
      throw new Error("ERROR_SIMULADO_PARA_PROBAR_ROLLBACK");
    });
  } catch (err: any) {
    if (err.message.includes("ERROR_SIMULADO_PARA_PROBAR_ROLLBACK")) {
      rollbackCaught = true;
    }
  }

  assert(rollbackCaught, "La transacción lanzó el error esperado");

  // Verificar que la factura SIGUE EXISTIENDO gracias al rollback
  const checkRollback = await prisma.invoice.findUnique({
    where: { id: rollbackInv.id },
  });
  assert(
    checkRollback !== null,
    "La factura fue preservada en la base de datos debido al rollback atómico"
  );

  // Limpiar datos temporales de la prueba de rollback
  await prisma.invoice.delete({ where: { id: rollbackInv.id } });
  await prisma.customer.delete({ where: { id: tempCustomerRollback.id } });

  // -------------------------------------------------------------------------
  // 5. Verificación final de integridad de los datos originales
  // -------------------------------------------------------------------------
  console.log("\n[Test 5] Verificación de integridad de datos preexistentes:");
  const finalInvoices = await prisma.invoice.findMany({
    select: { id: true, number: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  assert(
    finalInvoices.length === initialInvoiceCount,
    `La cantidad final de facturas (${finalInvoices.length}) coincide exactamente con la inicial (${initialInvoiceCount})`
  );

  const sameIds =
    initialInvoices.every((ini) => finalInvoices.some((fin) => fin.id === ini.id)) &&
    finalInvoices.every((fin) => initialInvoices.some((ini) => ini.id === fin.id));
  assert(sameIds, "Todos los registros de facturas originales permanecen intactos");

  console.log("\n============================================================");
  console.log(`RESULTADO: ${passed} pruebas pasadas, ${failed} fallidas.`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Error inesperado en pruebas:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
