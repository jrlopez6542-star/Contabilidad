"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function createProductAction(formData: FormData) {
  const session = await assertPermission("products:write");
  const sku = String(formData.get("sku") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price") || 0);
  const ivaRate = Number(formData.get("ivaRate") || 19);
  const stock = Number(formData.get("stock") || 0);
  const minStock = Number(formData.get("minStock") || 5);
  const trackStock =
    formData.get("trackStock") === "on" ||
    formData.get("trackStock") === "true";
  if (!sku || !name || price < 0) {
    return { error: "SKU, nombre y precio son obligatorios." };
  }
  try {
    const product = await prisma.product.create({
      data: {
        sku,
        name,
        price,
        ivaRate,
        stock,
        minStock,
        trackStock,
        active: true,
      },
    });
    await writeAudit(session, "create", "product", product.id, `Creó producto ${sku}`);
  } catch {
    return { error: "No se pudo crear. ¿SKU duplicado?" };
  }
  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateProductAction(formData: FormData) {
  const session = await assertPermission("products:write");
  const id = String(formData.get("id") || "");
  const sku = String(formData.get("sku") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price") || 0);
  const ivaRate = Number(formData.get("ivaRate") || 19);
  const minStock = Number(formData.get("minStock") || 5);
  const active =
    formData.get("active") === "on" || formData.get("active") === "true";
  const trackStock =
    formData.get("trackStock") === "on" ||
    formData.get("trackStock") === "true";
  if (!id || !sku || !name || price < 0) {
    return { error: "SKU, nombre y precio son obligatorios." };
  }
  try {
    await prisma.product.update({
      where: { id },
      data: { sku, name, price, ivaRate, minStock, trackStock, active },
    });
    await writeAudit(session, "update", "product", id, `Actualizó producto ${sku}`);
  } catch {
    return { error: "No se pudo actualizar. ¿SKU duplicado?" };
  }
  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleProductAction(id: string, active: boolean) {
  const session = await assertPermission("products:write");
  await prisma.product.update({ where: { id }, data: { active } });
  await writeAudit(
    session,
    "update",
    "product",
    id,
    active ? "Activó producto" : "Desactivó producto"
  );
  revalidatePath("/products");
}

export async function adjustStockAction(formData: FormData) {
  const session = await assertPermission("products:write");
  const id = String(formData.get("id") || "");
  const mode = String(formData.get("mode") || "set");
  const value = Number(formData.get("value") || 0);
  if (!id) return { error: "Producto inválido." };

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return { error: "Producto no encontrado." };

  let newStock = mode === "delta" ? product.stock + value : value;
  if (newStock < 0) newStock = 0;

  await prisma.product.update({
    where: { id },
    data: { stock: newStock },
  });
  await writeAudit(
    session,
    "adjust",
    "stock",
    id,
    `Ajuste stock ${product.sku}: ${product.stock} → ${newStock}`
  );
  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { ok: true };
}
