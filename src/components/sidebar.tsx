"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { ROLE_LABELS, posNavLinks, type Role } from "@/lib/roles";
import { CompanyLogo } from "@/components/company-logo";
import { DEFAULT_COMPANY_NAME } from "@/lib/branding";

function getNavIcon(href: string) {
  switch (href) {
    case "/dashboard":
      return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case "/mostrador":
      return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case "/stock-rapido":
      return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case "/invoices":
      return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "/profile":
      return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    default:
      return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
  }
}

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
      className={`flex w-full shrink-0 flex-col border-r border-brand/20 bg-brand text-white shadow-xl dark:border-white/10 dark:bg-brand-950 sm:w-64 ${className}`}
    >
      {/* Brand Header */}
      <div className="relative border-b border-white/10 px-4 py-5">
        <div className={`flex items-center justify-center ${onClose ? "pr-10" : ""}`}>
          <CompanyLogo
            src="/logo-bunuelandia-sidebar.png"
            alt={name}
            className="h-16 w-auto max-h-16 object-contain drop-shadow-md sm:h-20 sm:max-h-20 transition-transform duration-300 hover:scale-105"
          />
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Cerrar menú"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-brand-200/60">
          Navegación Principal
        </p>

        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`group flex min-h-11 touch-manipulation items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                active
                  ? "bg-gold text-brand-950 shadow-md shadow-gold/20"
                  : "text-brand-100 hover:bg-white/10 hover:text-white hover:translate-x-1"
              }`}
            >
              <span className={`transition-colors duration-200 ${active ? "text-brand-950" : "text-brand-200 group-hover:text-gold"}`}>
                {getNavIcon(link.href)}
              </span>
              <span className="flex-1 truncate">{link.label}</span>
              {active && (
                <span className="h-1.5 w-1.5 rounded-full bg-brand-950" />
              )}
            </Link>
          );
        })}

        <div className="pt-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-[11px] font-semibold text-brand-200">
              ¿Más funciones?
            </p>
            <p className="mt-0.5 text-[10px] text-brand-100/70">
              Usa el icono de engranaje arriba a la derecha para reportes y ajustes.
            </p>
          </div>
        </div>
      </nav>

      {/* User Footer Card */}
      <div className="border-t border-white/10 bg-black/15 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-gold font-bold text-sm shadow-inner">
            {userName ? userName.slice(0, 2).toUpperCase() : "US"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white leading-tight">{userName}</p>
            <p className="text-xs font-medium text-brand-200/90 leading-tight">
              {ROLE_LABELS[userRole]}
            </p>
          </div>
        </div>

        <form action={logoutAction} className="mt-3.5">
          <button
            type="submit"
            className="flex min-h-10 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-brand-100 transition-all hover:bg-jam hover:border-jam hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
