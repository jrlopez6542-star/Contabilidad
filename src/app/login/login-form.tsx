"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { Button, Card, Input } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { CompanyLogo } from "@/components/company-logo";
import {
  companyLogoSrc,
  DEFAULT_COMPANY_NAME,
  DEFAULT_LOGO,
} from "@/lib/branding";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

export function LoginForm({
  companyName: initialName = DEFAULT_COMPANY_NAME,
  logoUrl: initialLogo = DEFAULT_LOGO,
}: {
  companyName?: string;
  logoUrl?: string;
} = {}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [companyName, setCompanyName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState(companyLogoSrc(initialLogo));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/branding", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          name?: string;
          logoUrl?: string;
        };
        if (cancelled) return;
        if (data.name?.trim()) setCompanyName(data.name.trim());
        setLogoUrl(companyLogoSrc(data.logoUrl) || DEFAULT_LOGO);
      } catch {
        /* keep defaults / initial props */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    setError(null);
    try {
      const formData = new FormData(form);
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
        setPending(false);
      }
      // On success loginAction redirects; keep pending
    } catch (err) {
      console.error(err);
      setError("No se pudo iniciar sesión. Intente de nuevo.");
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cream via-cream-muted to-brand-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <CompanyLogo
            src={logoUrl}
            alt={companyName}
            className="mx-auto mb-2 h-32 w-auto max-h-36 object-contain drop-shadow-md sm:h-40 sm:max-h-44"
          />
          <p className="mt-1 text-sm text-slate-600 dark:text-brand-200">
            Facturación · Inventario · COP
          </p>
        </div>
        <Card className="border-brand/15 shadow-md">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              name="email"
              type="email"
              required
              autoComplete="username"
            />
            <PasswordInput
              label="Contraseña"
              name="password"
              required
              autoComplete="current-password"
            />
            {error && (
              <p className="rounded-lg bg-jam-50 px-3 py-2 text-sm text-jam">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Ingresando…" : "Iniciar sesión"}
            </Button>
            <div className="rounded-lg border border-brand/15 bg-brand-50/60 px-3 py-3 text-center dark:border-brand-200/20 dark:bg-brand-800/40">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-brand underline-offset-2 hover:underline dark:text-brand-100"
              >
                ¿Olvidaste tu contraseña?
              </Link>
              <p className="mt-1 text-xs text-slate-500 dark:text-brand-200/80">
                Te enviaremos un enlace seguro (válido 1 hora)
              </p>
            </div>
          </form>
        </Card>
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <ViewModeToggle />
          </div>
          <p className="text-center text-xs text-slate-400 dark:text-brand-200/70">
            Sistema interno de gestión comercial
          </p>
        </div>
      </div>
    </div>
  );
}
