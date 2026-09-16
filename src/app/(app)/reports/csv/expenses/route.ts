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
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });
  const byCat = new Map<string, number>();
  for (const e of expenses) {
    byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount);
  }
  const csv = toCsv(
    ["categoria", "total"],
    Array.from(byCat.entries()).map(([c, t]) => [c, t])
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="gastos-categoria.csv"',
    },
  });
}
