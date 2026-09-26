import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { permissionForPath } from "@/lib/roles";
import { can } from "@/lib/roles";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { DEFAULT_COMPANY_NAME, companyLogoSrc } from "@/lib/branding";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login?expired=1");

  const path =
    headers().get("x-pathname") ||
    headers().get("x-invoke-path") ||
    "";
  if (path) {
    const needed = permissionForPath(path);
    if (needed && !can(session.role, needed)) {
      redirect("/dashboard");
    }
  }

  const company = await prisma.company.findFirst();
  const companyName = company?.name || DEFAULT_COMPANY_NAME;
  const logoUrl = companyLogoSrc(company?.logoUrl);

  return (
    <AppShell
      userId={session.id}
      userName={session.name}
      userRole={session.role}
      companyName={companyName}
      logoUrl={logoUrl}
    >
      {children}
    </AppShell>
  );
}
