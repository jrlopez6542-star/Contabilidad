"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { adminNavLinks, type Role } from "@/lib/roles";

const btnClass =
  "inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-brand/15 bg-surface text-brand shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:bg-brand-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-brand-200/25 dark:bg-brand-800/80 dark:text-brand-100 dark:hover:bg-brand-700";

export function SettingsMenu({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const groups = adminNavLinks(role);
  const hasAny =
    groups.operaciones.length +
      groups.administracion.length +
      groups.configuracion.length >
    0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!hasAny) return null;

  const sections: { title: string; links: typeof groups.operaciones }[] = [
    { title: "Operaciones", links: groups.operaciones },
    { title: "Administración", links: groups.administracion },
    { title: "Configuración", links: groups.configuracion },
  ].filter((s) => s.links.length > 0);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={`${btnClass} ${open ? "border-brand bg-brand-50 text-brand dark:border-gold dark:bg-brand-800" : ""}`}
        title="Configuraciones del sistema"
        aria-label="Configuraciones del sistema"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          className="h-5 w-5 transition-transform duration-300"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-[100] mt-2 w-64 max-h-[min(75vh,32rem)] overflow-y-auto rounded-2xl border border-brand/15 bg-white p-2 shadow-2xl ring-1 ring-black/5 dark:border-brand-200/25 dark:bg-brand-900"
        >
          {sections.map((section, idx) => (
            <div key={section.title} className="py-1">
              {idx > 0 && (
                <div className="my-2 border-t border-brand/10 dark:border-brand-200/15" />
              )}
              <div className="flex items-center gap-1.5 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-brand-200/70">
                  {section.title}
                </p>
              </div>
              <div className="mt-1 space-y-0.5">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-brand/5 hover:text-brand dark:text-brand-100 dark:hover:bg-brand-800 dark:hover:text-gold"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
