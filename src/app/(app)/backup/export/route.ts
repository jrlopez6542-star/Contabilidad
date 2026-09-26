import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { buildBackupZip, buildFiles } from "@/lib/backup";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const ONLY_MAP: Record<string, string> = {
  customers: "clientes.csv",
  products: "productos.csv",
  invoices: "facturas.csv",
  expenses: "gastos.csv",
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "backup:export")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const files = await buildFiles();
  const only = req.nextUrl.searchParams.get("only");

  if (only && ONLY_MAP[only]) {
    const name = ONLY_MAP[only] as keyof typeof files;
    await writeAudit(session, "create", "backup", "", `Exportó ${name}`);
    return new NextResponse(files[name], {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const buf = await buildBackupZip(files);
  await writeAudit(session, "create", "backup", "", "Exportó ZIP completo");

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="contabilidad-backup.csv.zip"',
      "Cache-Control": "no-store",
    },
  });
}
