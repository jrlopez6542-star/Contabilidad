import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import Link from "next/link";

export default async function ImpresoraHelpPage() {
  const session = await getSession();
  if (!session) redirect("/login?expired=1");

  return (
    <div>
      <PageHeader
        title="Impresora térmica"
        subtitle="Cómo imprimir el ticket desde el detalle de una factura."
      />

      <Card className="space-y-4 text-sm text-slate-700 dark:text-brand-100">
        <p>
          La app no configura la impresora por sí sola: usa el diálogo de
          impresión del navegador (o el PDF del ticket) apuntando a su
          impresora térmica de 58/80&nbsp;mm.
        </p>

        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Abra la factura en{" "}
            <Link href="/invoices" className="font-medium text-brand underline">
              Facturas
            </Link>{" "}
            (o desde Mostrador después de cobrar).
          </li>
          <li>
            En el detalle encontrará el botón de ticket / imprimir (vista térmica
            o PDF).
          </li>
          <li>
            Elija su impresora térmica en el diálogo del sistema. Si imprime
            papel grande, seleccione el tamaño de papel o “ajuste al ancho”
            según el driver.
          </li>
          <li>
            Para reimprimir, vuelva al mismo detalle de factura: no hace falta
            emitir de nuevo.
          </li>
        </ol>

        <p className="text-xs text-slate-500 dark:text-brand-200">
          Tip: en tablets o cajas con Chrome, marque la impresora térmica como
          predeterminada del sistema para ahorrar un clic en cada venta.
        </p>
      </Card>
    </div>
  );
}
