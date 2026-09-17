"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

function normalizeNit(nit: string) {
  return nit.trim().toLowerCase();
}

async function findDuplicateNit(nit: string, excludeId?: string) {
  const nitNorm = normalizeNit(nit);
  const customers = await prisma.customer.findMany({
    select: { id: true, nit: true },
  });
  return (
    customers.find(
      (c) =>
        normalizeNit(c.nit) === nitNorm &&
        (!excludeId || c.id !== excludeId)
    ) ?? null
  );
}

export async function createCustomerAction(formData: FormData) {
  const session = await assertPermission("customers:write");
  const name = String(formData.get("name") || "").trim();
  const nit = String(formData.get("nit") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  if (!name || !nit) {
    return { error: "Nombre y NIT/CC son obligatorios." };
  }
  const dup = await findDuplicateNit(nit);
  if (dup) {
    return { error: "Ya existe un cliente con ese NIT/CC." };
  }
  const customer = await prisma.customer.create({
    data: { name, nit, email, phone, address },
  });
  await writeAudit(session, "create", "customer", customer.id, `Creó cliente ${name}`);
  revalidatePath("/customers");
  return { ok: true };
}

export async function updateCustomerAction(formData: FormData) {
  const session = await assertPermission("customers:write");
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const nit = String(formData.get("nit") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  if (!id || !name || !nit) {
    return { error: "Nombre y NIT/CC son obligatorios." };
  }
  const dup = await findDuplicateNit(nit, id);
  if (dup) {
    return { error: "Ya existe un cliente con ese NIT/CC." };
  }
  await prisma.customer.update({
    where: { id },
    data: { name, nit, email, phone, address },
  });
  await writeAudit(session, "update", "customer", id, `Actualizó cliente ${name}`);
  revalidatePath("/customers");
  return { ok: true };
}

export async function deleteCustomerAction(id: string) {
  const session = await assertPermission("customers:write");
  if (!id) {
    return { error: "Cliente no encontrado." };
  }
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      _count: { select: { invoices: true, quotes: true } },
    },
  });
  if (!customer) {
    return { error: "Cliente no encontrado." };
  }
  if (customer._count.invoices > 0 || customer._count.quotes > 0) {
    return {
      error:
        "No se puede eliminar: tiene facturas o cotizaciones asociadas.",
    };
  }
  await prisma.customer.delete({ where: { id } });
  await writeAudit(
    session,
    "delete",
    "customer",
    id,
    `Eliminó cliente ${customer.name}`
  );
  revalidatePath("/customers");
  return { ok: true };
}
