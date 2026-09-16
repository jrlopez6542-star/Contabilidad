import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { permissionForPath } from "@/lib/roles";
import { can } from "@/lib/roles";
import { Sidebar } from "@/components/sidebar";
import { headers } from "next/headers";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Soft path guard using referer/x-url is unreliable; pages also call requirePermission.
  // Extra check when Next provides the path via middleware header (set below).
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

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={session.name} userRole={session.role} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
