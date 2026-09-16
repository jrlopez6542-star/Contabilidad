import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  companyLogoSrc,
  DEFAULT_COMPANY_NAME,
  DEFAULT_LOGO,
} from "@/lib/branding";

export const dynamic = "force-dynamic";

/** Public branding for unauthenticated pages (login). */
export async function GET() {
  try {
    const company = await prisma.company.findFirst({
      select: { name: true, logoUrl: true },
    });
    return NextResponse.json({
      name: company?.name?.trim() || DEFAULT_COMPANY_NAME,
      logoUrl: companyLogoSrc(company?.logoUrl) || DEFAULT_LOGO,
    });
  } catch {
    return NextResponse.json({
      name: DEFAULT_COMPANY_NAME,
      logoUrl: DEFAULT_LOGO,
    });
  }
}
