"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth";

export async function updateCompanyAction(formData: FormData) {
  await assertPermission("company:write");
  const data = {
    name: String(formData.get("name") || "").trim(),
    nit: String(formData.get("nit") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    invoicePrefix: String(formData.get("invoicePrefix") || "FV").trim() || "FV",
  };
  if (!data.name || !data.nit) {
    return { error: "Razón social y NIT son obligatorios." };
  }
  const existing = await prisma.company.findFirst();
  if (existing) {
    await prisma.company.update({ where: { id: existing.id }, data });
  } else {
    await prisma.company.create({ data });
  }
  revalidatePath("/company");
  return { ok: true };
}
