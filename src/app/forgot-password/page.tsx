"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/actions/password-reset";
import { Button, Card, Input } from "@/components/ui";
import { CompanyLogo } from "@/components/company-logo";
import { DEFAULT_COMPANY_NAME, DEFAULT_LOGO } from "@/lib/branding";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await requestPasswordResetAction(formData);
    if (result?.error) {
      setError(result.error);
    } else if (result?.message) {
      setMessage(result.message);
    }
    setPending(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cream via-cream-muted to-brand-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <CompanyLogo
            src={DEFAULT_LOGO}
            alt={DEFAULT_COMPANY_NAME}
            className="mx-auto mb-3 h-24 w-auto max-h-28 object-contain drop-shadow-md"
          />
          <h1 className="text-2xl font-bold text-brand">¿Olvidaste tu contraseña?</h1>
          <p className="mt-1 text-sm text-slate-600">
            Te enviaremos un enlace para restablecerla
          </p>
        </div>
        <Card className="border-brand/15 shadow-md">
          {message ? (
            <div className="space-y-4">
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                {message}
              </p>
              <Link
                href="/login"
                className="block text-center text-sm font-medium text-brand hover:underline"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form action={onSubmit} className="space-y-4">
              <Input
                label="Correo electrónico"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@empresa.com"
              />
              {error && (
                <p className="rounded-lg bg-jam-50 px-3 py-2 text-sm text-jam">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Enviando…" : "Enviar enlace"}
              </Button>
              <p className="text-center text-sm text-slate-500">
                <Link href="/login" className="text-brand hover:underline">
                  Volver al inicio de sesión
                </Link>
              </p>
            </form>
          )}
        </Card>
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <ViewModeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
