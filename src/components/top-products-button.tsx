"use client";

import Link from "next/link";
import { can, type Role } from "@/lib/roles";

const btnClass =
  "inline-flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-full border border-brand/15 bg-white/70 text-brand shadow-sm backdrop-blur transition hover:bg-brand-50 hover:opacity-100 opacity-70 dark:border-brand-200/25 dark:bg-brand-800/80 dark:text-brand-100 dark:hover:bg-brand-700";

export function TopProductsButton({ role }: { role: Role }) {
  if (!can(role, "reports:read")) return null;

  return (
    <Link
      href="/top-productos"
      title="Productos más vendidos"
      aria-label="Productos más vendidos"
      className={btnClass}
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
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    </Link>
  );
}
