"use client";

import { deleteExpenseAction } from "@/actions/expenses";

export function DeleteExpenseButton({ id }: { id: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("¿Eliminar este gasto?")) deleteExpenseAction(id);
      }}
      className="text-xs text-jam hover:underline"
    >
      Eliminar
    </button>
  );
}
