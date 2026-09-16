"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { ROLE_LABELS, navLinksForRole, type Role } from "@/lib/roles";

export function Sidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: Role;
}) {
  const pathname = usePathname();
  const links = navLinksForRole(userRole);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
            C
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Contabilidad</p>
            <p className="text-xs text-slate-500">MVP interno</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <p className="truncate text-sm font-medium text-slate-800">{userName}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {ROLE_LABELS[userRole]}
        </p>
        <form action={logoutAction} className="mt-2">
          <button
            type="submit"
            className="text-xs font-medium text-slate-500 hover:text-red-600"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
