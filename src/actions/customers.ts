"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth";

export async function createCustomerAction(formData: FormData) {
  await assertPermission("customers:write");
  const name = String(formData.get("name") || "").trim();
  const nit = String(formData.get("nit") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  if (!name || !nit) {
    return { error: "Nombre y NIT/CC son obligatorios." };
  }
  await prisma.customer.create({
    data: { name, nit, email, phone, address },
  });
  revalidatePath("/customers");
  return { ok: true };
}

export async function updateCustomerAction(formData: FormData) {
  await assertPermission("customers:write");
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const nit = String(formData.get("nit") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  await prisma.customer.update({
    where: { id },
    data: { name, nit, email, phone, address },
  });
  revalidatePath("/customers");
  return { ok: true };
}
