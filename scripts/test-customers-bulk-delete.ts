import { prisma } from "../src/lib/prisma";
import { executeDeleteCustomersBulk } from "../src/lib/customers";

async function runCustomerTests() {
  console.log("=== PRUEBAS AUTOMATIZADAS DE ELIMINACIÓN MASIVA DE CLIENTES ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✖ [FAIL] ${name}`);
      failed++;
    }
  }

  const mockSession = {
    id: "test-user-id",
    email: "test@bunuelandia.local",
    name: "Tester",
    role: "admin" as const,
  };

  // Capturar estado inicial
  const initialCustomers = await prisma.customer.findMany({
    select: { id: true, name: true, nit: true },
  });
  console.log(`Clientes iniciales: ${initialCustomers.length}`);

  // Test 1: Selección vacía
  console.log("\n[Test 1] Selección vacía:");
  const emptyRes1 = await executeDeleteCustomersBulk([], mockSession);
  assert(
    "error" in emptyRes1 && emptyRes1.error.includes("No se seleccionó ningún cliente"),
    "Rechaza array vacío"
  );

  const emptyRes2 = await executeDeleteCustomersBulk(["   ", ""], mockSession);
  assert(
    "error" in emptyRes2 && emptyRes2.error.includes("No se seleccionaron clientes válidos"),
    "Rechaza array de espacios en blanco"
  );

  // Test 2: Clientes inexistentes
  console.log("\n[Test 2] Clientes inexistentes:");
  const nonExistentRes = await executeDeleteCustomersBulk(["non-existent-id-12345"], mockSession);
  assert(
    "error" in nonExistentRes && nonExistentRes.error.includes("No se encontraron clientes"),
    "Rechaza IDs que no existen"
  );

  // Test 3: Bloqueo de eliminación si tiene facturas asociadas
  console.log("\n[Test 3] Protección de integridad con facturas asociadas:");
  const customerWithInvoice = await prisma.customer.findFirst({
    where: { invoices: { some: {} } },
    select: { id: true, name: true },
  });

  if (customerWithInvoice) {
    const blockedRes = await executeDeleteCustomersBulk([customerWithInvoice.id], mockSession);
    assert(
      "error" in blockedRes && blockedRes.error.includes("asociadas"),
      `Bloquea eliminación del cliente «${customerWithInvoice.name}» con facturas asociadas`
    );
  } else {
    console.log("  ℹ No hay cliente con facturas para testear bloqueo (se asume safe).");
  }

  // Test 4: Eliminación masiva exitosa de clientes de prueba sin facturas
  console.log("\n[Test 4] Eliminación masiva exitosa con clientes temporales:");
  const temp1 = await prisma.customer.create({
    data: {
      name: "Temp Test Client 1",
      nit: "TEMP-NIT-999001",
    },
  });
  const temp2 = await prisma.customer.create({
    data: {
      name: "Temp Test Client 2",
      nit: "TEMP-NIT-999002",
    },
  });

  const successRes = await executeDeleteCustomersBulk([temp1.id, temp2.id], mockSession);
  assert(
    "ok" in successRes && successRes.ok && successRes.count === 2,
    "Elimina exitosamente los 2 clientes de prueba temporales"
  );

  const checkTemp1 = await prisma.customer.findUnique({ where: { id: temp1.id } });
  const checkTemp2 = await prisma.customer.findUnique({ where: { id: temp2.id } });
  assert(!checkTemp1 && !checkTemp2, "Los clientes de prueba ya no existen en la base de datos");

  // Test 5: Comprobación de estado final
  console.log("\n[Test 5] Integridad de datos preexistentes:");
  const finalCustomers = await prisma.customer.findMany({
    select: { id: true, name: true },
  });
  assert(
    finalCustomers.length === initialCustomers.length,
    `La cantidad final de clientes (${finalCustomers.length}) coincide exactamente con la inicial (${initialCustomers.length})`
  );

  console.log("\n============================================================");
  console.log(`RESULTADO: ${passed} pruebas pasadas, ${failed} fallidas.`);
  console.log("============================================================");

  if (failed > 0) process.exit(1);
}

runCustomerTests().catch((err) => {
  console.error("Error ejecutando pruebas:", err);
  process.exit(1);
});
