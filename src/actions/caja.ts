"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { bogotaDateString } from "@/lib/dates";
import { getDayBreakdown, sendCashCloseEmail } from "@/lib/cash";

export async function closeCajaAction(formData: FormData) {
  const session = await assertPermission("cash:write");
  const dateStr =
    String(formData.get("date") || "").trim() || bogotaDateString();
  const countedCash = Number(formData.get("countedCash") || 0);
  const notes = String(formData.get("notes") || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { error: "Fecha inválida." };
  }
  if (Number.isNaN(countedCash) || countedCash < 0) {
    return { error: "Ingrese el efectivo contado (número ≥ 0)." };
  }

  const existing = await prisma.cashClose.findUnique({ where: { date: dateStr } });
  if (existing && existing.status === "closed") {
    return { error: "La caja de este día ya está cerrada." };
  }

  const breakdown = await getDayBreakdown(dateStr);
  const expectedCash = breakdown.expectedCash;
  const difference = countedCash - expectedCash;

  const breakdownJson = JSON.stringify({
    efectivo: breakdown.efectivo,
    transferencia: breakdown.transferencia,
    tarjeta: breakdown.tarjeta,
    otro: breakdown.otro,
    expensesTotal: breakdown.expensesTotal,
    cashExpenses: breakdown.cashExpenses,
  });

  const data = {
    expectedCash,
    countedCash,
    difference,
    notes,
    closedByUserId: session.id,
    closedByEmail: session.email,
    status: "closed",
    breakdownJson,
  };

  let closeId: string;
  if (existing) {
    const updated = await prisma.cashClose.update({
      where: { id: existing.id },
      data,
    });
    closeId = updated.id;
  } else {
    const created = await prisma.cashClose.create({
      data: { date: dateStr, ...data },
    });
    closeId = created.id;
  }

  await writeAudit(
    session,
    "close",
    "cash",
    closeId,
    `Cerró caja ${dateStr}: contado ${countedCash}, esperado ${expectedCash}, diff ${difference}`
  );

  // Soft-fail email to cashCloseEmails only (never stock recipients).
  try {
    await sendCashCloseEmail({
      dateStr,
      breakdown,
      countedCash,
      difference,
      notes,
      closedByEmail: session.email,
    });
  } catch (e) {
    console.error("[caja] email hook failed", e);
  }

  revalidatePath("/caja");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function reopenCajaAction(formData: FormData) {
  const session = await assertPermission("cash:write");
  // Only admin/superadmin reopen
  if (session.role !== "superadmin" && session.role !== "admin") {
    return { error: "Solo un administrador puede reabrir la caja." };
  }
  const dateStr = String(formData.get("date") || "").trim();
  if (!dateStr) return { error: "Fecha inválida." };

  const existing = await prisma.cashClose.findUnique({ where: { date: dateStr } });
  if (!existing || existing.status !== "closed") {
    return { error: "No hay cierre cerrado para reabrir." };
  }

  await prisma.cashClose.update({
    where: { id: existing.id },
    data: { status: "open" },
  });
  await writeAudit(
    session,
    "reopen",
    "cash",
    existing.id,
    `Reabrió caja ${dateStr}`
  );
  revalidatePath("/caja");
  return { ok: true as const };
}
