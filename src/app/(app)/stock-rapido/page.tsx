import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { StockRapidoSearch } from "./stock-search";

export default async function StockRapidoPage() {
  await requirePermission("products:read");
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      sku: true,
      name: true,
      price: true,
      stock: true,
      trackStock: true,
      active: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="Stock / precio rápido"
        subtitle="Consulta rápida de SKU, precio y existencias. Solo lectura."
      />
      <StockRapidoSearch products={products} />
    </div>
  );
}
