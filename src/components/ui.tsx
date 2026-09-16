import Link from "next/link";
import { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-brand dark:text-brand-100 sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500 dark:text-brand-200">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-brand/10 bg-surface p-4 shadow-sm dark:border-brand-200/15 dark:shadow-none sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <p className="text-sm font-medium text-slate-500 dark:text-brand-200">{label}</p>
      <p className="mt-2 text-2xl font-bold text-brand dark:text-brand-100">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-brand-200/80">{hint}</p>}
    </Card>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles = {
    primary: "bg-brand text-white hover:bg-brand-dark dark:bg-brand-light dark:hover:bg-brand",
    secondary:
      "bg-surface text-brand border border-brand/20 hover:bg-brand-50 dark:text-brand-100 dark:border-brand-200/25 dark:hover:bg-brand-800",
    danger: "bg-jam text-white hover:bg-jam-light",
    ghost:
      "bg-transparent text-slate-600 hover:bg-cream-muted dark:text-brand-200 dark:hover:bg-brand-800/60",
  };
  return (
    <button
      className={`inline-flex min-h-11 touch-manipulation items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 sm:min-h-10 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className = "",
  download,
  hard,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
  /** Force full document navigation (needed for PDF/CSV/ZIP downloads). */
  download?: boolean | string;
  hard?: boolean;
}) {
  const styles = {
    primary: "bg-brand text-white hover:bg-brand-dark dark:bg-brand-light dark:hover:bg-brand",
    secondary:
      "bg-surface text-brand border border-brand/20 hover:bg-brand-50 dark:text-brand-100 dark:border-brand-200/25 dark:hover:bg-brand-800",
    danger: "bg-jam text-white hover:bg-jam-light",
    ghost:
      "bg-transparent text-slate-600 hover:bg-cream-muted dark:text-brand-200 dark:hover:bg-brand-800/60",
  };
  const cls = `inline-flex min-h-11 touch-manipulation items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition sm:min-h-10 ${styles[variant]} ${className}`;
  // Next.js <Link> soft-navigates; binary route handlers (PDF/CSV) break and
  // Chrome shows "esta página no funciona". Use a real <a> for downloads.
  if (download || hard) {
    return (
      <a
        href={href}
        className={cls}
        download={typeof download === "string" ? download : undefined}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function Input({
  label,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block text-sm">
      {label && (
        <span className="mb-1 block font-medium text-slate-700 dark:text-brand-100">
          {label}
        </span>
      )}
      <input
        className={`w-full min-h-11 rounded-lg border border-slate-300 bg-surface px-3 py-2.5 text-base text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 disabled:bg-cream-muted dark:border-brand-200/25 dark:text-brand-50 dark:placeholder:text-brand-200/50 dark:focus:border-brand-200 dark:focus:ring-brand-800 sm:min-h-10 sm:text-sm ${className}`}
        {...props}
      />
    </label>
  );
}

export function Select({
  label,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block text-sm">
      {label && (
        <span className="mb-1 block font-medium text-slate-700 dark:text-brand-100">
          {label}
        </span>
      )}
      <select
        className={`w-full min-h-11 rounded-lg border border-slate-300 bg-surface px-3 py-2.5 text-base text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 disabled:bg-cream-muted dark:border-brand-200/25 dark:text-brand-50 dark:focus:border-brand-200 dark:focus:ring-brand-800 sm:min-h-10 sm:text-sm ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Textarea({
  label,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block text-sm">
      {label && (
        <span className="mb-1 block font-medium text-slate-700 dark:text-brand-100">
          {label}
        </span>
      )}
      <textarea
        className={`w-full min-h-[5.5rem] rounded-lg border border-slate-300 bg-surface px-3 py-2.5 text-base text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 disabled:bg-cream-muted dark:border-brand-200/25 dark:text-brand-50 dark:placeholder:text-brand-200/50 dark:focus:border-brand-200 dark:focus:ring-brand-800 sm:text-sm ${className}`}
        {...props}
      />
    </label>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-brand/20 bg-surface px-6 py-14 text-center shadow-sm dark:border-brand-200/20 dark:shadow-none">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand dark:bg-brand-800 dark:text-brand-100">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4m16 0H4"
          />
        </svg>
      </div>
      <p className="text-sm text-slate-500 dark:text-brand-200">{message}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-3 overflow-x-auto overscroll-x-contain rounded-xl border border-brand/10 bg-surface shadow-sm dark:border-brand-200/15 dark:shadow-none sm:mx-0 [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-[40rem] divide-y divide-slate-200 text-sm dark:divide-brand-200/15 sm:min-w-full">
        {children}
      </table>
    </div>
  );
}

export function AlertBanner({
  tone = "warning",
  title,
  children,
}: {
  tone?: "warning" | "danger" | "info";
  title: string;
  children: ReactNode;
}) {
  const tones = {
    warning:
      "border-gold/30 bg-gold-50 text-amber-900 dark:border-gold/40 dark:bg-gold/15 dark:text-gold-100",
    danger:
      "border-jam/30 bg-jam-50 text-jam dark:border-jam/40 dark:bg-jam/20 dark:text-jam-100",
    info: "border-brand/20 bg-brand-50 text-brand dark:border-brand-200/30 dark:bg-brand-800/50 dark:text-brand-100",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      <p className="font-semibold">{title}</p>
      <div className="mt-1 opacity-90">{children}</div>
    </div>
  );
}
