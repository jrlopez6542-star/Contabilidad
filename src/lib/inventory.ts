import type { Prisma } from "@prisma/client";
import type { StockCrossEvent } from "./stock-alerts";
import { crossedLowStockThreshold } from "./stock-alerts";

type Tx = Prisma.TransactionClient;

/** Decrease stock for invoice lines with tracked products. Throws if insufficient.
 *  Returns products that crossed minStock (was above → now <=) for email alerts.
 */
export async function decreaseStockForItems(
  tx: Tx,
  items: { productId?: string | null; quantity: number; description: string }[]
): Promise<StockCrossEvent[]> {
  const crossings: StockCrossEvent[] = [];
  for (const item of items) {
    if (!item.productId) continue;
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product || !product.trackStock) continue;
    if (product.stock < item.quantity) {
      throw new Error(
        `Stock insuficiente para "${item.description || product.name}" (disponible: ${product.stock}, solicitado: ${item.quantity}).`
      );
    }
    const previousStock = product.stock;
    const newStock = product.stock - item.quantity;
    await tx.product.update({
      where: { id: product.id },
      data: { stock: newStock },
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
  return crossings;
}

/** Restore stock when voiding an issued invoice. */
export async function restoreStockForItems(
  tx: Tx,
  items: { productId?: string | null; quantity: number }[]
) {
  for (const item of items) {
    if (!item.productId) continue;
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product || !product.trackStock) continue;
    await tx.product.update({
      where: { id: product.id },
      data: { stock: product.stock + item.quantity },
    });
  }
}
