import { requirePermission } from "@/lib/auth";
import { Card, LinkButton, PageHeader } from "@/components/ui";

export default async function BackupPage() {
  await requirePermission("backup:export");

  return (
    <div>
      <PageHeader
        title="Respaldo / Exportación"
        subtitle="Descargue CSV de datos clave (solo administradores)"
      />
      <Card className="max-w-xl space-y-4">
        <p className="text-sm text-slate-600">
          Exporte un ZIP con clientes, productos, facturas, ítems, pagos, gastos y
          cotizaciones. Útil como respaldo manual (no incluye usuarios ni
          contraseñas).
        </p>
        <LinkButton href="/backup/export" hard>Descargar ZIP completo</LinkButton>
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            CSV individuales
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/backup/export?only=customers" variant="secondary" hard>
              Clientes
            </LinkButton>
            <LinkButton href="/backup/export?only=products" variant="secondary" hard>
              Productos
            </LinkButton>
            <LinkButton href="/backup/export?only=invoices" variant="secondary" hard>
              Facturas
            </LinkButton>
            <LinkButton href="/backup/export?only=expenses" variant="secondary" hard>
              Gastos
            </LinkButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
