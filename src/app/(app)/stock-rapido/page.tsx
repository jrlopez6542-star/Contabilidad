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
        title="Buscar producto"
        subtitle="Busca por nombre o SKU; verás precio y stock. El alta de productos está en el Panel (desplegable)."
      />
      <StockRapidoSearch products={products} />
    </div>
  );
}
