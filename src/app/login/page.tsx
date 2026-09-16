"use client";

import { useState } from "react";
import { loginAction } from "@/actions/auth";
import { Button, Card, Input } from "@/components/ui";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await loginAction(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white">
            C
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Contabilidad MVP</h1>
          <p className="mt-1 text-sm text-slate-500">
            Facturación interna · Control de ventas · COP
          </p>
        </div>
        <Card>
          <form action={onSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              name="email"
              type="email"
              required
              defaultValue="admin@demo.co"
              autoComplete="username"
            />
            <Input
              label="Contraseña"
              name="password"
              type="password"
              required
              defaultValue="Admin123!"
              autoComplete="current-password"
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Ingresando…" : "Iniciar sesión"}
            </Button>
          </form>
          <div className="mt-4 space-y-1 text-center text-xs text-slate-400">
            <p>Demo: admin@demo.co / Admin123!</p>
            <p>vendedor@demo.co / Vendedor123!</p>
            <p>contador@demo.co / Contador123!</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
