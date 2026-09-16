import { prisma } from "@/lib/prisma";
import {
  companyLogoSrc,
  DEFAULT_COMPANY_NAME,
  DEFAULT_LOGO,
} from "@/lib/branding";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

/** Server wrapper: prefer company logo from DB for first paint. */
export default async function LoginPage() {
  let companyName = DEFAULT_COMPANY_NAME;
  let logoUrl = DEFAULT_LOGO;
  try {
    const company = await prisma.company.findFirst({
      select: { name: true, logoUrl: true },
    });
    if (company?.name?.trim()) companyName = company.name.trim();
    logoUrl = companyLogoSrc(company?.logoUrl) || DEFAULT_LOGO;
  } catch {
    /* keep defaults */
  }
  return <LoginForm companyName={companyName} logoUrl={logoUrl} />;
}
