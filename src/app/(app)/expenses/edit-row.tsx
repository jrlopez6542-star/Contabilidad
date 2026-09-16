"use client";

import { useState } from "react";
import { updateExpenseAction } from "@/actions/expenses";
import { EXPENSE_CATEGORIES, formatCOP, formatDate } from "@/lib/format";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { DeleteExpenseButton } from "./delete";

type Expense = {
  id: string;
  date: string;
  category: string;
  amount: number;
  notes: string;
};

export function ExpenseEditRow({
  expense,
  canWrite,
}: {
  expense: Expense;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    formData.set("id", expense.id);
    const res = await updateExpenseAction(formData);
    if (res?.error) setError(res.error);
    else setOpen(false);
  }

  return (
    <>
      <tr>
        <td className="px-4 py-3">{formatDate(expense.date)}</td>
        <td className="px-4 py-3">{expense.category}</td>
        <td className="px-4 py-3 text-slate-500">{expense.notes || "—"}</td>
        <td className="px-4 py-3 text-right font-medium">
          {formatCOP(expense.amount)}
        </td>
        {canWrite && (
          <td className="space-x-3 px-4 py-3 text-right">
            <button
              type="button"
              onClick={() => {
                setOpen((v) => !v);
                setError(null);
              }}
              className="text-xs font-medium text-brand hover:underline"
            >
              {open ? "Cerrar" : "Editar"}
            </button>
            <DeleteExpenseButton id={expense.id} />
          </td>
        )}
      </tr>
      {canWrite && open && (
        <tr>
          <td colSpan={5} className="bg-slate-50 px-4 py-4">
            <form action={onSubmit} className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Fecha"
                name="date"
                type="date"
                required
                defaultValue={expense.date}
              />
              <Select
                label="Categoría"
                name="category"
                required
                defaultValue={expense.category}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {!EXPENSE_CATEGORIES.includes(expense.category) && (
                  <option value={expense.category}>{expense.category}</option>
                )}
              </Select>
              <Input
                label="Monto (COP)"
                name="amount"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={expense.amount}
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Notas"
                  name="notes"
                  rows={2}
                  defaultValue={expense.notes}
                />
              </div>
              {error && (
                <p className="text-sm text-jam sm:col-span-2">{error}</p>
              )}
              <div className="sm:col-span-2">
                <Button type="submit">Guardar cambios</Button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
