"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { ROLE_LABELS, posNavLinks, type Role } from "@/lib/roles";
import { CompanyLogo } from "@/components/company-logo";
import { DEFAULT_COMPANY_NAME } from "@/lib/branding";

export function Sidebar({
  userName,
  userRole,
  companyName,
  logoUrl: _unusedLogoUrl,
  onNavigate,
  onClose,
  className = "",
}: {
  userName: string;
  userRole: Role;
  companyName?: string;
  /** Kept for API compatibility; sidebar uses fixed brand asset. */
  logoUrl?: string;
  onNavigate?: () => void;
  onClose?: () => void;
  className?: string;
}) {
  void _unusedLogoUrl;
  const pathname = usePathname();
  const links = posNavLinks(userRole);
  const name = companyName || DEFAULT_COMPANY_NAME;

  return (
    <aside
      className={`flex w-full shrink-0 flex-col border-r border-brand/15 bg-brand text-white dark:border-white/10 dark:bg-brand-900 sm:w-64 ${className}`}
    >
      <div className="relative border-b border-white/10 px-3 py-4 sm:px-4 sm:py-5">
        <div className={`flex items-center justify-center ${onClose ? "pr-10" : ""}`}>
          <CompanyLogo
            src="/logo-bunuelandia-sidebar.png"
            alt={name}
            className="h-[4.25rem] w-auto max-h-[4.25rem] object-contain sm:h-20 sm:max-h-20"
          />
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-white/90 hover:bg-white/10"
            aria-label="Cerrar menú"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={`flex min-h-11 touch-manipulation items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-gold text-white shadow-sm"
                  : "text-brand-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <p className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-wide text-brand-200/70">
          Más opciones → engranaje arriba
        </p>
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-medium text-white">{userName}</p>
        <p className="mt-0.5 text-xs text-brand-200">
          {ROLE_LABELS[userRole]}
        </p>
        <form action={logoutAction} className="mt-3">
          <button
            type="submit"
            className="flex min-h-11 w-full touch-manipulation items-center justify-center rounded-lg border border-white/15 px-3 text-sm font-medium text-brand-100 hover:bg-white/10 hover:text-gold-light"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
