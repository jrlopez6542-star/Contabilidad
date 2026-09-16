"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { CompanyLogo } from "@/components/company-logo";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Role } from "@/lib/roles";

export function AppShell({
  userName,
  userRole,
  companyName,
  logoUrl,
  children,
}: {
  userName: string;
  userRole: Role;
  companyName: string;
  logoUrl?: string;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      const mode = document.documentElement.dataset.viewMode;
      if (mode === "mobile") return;
      if (mq.matches) setDrawerOpen(false);
    };
    mq.addEventListener("change", sync);
    window.addEventListener("contabilidad-view-mode", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("contabilidad-view-mode", sync);
    };
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Permanent sidebar — visible on md+ (auto) or forced desktop */}
      <div className="app-sidebar-desktop sticky top-0 h-screen shrink-0 self-start">
        <Sidebar
          userName={userName}
          userRole={userRole}
          companyName={companyName}
          logoUrl={logoUrl}
          className="h-screen"
        />
      </div>

      {/* Mobile slide-over drawer (mounted only when open) */}
      {drawerOpen && (
        <div className="app-mobile-only fixed inset-0 z-40" role="presentation">
          <button
            type="button"
            className="app-drawer-backdrop absolute inset-0 bg-brand/40"
            aria-label="Cerrar menú"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="app-drawer-panel absolute inset-y-0 left-0 flex w-[min(100%,20rem)] max-w-[85vw] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <Sidebar
              userName={userName}
              userRole={userRole}
              companyName={companyName}
              logoUrl={logoUrl}
              onNavigate={() => setDrawerOpen(false)}
              onClose={() => setDrawerOpen(false)}
              className="h-full w-full shadow-2xl"
            />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-auto bg-cream-muted">
        <header className="sticky top-0 z-30 border-b border-brand/10 bg-cream/95 backdrop-blur dark:border-brand-200/15 dark:bg-cream-muted/95">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
            <button
              type="button"
              className="app-mobile-only inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-brand/15 bg-surface text-brand shadow-sm hover:bg-brand-50 dark:border-brand-200/25 dark:text-brand-100 dark:hover:bg-brand-800"
              aria-label="Abrir menú"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <CompanyLogo
                src={logoUrl}
                alt={companyName}
                className="app-header-logo h-12 w-auto max-h-12 shrink-0 object-contain drop-shadow-sm sm:h-14 sm:max-h-14"
              />
              <p className="hidden min-w-0 truncate text-xs text-slate-500 dark:text-brand-200 sm:block">
                Panel de gestión
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <ThemeToggle />
              <ViewModeToggle compact />
            </div>
          </div>
        </header>
        <div className="app-content-clip mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
