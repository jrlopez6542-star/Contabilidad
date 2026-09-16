"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction } from "@/actions/password-reset";
import { Button, Card, Input } from "@/components/ui";
import { CompanyLogo } from "@/components/company-logo";
import { DEFAULT_COMPANY_NAME, DEFAULT_LOGO } from "@/lib/branding";
import { ViewModeToggle } from "@/components/view-mode-toggle";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    formData.set("token", token);
    const result = await resetPasswordAction(formData);
    if (result?.error) {
      setError(result.error);
    } else if (result?.message) {
      setMessage(result.message);
    }
    setPending(false);
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-jam-50 px-3 py-2 text-sm text-jam">
          Enlace inválido o incompleto. Solicita uno nuevo desde «Olvidé mi contraseña».
        </p>
        <Link
          href="/forgot-password"
          className="block text-center text-sm font-medium text-brand hover:underline"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  if (message) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </p>
        <Link
          href="/login"
          className="block text-center text-sm font-medium text-brand hover:underline"
        >
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Input
        label="Nueva contraseña"
        name="password"
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
      />
      <Input
        label="Confirmar contraseña"
        name="confirm"
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
      />
      {error && (
        <p className="rounded-lg bg-jam-50 px-3 py-2 text-sm text-jam">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : "Guardar nueva contraseña"}
      </Button>
      <p className="text-center text-sm text-slate-500">
        <Link href="/login" className="text-brand hover:underline">
          Volver al inicio de sesión
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cream via-cream-muted to-brand-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <CompanyLogo
            src={DEFAULT_LOGO}
            alt={DEFAULT_COMPANY_NAME}
            className="mx-auto mb-3 h-24 w-auto max-h-28 object-contain drop-shadow-md"
          />
          <h1 className="text-2xl font-bold text-brand">Nueva contraseña</h1>
          <p className="mt-1 text-sm text-slate-600">
            Elige una contraseña segura (mínimo 6 caracteres)
          </p>
        </div>
        <Card className="border-brand/15 shadow-md">
          <Suspense
            fallback={
              <p className="text-center text-sm text-slate-500">Cargando…</p>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </Card>
        <div className="mt-6 flex justify-center">
          <ViewModeToggle />
        </div>
      </div>
    </div>
  );
}
