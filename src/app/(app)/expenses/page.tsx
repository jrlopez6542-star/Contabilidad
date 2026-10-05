import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { formatCOP, formatDateInput } from "@/lib/format";
import { Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { ExpenseForm } from "./form";
import { ExpenseEditRow } from "./edit-row";

export default async function ExpensesPage() {
  await requirePermission("expenses:read");
  const session = await getSession();
  const canWrite = session ? can(session.role, "expenses:write") : false;
  const [expenses, sumAgg] = await Promise.all([
    prisma.expense.findMany({
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
    }),
  ]);
  const total = sumAgg._sum.amount ?? 0;

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
                  <ExpenseEditRow
                    key={e.id}
                    canWrite={canWrite}
                    expense={{
                      id: e.id,
                      date: formatDateInput(e.date),
                      category: e.category,
                      amount: e.amount,
                      notes: e.notes,
                    }}
                  />
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
