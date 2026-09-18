"use client";

import { useState } from "react";
import { ProductForm } from "@/app/(app)/products/form";

/** Compact collapsible — collapsed by default, not competing with Cobrar. */
export function NuevoProductoPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 max-w-md rounded-xl border border-brand/10 bg-surface/80 dark:border-brand-200/15 dark:bg-brand-900/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full min-h-10 touch-manipulation items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-slate-600 hover:text-brand dark:text-brand-200 dark:hover:text-brand-100"
      >
        <span>Nuevo producto</span>
        <svg
          className={`h-4 w-4 shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="border-t border-brand/10 px-3.5 pb-3.5 pt-3 dark:border-brand-200/15">
          <ProductForm />
        </div>
      )}
    </div>
  );
}
