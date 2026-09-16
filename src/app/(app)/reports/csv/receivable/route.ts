import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "reports:read")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const unpaid = await prisma.invoice.findMany({
    where: { status: "issued" },
    include: { customer: true, payments: true },
    orderBy: { issuedAt: "asc" },
  });
  const csv = toCsv(
    ["numero", "cliente", "nit", "emision", "total", "pagado", "saldo"],
    unpaid.map((i) => {
      const paid = i.payments.reduce((s, p) => s + p.amount, 0);
      return [
        i.number,
        i.customer.name,
        i.customer.nit,
        i.issuedAt?.toISOString().slice(0, 10) || "",
        i.total,
        paid,
        Math.max(0, i.total - paid),
      ];
    })
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cuentas-por-cobrar.csv"',
    },
  });
}
