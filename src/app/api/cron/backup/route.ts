import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { buildBackupZip } from "@/lib/backup";
import { sendEmail } from "@/lib/email";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Resend limita adjuntos a ~40 MB por correo (base64 incluido). */
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  // Fail closed: sin CRON_SECRET (o demasiado corto) la ruta queda deshabilitada.
  if (!secret || secret.length < 16) return false;
  const header = req.headers.get("authorization") || "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

function parseEmails(raw: string | undefined | null): string[] {
  return (raw || "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
}

async function recipients(): Promise<string[]> {
  const fromEnv = parseEmails(process.env.BACKUP_EMAILS);
  if (fromEnv.length) return fromEnv;
  const company = await prisma.company.findFirst({ select: { email: true } });
  return parseEmails(company?.email);
}

/**
 * Respaldo diario automático (Vercel Cron, ver vercel.json).
 * Vercel envía `Authorization: Bearer $CRON_SECRET` cuando CRON_SECRET existe.
 * Genera el mismo ZIP de CSV que /backup/export y lo envía por correo (Resend).
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const to = await recipients();
  if (!to.length) {
    console.error("[cron/backup] Sin destinatarios (BACKUP_EMAILS / email de empresa).");
    return NextResponse.json(
      { ok: false, error: "no-recipients" },
      { status: 500 }
    );
  }

  const zip = await buildBackupZip();
  if (zip.length > MAX_ATTACHMENT_BYTES) {
    console.error("[cron/backup] ZIP demasiado grande para adjuntar", zip.length);
    return NextResponse.json(
      { ok: false, error: "too-large", bytes: zip.length },
      { status: 500 }
    );
  }

  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
  }).format(new Date());
  const filename = `contabilidad-backup-${day}.csv.zip`;
  const sizeKb = Math.max(1, Math.round(zip.length / 1024));

  const result = await sendEmail({
    to,
    subject: `Respaldo diario Contabilidad — ${day}`,
    html: `<p>Adjunto el respaldo automático del ${day} (${sizeKb} KB).</p><p>Contiene clientes, productos, facturas, ítems, pagos, gastos y cotizaciones en CSV. No incluye usuarios ni contraseñas.</p><p>Guárdelo en un lugar seguro.</p>`,
    text: `Adjunto el respaldo automático del ${day} (${sizeKb} KB). No incluye usuarios ni contraseñas.`,
    attachments: [{ filename, content: zip.toString("base64") }],
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: "email-failed" }, { status: 502 });
  }

  await writeAudit(
    null,
    "create",
    "backup",
    "",
    `Respaldo diario automático enviado a ${to.length} destinatario(s) (${sizeKb} KB)`
  );
  return NextResponse.json({ ok: true, bytes: zip.length, recipients: to.length });
}
