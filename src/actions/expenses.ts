"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function createExpenseAction(formData: FormData) {
  const session = await assertPermission("expenses:write");
  const dateStr = String(formData.get("date") || "");
  const category = String(formData.get("category") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const notes = String(formData.get("notes") || "").trim();
  if (!dateStr || !category || amount <= 0) {
    return { error: "Fecha, categoría y monto son obligatorios." };
  }
  const expense = await prisma.expense.create({
    data: {
      date: new Date(dateStr + "T12:00:00"),
      category,
      amount,
      notes,
    },
  });
  await writeAudit(session, "create", "expense", expense.id, `Creó gasto ${category} ${amount}`);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true };
}

export async function updateExpenseAction(formData: FormData) {
  const session = await assertPermission("expenses:write");
  const id = String(formData.get("id") || "");
  const dateStr = String(formData.get("date") || "");
  const category = String(formData.get("category") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const notes = String(formData.get("notes") || "").trim();
  if (!id || !dateStr || !category || amount <= 0) {
    return { error: "Fecha, categoría y monto son obligatorios." };
  }
  await prisma.expense.update({
    where: { id },
    data: {
      date: new Date(dateStr + "T12:00:00"),
      category,
      amount,
      notes,
    },
  });
  await writeAudit(session, "update", "expense", id, `Actualizó gasto ${category}`);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true };
}

export async function deleteExpenseAction(id: string) {
  const session = await assertPermission("expenses:write");
  await prisma.expense.delete({ where: { id } });
  await writeAudit(session, "delete", "expense", id, "Eliminó gasto");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}
