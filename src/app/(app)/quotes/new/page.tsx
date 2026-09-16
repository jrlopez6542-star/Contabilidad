import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { LinkButton, PageHeader } from "@/components/ui";
import { QuoteForm } from "./form";

export default async function NewQuotePage() {
  await requirePermission("quotes:write");
  const [customers, products] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Nueva cotización"
        actions={
          <LinkButton href="/quotes" variant="ghost">
            Volver
          </LinkButton>
        }
      />
      <QuoteForm customers={customers} products={products} />
    </div>
  );
}
