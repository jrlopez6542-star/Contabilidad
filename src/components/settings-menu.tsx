"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { adminNavLinks, type Role } from "@/lib/roles";

const btnClass =
  "inline-flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-full border border-brand/15 bg-white/70 text-brand shadow-sm backdrop-blur transition hover:bg-brand-50 hover:opacity-100 opacity-70 dark:border-brand-200/25 dark:bg-brand-800/80 dark:text-brand-100 dark:hover:bg-brand-700";

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
        className={btnClass}
        title="Ajustes"
        aria-label="Ajustes"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          className="h-4 w-4"
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
          className="absolute right-0 z-50 mt-2 w-56 max-h-[min(70vh,28rem)] overflow-y-auto rounded-xl border border-brand/15 bg-surface py-2 shadow-lg dark:border-brand-200/25 dark:bg-brand-900"
        >
          {sections.map((section, idx) => (
            <div key={section.title}>
              {idx > 0 && (
                <div className="my-1.5 border-t border-brand/10 dark:border-brand-200/15" />
              )}
              <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-brand-200/70">
                {section.title}
              </p>
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-sm text-slate-700 hover:bg-brand-50 dark:text-brand-100 dark:hover:bg-brand-800"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
