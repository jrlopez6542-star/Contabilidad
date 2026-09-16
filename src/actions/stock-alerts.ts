"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { sendManualLowStockAlert } from "@/lib/stock-alerts";

/** Manual "Enviar alerta ahora" from dashboard (admin/contador via products:write or company:write). */
export async function sendLowStockAlertNowAction() {
  // Prefer company:write (admin) — contador has company:read only; allow products:write OR reports via explicit check after roles merge uses dashboard.
  // With cash/audit permissions added, admin+contador have reports:read; use products:read + role via assertPermission products:write fails for contador.
  // Contador can send: use company:read is too weak. We'll assert dashboard:read then check canSend in caller UI; here use soft permission.
  const session = await assertPermission("dashboard:read");
  const role = session.role;
  if (role !== "superadmin" && role !== "admin" && role !== "contador") {
    return { error: "No tiene permiso para enviar alertas de stock." };
  }

  const res = await sendManualLowStockAlert();
  if (!res.ok) {
    return { error: res.error || "No se pudo enviar la alerta." };
  }
  await writeAudit(
    session,
    "notify",
    "stock",
    "",
    `Envió alerta manual de stock bajo (${res.count} producto(s))`
  );
  revalidatePath("/dashboard");
  return { ok: true as const, count: res.count };
}
