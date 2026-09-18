import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { ProductForm } from "../form";

export default async function NuevoProductoPage() {
  await requirePermission("products:write");

  return (
    <div>
      <PageHeader
        title="Nuevo producto"
        subtitle="Alta de SKU, precio, IVA e inventario"
      />
      <p className="mb-4">
        <Link
          href="/products"
          className="text-sm font-medium text-brand hover:underline"
        >
          ← Volver al catálogo
        </Link>
      </p>
      <Card className="max-w-lg">
        <ProductForm redirectTo="/products" />
      </Card>
    </div>
  );
}
