import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** Decrease stock for invoice lines with tracked products. Throws if insufficient. */
export async function decreaseStockForItems(
  tx: Tx,
  items: { productId?: string | null; quantity: number; description: string }[]
) {
  for (const item of items) {
    if (!item.productId) continue;
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product || !product.trackStock) continue;
    if (product.stock < item.quantity) {
      throw new Error(
        `Stock insuficiente para "${item.description || product.name}" (disponible: ${product.stock}, solicitado: ${item.quantity}).`
      );
    }
    await tx.product.update({
      where: { id: product.id },
      data: { stock: product.stock - item.quantity },
    });
  }
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
