import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import {
  formatCOP,
  formatDate,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHODS,
  SALE_PAYMENT_METHODS,
} from "@/lib/format";
import {
  Badge,
  Card,
  LinkButton,
  PageHeader,
  Table,
} from "@/components/ui";
import { InvoiceActions } from "./actions";
import { PaymentQuickForm } from "./payment-form";
import { DraftInvoiceEditor } from "./edit-draft";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePermission("invoices:read");
  const session = await getSession();
  const canWriteInvoice = session ? can(session.role, "invoices:write") : false;
  const canWritePayment = session ? can(session.role, "payments:write") : false;

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      items: true,
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!invoice) notFound();

  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
  const balance =
    invoice.status === "void" ? 0 : Math.max(0, invoice.total - paid);

  const customers =
    canWriteInvoice && invoice.status === "draft"
      ? await prisma.customer.findMany({ orderBy: { name: "asc" } })
      : [];
  const products =
    canWriteInvoice && invoice.status === "draft"
      ? await prisma.product.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
        })
      : [];

  return (
    <div>
      <PageHeader
        title={`Factura ${invoice.number}`}
        subtitle={invoice.customer.name}
        actions={
          <>
            <LinkButton
              href={`/invoices/${invoice.id}/pdf`}
              variant="secondary"
              hard
              className="w-full sm:w-auto"
            >
              Descargar PDF
            </LinkButton>
            <LinkButton href="/invoices" variant="ghost" className="w-full sm:w-auto">
              Volver
            </LinkButton>
          </>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Badge className={INVOICE_STATUS_COLORS[invoice.status]}>
          {INVOICE_STATUS_LABELS[invoice.status]}
        </Badge>
        <span className="text-sm text-slate-500">
          Emisión: {formatDate(invoice.issuedAt)}
        </span>
        {invoice.paymentMethod && (
          <span className="text-sm text-slate-600">
            Método:{" "}
            <strong>
              {PAYMENT_METHODS.find((m) => m.value === invoice.paymentMethod)
                ?.label || invoice.paymentMethod}
            </strong>
          </span>
        )}
        {canWriteInvoice && (
          <InvoiceActions
            id={invoice.id}
            status={invoice.status}
            number={invoice.number}
            initialPaymentMethod={invoice.paymentMethod || "efectivo"}
            saleMethods={SALE_PAYMENT_METHODS}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Cliente</h2>
          <p className="font-medium">{invoice.customer.name}</p>
          <p className="text-sm text-slate-600">NIT/CC: {invoice.customer.nit}</p>
          {invoice.customer.address && (
            <p className="text-sm text-slate-500">{invoice.customer.address}</p>
          )}
          {invoice.notes && (
            <p className="mt-3 text-sm text-slate-600">
              <span className="font-medium">Notas:</span> {invoice.notes}
            </p>
          )}

          <h2 className="mb-3 mt-6 text-sm font-semibold">Líneas</h2>
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Descripción
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  Cant.
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  Precio
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  IVA
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">
                    {formatCOP(item.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right">{item.ivaRate}%</td>
                  <td className="px-4 py-3 text-right">
                    {formatCOP(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="mt-4 space-y-1 text-right text-sm">
            <p>Subtotal: {formatCOP(invoice.subtotal)}</p>
            <p>IVA: {formatCOP(invoice.ivaTotal)}</p>
            <p className="text-base font-bold">Total: {formatCOP(invoice.total)}</p>
            <p className="text-slate-600">Pagado: {formatCOP(paid)}</p>
            <p className="font-semibold text-amber-700">
              Saldo: {formatCOP(balance)}
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          {canWritePayment &&
            (invoice.status === "issued" || invoice.status === "paid") &&
            balance > 0 && (
              <Card>
                <h2 className="mb-3 text-sm font-semibold">Registrar pago</h2>
                <PaymentQuickForm
                  invoiceId={invoice.id}
                  maxAmount={balance}
                  methods={PAYMENT_METHODS}
                  defaultMethod={invoice.paymentMethod || "transferencia"}
                />
              </Card>
            )}

          <Card>
            <h2 className="mb-3 text-sm font-semibold">Pagos</h2>
            {invoice.payments.length === 0 ? (
              <p className="text-sm text-slate-500">Sin pagos.</p>
            ) : (
              <ul className="space-y-3">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{formatCOP(p.amount)}</span>
                      <span className="text-slate-500">{formatDate(p.paidAt)}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {PAYMENT_METHODS.find((m) => m.value === p.method)?.label ||
                        p.method}
                      {p.notes ? ` · ${p.notes}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/payments"
              className="mt-3 inline-block text-xs text-brand hover:underline"
            >
              Ver todos los pagos
            </Link>
          </Card>
        </div>
      </div>

      {canWriteInvoice && invoice.status === "draft" && (
        <DraftInvoiceEditor
          invoiceId={invoice.id}
          initialCustomerId={invoice.customerId}
          initialNotes={invoice.notes}
          initialPaymentMethod={invoice.paymentMethod || "efectivo"}
          initialLines={invoice.items.map((item) => ({
            productId: item.productId || "",
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            ivaRate: item.ivaRate,
          }))}
          customers={customers.map((c) => ({
            id: c.id,
            name: c.name,
            nit: c.nit,
          }))}
          products={products.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            price: p.price,
            ivaRate: p.ivaRate,
          }))}
        />
      )}
    </div>
  );
}
