"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth";

export async function createProductAction(formData: FormData) {
  await assertPermission("products:write");
  const sku = String(formData.get("sku") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price") || 0);
  const ivaRate = Number(formData.get("ivaRate") || 19);
  if (!sku || !name || price < 0) {
    return { error: "SKU, nombre y precio son obligatorios." };
  }
  try {
    await prisma.product.create({
      data: { sku, name, price, ivaRate, active: true },
    });
  } catch {
    return { error: "No se pudo crear. ¿SKU duplicado?" };
  }
  revalidatePath("/products");
  return { ok: true };
}

export async function updateProductAction(formData: FormData) {
  await assertPermission("products:write");
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price") || 0);
  const ivaRate = Number(formData.get("ivaRate") || 19);
  const active = formData.get("active") === "on" || formData.get("active") === "true";
  await prisma.product.update({
    where: { id },
    data: { name, price, ivaRate, active },
  });
  revalidatePath("/products");
  return { ok: true };
}

export async function toggleProductAction(id: string, active: boolean) {
  await assertPermission("products:write");
  await prisma.product.update({ where: { id }, data: { active } });
  revalidatePath("/products");
}
