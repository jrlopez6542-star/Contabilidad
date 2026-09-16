"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

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
  await prisma.customer.update({
    where: { id },
    data: { name, nit, email, phone, address },
  });
  await writeAudit(session, "update", "customer", id, `Actualizó cliente ${name}`);
  revalidatePath("/customers");
  return { ok: true };
}
