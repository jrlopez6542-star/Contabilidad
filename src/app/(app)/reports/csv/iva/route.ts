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
  const { searchParams } = req.nextUrl;
  const from = new Date((searchParams.get("from") || "2000-01-01") + "T00:00:00");
  const to = new Date((searchParams.get("to") || "2100-12-31") + "T23:59:59");
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ["issued", "paid"] },
      issuedAt: { gte: from, lte: to },
    },
    include: { customer: true },
    orderBy: { issuedAt: "asc" },
  });
  const csv = toCsv(
    ["numero", "cliente", "fecha", "base", "iva", "total"],
    invoices.map((i) => [
      i.number,
      i.customer.name,
      i.issuedAt?.toISOString().slice(0, 10) || "",
      i.subtotal,
      i.ivaTotal,
      i.total,
    ])
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="iva.csv"',
    },
  });
}
