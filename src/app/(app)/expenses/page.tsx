import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { formatCOP, formatDate } from "@/lib/format";
import { Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { ExpenseForm } from "./form";
import { DeleteExpenseButton } from "./delete";

export default async function ExpensesPage() {
  await requirePermission("expenses:read");
  const session = await getSession();
  const canWrite = session ? can(session.role, "expenses:write") : false;
  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
  });
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHeader
        title="Gastos"
        subtitle={`Registro simple · Total listado: ${formatCOP(total)}`}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {canWrite && (
          <Card className="h-fit lg:col-span-1">
            <h2 className="mb-4 text-sm font-semibold">Nuevo gasto</h2>
            <ExpenseForm />
          </Card>
        )}
        <div className={canWrite ? "lg:col-span-2" : "lg:col-span-3"}>
          {expenses.length === 0 ? (
            <EmptyState message="No hay gastos registrados." />
          ) : (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Categoría</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Notas</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Monto</th>
                  {canWrite && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3">{formatDate(e.date)}</td>
                    <td className="px-4 py-3">{e.category}</td>
                    <td className="px-4 py-3 text-slate-500">{e.notes || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCOP(e.amount)}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <DeleteExpenseButton id={e.id} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
