import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { Card, PageHeader } from "@/components/ui";
import { CompanyForm } from "./form";

export default async function CompanyPage() {
  await requirePermission("company:read");
  const session = await getSession();
  const canWrite = session ? can(session.role, "company:write") : false;
  const company = await prisma.company.findFirst();

  return (
    <div>
      <PageHeader
        title="Empresa"
        subtitle={
          canWrite
            ? "Marca, datos fiscales, numeración y alertas"
            : "Perfil de la compañía (solo lectura)"
        }
      />
      <Card className="max-w-2xl">
        <CompanyForm company={company} readOnly={!canWrite} />
      </Card>
    </div>
  );
}
