"use client";

import { useState } from "react";

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-4.86" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export function PasswordInput({
  label,
  className = "",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm">
      {label && (
        <span className="mb-1 block font-medium text-slate-700 dark:text-brand-100">
          {label}
        </span>
      )}
      <span className="relative block">
        <input
          {...props}
          type={visible ? "text" : "password"}
          className={`w-full min-h-11 rounded-lg border border-slate-300 bg-surface py-2.5 pl-3 pr-11 text-base text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 disabled:bg-cream-muted dark:border-brand-200/25 dark:text-brand-50 dark:placeholder:text-brand-200/50 dark:focus:border-brand-200 dark:focus:ring-brand-800 sm:min-h-10 sm:text-sm ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-r-lg text-slate-500 hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100 dark:text-brand-200 dark:hover:text-brand-100 dark:focus-visible:ring-brand-800 sm:min-h-10"
        >
          {visible ? (
            <EyeOffIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>
      </span>
    </label>
  );
}
