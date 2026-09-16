"use client";

import { useState } from "react";
import { createExpenseAction } from "@/actions/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/format";
import { Button, Input, Select, Textarea } from "@/components/ui";

export function ExpenseForm() {
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(formData: FormData) {
    setError(null);
    const res = await createExpenseAction(formData);
    if (res?.error) setError(res.error);
    else (document.getElementById("expense-form") as HTMLFormElement)?.reset();
  }

  return (
    <form id="expense-form" action={onSubmit} className="space-y-3">
      <Input label="Fecha" name="date" type="date" required defaultValue={today} />
      <Select label="Categoría" name="category" required defaultValue="">
        <option value="" disabled>
          Seleccione…
        </option>
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Input label="Monto (COP)" name="amount" type="number" min={1} step={1} required />
      <Textarea label="Notas" name="notes" rows={2} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full">
        Registrar
      </Button>
    </form>
  );
}
