import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export type PackagingMovementMeta = {
  reason?: string;
  refNumber?: string;
  userId?: string | null;
  userEmail?: string;
};

const SUPPLY_LABEL: Record<string, string> = {
  C4: "cajas X4",
  C10: "cajas X10",
};

/** Map sellable SKU to packaging supply code (C4 / C10), or null. */
export function packagingSupplyCodeForProductSku(sku: string): string | null {
  const u = sku.toUpperCase();
  if (u.startsWith("C10")) return "C10";
  if (u.startsWith("C4")) return "C4";
  return null;
}

function supplyLabel(code: string): string {
  return SUPPLY_LABEL[code] || code;
}

async function aggregatePackagingDemand(
  tx: Tx,
  items: { productId?: string | null; quantity: number }[]
): Promise<Map<string, number>> {
  const demand = new Map<string, number>();
  const productIds = Array.from(
    new Set(
      items
        .map((i) => i.productId)
        .filter((id): id is string => !!id)
    )
  );
  if (productIds.length === 0) return demand;

  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, sku: true },
  });
  const skuById = new Map(products.map((p) => [p.id, p.sku]));

  for (const item of items) {
    if (!item.productId || item.quantity <= 0) continue;
    const sku = skuById.get(item.productId);
    if (!sku) continue;
    const code = packagingSupplyCodeForProductSku(sku);
    if (!code) continue;
    demand.set(code, (demand.get(code) || 0) + item.quantity);
  }
  return demand;
}

/** Decrease packaging supplies for C4/C10 product sales. Throws if insufficient. */
export async function decreasePackagingForItems(
  tx: Tx,
  items: { productId?: string | null; quantity: number }[],
  meta?: PackagingMovementMeta
): Promise<boolean> {
  const demand = await aggregatePackagingDemand(tx, items);
  if (demand.size === 0) return false;

  let changed = false;
  for (const [code, needed] of Array.from(demand.entries())) {
    const supply = await tx.supply.findUnique({ where: { code } });
    if (!supply) {
      throw new Error(
        `No se encontró el insumo de empaque ${code} (${supplyLabel(code)}).`
      );
    }
    const available = supply.quantity;
    if (available < needed) {
      throw new Error(
        `No hay suficientes ${supplyLabel(code)} en insumos (hay ${available}, se necesitan ${needed}).`
      );
    }
    const after = available - needed;
    await tx.supply.update({
      where: { id: supply.id },
      data: { quantity: after },
    });
    await tx.supplyMovement.create({
      data: {
        supplyId: supply.id,
        type: "out",
        quantity: needed,
        quantityBefore: available,
        quantityAfter: after,
        reason:
          meta?.reason ||
          `Empaque venta${meta?.refNumber ? ` ${meta.refNumber}` : ""}`,
        userId: meta?.userId ?? null,
        userEmail: meta?.userEmail || "",
      },
    });
    changed = true;
  }
  return changed;
}

/** Restore packaging supplies when voiding an issued invoice. */
export async function restorePackagingForItems(
  tx: Tx,
  items: { productId?: string | null; quantity: number }[],
  meta?: PackagingMovementMeta
): Promise<boolean> {
  const demand = await aggregatePackagingDemand(tx, items);
  if (demand.size === 0) return false;

  let changed = false;
  for (const [code, qty] of Array.from(demand.entries())) {
    const supply = await tx.supply.findUnique({ where: { code } });
    if (!supply) continue;
    const before = supply.quantity;
    const after = before + qty;
    await tx.supply.update({
      where: { id: supply.id },
      data: { quantity: after },
    });
    await tx.supplyMovement.create({
      data: {
        supplyId: supply.id,
        type: "in",
        quantity: qty,
        quantityBefore: before,
        quantityAfter: after,
        reason:
          meta?.reason ||
          `Empaque anulación${meta?.refNumber ? ` ${meta.refNumber}` : ""}`,
        userId: meta?.userId ?? null,
        userEmail: meta?.userEmail || "",
      },
    });
    changed = true;
  }
  return changed;
}
