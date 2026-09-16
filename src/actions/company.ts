"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  companyLogoSrc,
  DEFAULT_LOGO,
  isAllowedLogoUrl,
  MAX_LOGO_DATA_URL_CHARS,
  MAX_LOGO_FILE_BYTES,
} from "@/lib/branding";

const ALLOWED_LOGO = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

/** Store the image as a data URL in the DB (Vercel has an ephemeral filesystem). */
async function saveLogoUpload(file: File | null): Promise<string | null> {
  if (!file || !file.size) return null;
  if (!ALLOWED_LOGO.has(file.type)) {
    throw new Error(
      "Formato de logo no permitido (use PNG, JPG, WEBP, GIF o SVG)."
    );
  }
  if (file.size > MAX_LOGO_FILE_BYTES) {
    throw new Error(
      "El logo no debe superar ~1.5 MB. Use una imagen más liviana."
    );
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/png";
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  if (dataUrl.length > MAX_LOGO_DATA_URL_CHARS) {
    throw new Error(
      "El logo es demasiado grande una vez convertido. Use una imagen más liviana (máx. ~1.5 MB)."
    );
  }
  return dataUrl;
}

export async function updateCompanyAction(formData: FormData) {
  const session = await assertPermission("company:write");
  const unpaidAlertDays = Math.max(
    1,
    Number(formData.get("unpaidAlertDays") || 30)
  );

  let logoUrl = String(formData.get("logoUrl") || "").trim();
  const logoFile = formData.get("logoFile");
  try {
    if (logoFile instanceof File && logoFile.size > 0) {
      const uploaded = await saveLogoUpload(logoFile);
      if (uploaded) logoUrl = uploaded;
    }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo guardar el logo.",
    };
  }

  if (!logoUrl) {
    const existing = await prisma.company.findFirst();
    logoUrl = companyLogoSrc(existing?.logoUrl);
  }
  if (!isAllowedLogoUrl(logoUrl)) {
    logoUrl = DEFAULT_LOGO;
  }

  const stockAlertEmails = String(formData.get("stockAlertEmails") || "")
    .split(/[,;\n]+/)
    .map((e) => e.trim())
    .filter(Boolean)
    .join(", ");
  const cashCloseEmails = String(formData.get("cashCloseEmails") || "")
    .split(/[,;\n]+/)
    .map((e) => e.trim())
    .filter(Boolean)
    .join(", ");

  const data = {
    name: String(formData.get("name") || "").trim(),
    nit: String(formData.get("nit") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    logoUrl,
    invoicePrefix: String(formData.get("invoicePrefix") || "FV").trim() || "FV",
    quotePrefix: String(formData.get("quotePrefix") || "COT").trim() || "COT",
    unpaidAlertDays,
    stockAlertEmails,
    cashCloseEmails,
  };
  if (!data.name || !data.nit) {
    return { error: "Razón social y NIT son obligatorios." };
  }
  const existing = await prisma.company.findFirst();
  if (existing) {
    await prisma.company.update({ where: { id: existing.id }, data });
    await writeAudit(
      session,
      "update",
      "company",
      existing.id,
      `Actualizó datos de empresa ${data.name}`
    );
  } else {
    const created = await prisma.company.create({ data });
    await writeAudit(
      session,
      "create",
      "company",
      created.id,
      `Creó empresa ${data.name}`
    );
  }
  revalidatePath("/company");
  revalidatePath("/dashboard");
  revalidatePath("/api/branding");
  revalidatePath("/login");
  return { ok: true };
}
