"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  forgetDeviceUserAction,
  loginAction,
  pinLoginAction,
} from "@/actions/auth";
import type { TrustedCashier } from "@/lib/auth";
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

const REMEMBER_EMAIL_KEY = "contabilidad:remember-email";

export function LoginForm({
  companyName: initialName = DEFAULT_COMPANY_NAME,
  logoUrl: initialLogo = DEFAULT_LOGO,
  cashiers: initialCashiers = [],
}: {
  companyName?: string;
  logoUrl?: string;
  cashiers?: TrustedCashier[];
} = {}) {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const idleMsg = searchParams.get("msg");
  const idleUserId = searchParams.get("u");
  const [cashiers, setCashiers] = useState(initialCashiers);
  // Tras bloqueo por inactividad, preselecciona al cajero (desbloqueo con PIN).
  const [pinUserId, setPinUserId] = useState<string | null>(() =>
    idleUserId && initialCashiers.some((c) => c.id === idleUserId && !c.locked)
      ? idleUserId
      : null
  );
  const pinUser = cashiers.find((c) => c.id === pinUserId) || null;

  async function onPinSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pinUser) return;
    const form = e.currentTarget;
    setPending(true);
    setError(null);
    try {
      const formData = new FormData(form);
      formData.set("userId", pinUser.id);
      const result = await pinLoginAction(formData);
      if (result?.error) {
        setError(result.error);
        setPending(false);
        form.reset();
        if (/bloqueado/i.test(result.error)) {
          setCashiers((list) =>
            list.map((c) => (c.id === pinUser.id ? { ...c, locked: true } : c))
          );
          setPinUserId(null);
        }
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo iniciar sesión. Intente de nuevo.");
      setPending(false);
    }
  }

  async function forgetCashier(id: string) {
    setCashiers((list) => list.filter((c) => c.id !== id));
    if (pinUserId === id) setPinUserId(null);
    try {
      await forgetDeviceUserAction(id);
    } catch {
      /* ignore */
    }
  }
  const [companyName, setCompanyName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState(companyLogoSrc(initialLogo));
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);

  // "Recordarme": precarga el último correo guardado en este dispositivo.
  useEffect(() => {
    try {
      setRememberedEmail(localStorage.getItem(REMEMBER_EMAIL_KEY) || "");
    } catch {
      setRememberedEmail("");
    }
  }, []);

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
      try {
        if (formData.get("remember") === "on") {
          localStorage.setItem(
            REMEMBER_EMAIL_KEY,
            String(formData.get("email") || "").trim().toLowerCase()
          );
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      } catch {
        /* localStorage no disponible */
      }
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
        {cashiers.length > 0 && (
          <Card className="mb-4 border-brand/15 shadow-md">
            {pinUser ? (
              <form onSubmit={onPinSubmit} className="space-y-4">
                <p className="text-sm text-slate-700 dark:text-brand-100">
                  Hola, <span className="font-semibold">{pinUser.name}</span>.
                  Ingresa tu PIN.
                </p>
                <Input
                  key={pinUser.id}
                  label="PIN"
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4,6}"
                  minLength={4}
                  maxLength={6}
                  required
                  autoFocus
                  autoComplete="off"
                />
                {(error || (idleMsg && idleUserId === pinUser.id)) && (
                  <p
                    className={
                      error
                        ? "rounded-lg bg-jam-50 px-3 py-2 text-sm text-jam"
                        : "rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-brand-800 dark:text-brand-100"
                    }
                  >
                    {error || idleMsg}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={pending}>
                    {pending ? "Ingresando…" : "Entrar"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setPinUserId(null);
                      setError(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-brand-200/80">
                  Acceso rápido con PIN
                </p>
                <div className="flex flex-wrap gap-2">
                  {cashiers.map((c) => (
                    <div key={c.id} className="flex items-center">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={c.locked}
                        title={
                          c.locked
                            ? "PIN bloqueado: ingrese con correo y contraseña"
                            : undefined
                        }
                        onClick={() => {
                          setPinUserId(c.id);
                          setError(null);
                        }}
                      >
                        {c.name}
                        {c.locked ? " (bloqueado)" : ""}
                      </Button>
                      <button
                        type="button"
                        className="ml-1 px-1 text-xs text-slate-400 hover:text-jam dark:text-brand-200/60"
                        aria-label={`Quitar ${c.name} de este dispositivo`}
                        title="Quitar de este dispositivo"
                        onClick={() => void forgetCashier(c.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
        <Card className="border-brand/15 shadow-md">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              key={rememberedEmail === null ? "email" : "email-ready"}
              label="Correo electrónico"
              name="email"
              type="email"
              required
              autoComplete="username"
              defaultValue={rememberedEmail ?? ""}
              autoFocus={rememberedEmail === ""}
            />
            <PasswordInput
              key={rememberedEmail === null ? "pw" : "pw-ready"}
              label="Contraseña"
              name="password"
              required
              autoComplete="current-password"
              autoFocus={!!rememberedEmail}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-brand-100">
              <input
                key={rememberedEmail === null ? "rem" : "rem-ready"}
                type="checkbox"
                name="remember"
                defaultChecked={!!rememberedEmail}
              />
              Recordarme en este dispositivo (30 días)
            </label>
            {idleMsg && !error && !pinUser && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-brand-800 dark:text-brand-100">
                {idleMsg}
              </p>
            )}
            {error && !pinUser && (
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
