"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth";

export async function createExpenseAction(formData: FormData) {
  await assertPermission("expenses:write");
  const dateStr = String(formData.get("date") || "");
  const category = String(formData.get("category") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const notes = String(formData.get("notes") || "").trim();
  if (!dateStr || !category || amount <= 0) {
    return { error: "Fecha, categoría y monto son obligatorios." };
  }
  await prisma.expense.create({
    data: {
      date: new Date(dateStr + "T12:00:00"),
      category,
      amount,
      notes,
    },
  });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteExpenseAction(id: string) {
  await assertPermission("expenses:write");
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}
