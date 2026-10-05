import type { Prisma } from "@prisma/client";
import type { StockCrossEvent } from "./stock-alerts";
import { crossedLowStockThreshold } from "./stock-alerts";

type Tx = Prisma.TransactionClient;

/** Optional metadata for StockMovement ledger rows. */
export type StockMovementMeta = {
  reason?: string;
  refType?: "invoice" | "adjust" | "manual" | string;
  refId?: string;
  refNumber?: string;
  userId?: string | null;
  userEmail?: string;
};

/** Decrease stock for invoice lines with tracked products. Throws if insufficient.
 *  Returns products that crossed minStock (was above → now <=) for email alerts.
 * Writes StockMovement type=out when stock changes.
 */
export async function decreaseStockForItems(
  tx: Tx,
  items: { productId?: string | null; quantity: number; description: string }[],
  meta?: StockMovementMeta
): Promise<StockCrossEvent[]> {
  const crossings: StockCrossEvent[] = [];
  const validItems = items.filter((i) => i.productId);
  if (!validItems.length) return crossings;

  const productIds = Array.from(new Set(validItems.map((i) => i.productId as string)));
  const products = await tx.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const movementsData = [];

  for (const item of validItems) {
    const product = productMap.get(item.productId as string);
    if (!product || !product.trackStock) continue;
    if (product.stock < item.quantity) {
      throw new Error(
        `Stock insuficiente para "${item.description || product.name}" (disponible: ${product.stock}, solicitado: ${item.quantity}).`
      );
    }
    const previousStock = product.stock;
    const newStock = product.stock - item.quantity;
    
    // Update local product map
    product.stock = newStock;

    await tx.product.update({
      where: { id: product.id },
      data: { stock: { decrement: item.quantity } },
    });

    movementsData.push({
      productId: product.id,
      type: "out",
      quantity: item.quantity,
      stockBefore: previousStock,
      stockAfter: newStock,
      reason: meta?.reason || `Salida${meta?.refNumber ? ` ${meta.refNumber}` : ""}`,
      refType: meta?.refType || "invoice",
      refId: meta?.refId || "",
      refNumber: meta?.refNumber || "",
      userId: meta?.userId ?? null,
      userEmail: meta?.userEmail || "",
    });

    // Hook: threshold crossing for stock-alert email (caller sends after commit).
    if (crossedLowStockThreshold(previousStock, newStock, product.minStock)) {
      crossings.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        previousStock,
        newStock,
        minStock: product.minStock,
      });
    }
  }

  if (movementsData.length > 0) {
    await tx.stockMovement.createMany({ data: movementsData });
  }
  return crossings;
}

/** Restore stock when voiding an issued invoice. Writes StockMovement type=in. */
export async function restoreStockForItems(
  tx: Tx,
  items: { productId?: string | null; quantity: number }[],
  meta?: StockMovementMeta
) {
  const validItems = items.filter((i) => i.productId);
  if (!validItems.length) return;

  const productIds = Array.from(new Set(validItems.map((i) => i.productId as string)));
  const products = await tx.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const movementsData = [];

  for (const item of validItems) {
    const product = productMap.get(item.productId as string);
    if (!product || !product.trackStock) continue;
    
    const previousStock = product.stock;
    const newStock = product.stock + item.quantity;
    
    // Update local product map
    product.stock = newStock;

    await tx.product.update({
      where: { id: product.id },
      data: { stock: { increment: item.quantity } },
    });

    movementsData.push({
      productId: product.id,
      type: "in",
      quantity: item.quantity,
      stockBefore: previousStock,
      stockAfter: newStock,
      reason: meta?.reason || `Entrada${meta?.refNumber ? ` ${meta.refNumber}` : ""}`,
      refType: meta?.refType || "invoice",
      refId: meta?.refId || "",
      refNumber: meta?.refNumber || "",
      userId: meta?.userId ?? null,
      userEmail: meta?.userEmail || "",
    });
  }

  if (movementsData.length > 0) {
    await tx.stockMovement.createMany({ data: movementsData });
  }
}
