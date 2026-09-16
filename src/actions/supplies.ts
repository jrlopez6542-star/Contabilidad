"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  isSupplyCategory,
  isSupplyUnit,
  isPackagingSupplyCode,
  PACKAGING_DEFAULT_MIN_STOCK,
} from "@/lib/supplies";

export async function createSupplyAction(formData: FormData) {
  const session = await assertPermission("supplies:write");
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const categoryRaw = String(formData.get("category") || "otro").trim();
  const unitRaw = String(formData.get("unit") || "unidad").trim();
  const quantity = Number(formData.get("quantity") || 0);
  const requestedMinStock = Number(formData.get("minStock") || 0);
  const unitCost = Number(formData.get("unitCost") || 0);
  const notes = String(formData.get("notes") || "").trim();

  const category = isSupplyCategory(categoryRaw) ? categoryRaw : "otro";
  const unit = isSupplyUnit(unitRaw) ? unitRaw : "unidad";

  if (!code || !name) {
    return { error: "Código y nombre son obligatorios." };
  }
  if (quantity < 0 || requestedMinStock < 0 || unitCost < 0) {
    return { error: "Cantidad, mínimo y costo no pueden ser negativos." };
  }

  // C4/C10 are packaging and always keep the default alert minimum of 100.
  const minStock = isPackagingSupplyCode(code)
    ? PACKAGING_DEFAULT_MIN_STOCK
    : requestedMinStock;

  try {
    const supply = await prisma.supply.create({
      data: {
        code,
        name,
        category,
        unit,
        quantity,
        minStock,
        unitCost,
        notes,
        active: true,
      },
    });
    if (quantity > 0) {
      await prisma.supplyMovement.create({
        data: {
          supplyId: supply.id,
          type: "in",
          quantity,
          quantityBefore: 0,
          quantityAfter: quantity,
          reason: "Stock inicial",
          userId: session.id,
          userEmail: session.email,
        },
      });
    }
    await writeAudit(
      session,
      "create",
      "supply",
      supply.id,
      `Creó insumo ${code}`
    );
  } catch {
    return { error: "No se pudo crear. ¿Código duplicado?" };
  }
  revalidatePath("/insumos");
  return { ok: true };
}

export async function updateSupplyAction(formData: FormData) {
  const session = await assertPermission("supplies:write");
  const id = String(formData.get("id") || "");
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const categoryRaw = String(formData.get("category") || "otro").trim();
  const unitRaw = String(formData.get("unit") || "unidad").trim();
  const requestedMinStock = Number(formData.get("minStock") || 0);
  const unitCost = Number(formData.get("unitCost") || 0);
  const notes = String(formData.get("notes") || "").trim();
  const active =
    formData.get("active") === "on" || formData.get("active") === "true";

  const category = isSupplyCategory(categoryRaw) ? categoryRaw : "otro";
  const unit = isSupplyUnit(unitRaw) ? unitRaw : "unidad";

  if (!id || !code || !name) {
    return { error: "Código y nombre son obligatorios." };
  }
  if (requestedMinStock < 0 || unitCost < 0) {
    return { error: "Mínimo y costo no pueden ser negativos." };
  }

  // C4/C10 are packaging and always keep the default alert minimum of 100.
  const minStock = isPackagingSupplyCode(code)
    ? PACKAGING_DEFAULT_MIN_STOCK
    : requestedMinStock;

  try {
    await prisma.supply.update({
      where: { id },
      data: { code, name, category, unit, minStock, unitCost, notes, active },
    });
    await writeAudit(
      session,
      "update",
      "supply",
      id,
      `Actualizó insumo ${code}`
    );
  } catch {
    return { error: "No se pudo actualizar. ¿Código duplicado?" };
  }
  revalidatePath("/insumos");
  return { ok: true };
}

export async function toggleSupplyActiveAction(id: string, active: boolean) {
  const session = await assertPermission("supplies:write");
  await prisma.supply.update({ where: { id }, data: { active } });
  await writeAudit(
    session,
    "update",
    "supply",
    id,
    active ? "Activó insumo" : "Desactivó insumo"
  );
  revalidatePath("/insumos");
}

export async function adjustSupplyStockAction(formData: FormData) {
  const session = await assertPermission("supplies:write");
  const id = String(formData.get("id") || "");
  const type = String(formData.get("type") || "").trim();
  const quantity = Number(formData.get("quantity") || 0);
  const reason = String(formData.get("reason") || "").trim();

  if (!id) return { error: "Insumo inválido." };
  if (type !== "in" && type !== "out" && type !== "adjust") {
    return { error: "Tipo de movimiento inválido." };
  }
  if (!(quantity > 0) || Number.isNaN(quantity)) {
    return { error: "La cantidad debe ser mayor que cero." };
  }

  const supply = await prisma.supply.findUnique({ where: { id } });
  if (!supply) return { error: "Insumo no encontrado." };

  const before = supply.quantity;
  let after = before;
  if (type === "in") {
    after = before + quantity;
  } else if (type === "out") {
    after = before - quantity;
    if (after < 0) {
      return { error: "No hay cantidad suficiente para la salida." };
    }
  } else {
    // adjust: set absolute quantity
    after = quantity;
  }

  const movementQty =
    type === "adjust" ? Math.abs(after - before) : quantity;

  await prisma.$transaction(async (tx) => {
    await tx.supply.update({
      where: { id },
      data: { quantity: after },
    });
    if (movementQty > 0 || type === "adjust") {
      await tx.supplyMovement.create({
        data: {
          supplyId: id,
          type,
          quantity: type === "adjust" ? (movementQty || 0) : quantity,
          quantityBefore: before,
          quantityAfter: after,
          reason:
            reason ||
            (type === "in"
              ? "Entrada"
              : type === "out"
                ? "Salida"
                : "Ajuste"),
          userId: session.id,
          userEmail: session.email,
        },
      });
    }
  });

  await writeAudit(
    session,
    "adjust",
    "supply",
    id,
    `Stock ${supply.code}: ${before} → ${after}${reason ? ` (${reason})` : ""}`
  );
  revalidatePath("/insumos");
  return { ok: true };
}
