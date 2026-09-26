"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  destroySession,
  login,
  loginWithPin,
  removeTrustedDeviceUser,
} from "@/lib/auth";

function clientIp() {
  return (
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers().get("x-real-ip") ||
    ""
  );
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const remember = formData.get("remember") === "on";
  if (!email || !password) {
    return { error: "Correo y contraseña son obligatorios." };
  }
  const ip = clientIp();
  const user = await login(email, password, ip, remember);
  if (user && "error" in user) {
    return { error: user.error };
  }
  if (!user) {
    return { error: "Credenciales inválidas." };
  }
  redirect("/dashboard");
}

/** Acceso rápido con PIN (cajeros recordados en este dispositivo). */
export async function pinLoginAction(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  const pin = String(formData.get("pin") || "").trim();
  if (!userId || !pin) {
    return { error: "Ingrese su PIN." };
  }
  const result = await loginWithPin(userId, pin, clientIp());
  if ("error" in result) {
    return { error: result.error };
  }
  redirect("/dashboard");
}

/** Quita un cajero de la lista de acceso rápido de este dispositivo. */
export async function forgetDeviceUserAction(userId: string) {
  if (userId) await removeTrustedDeviceUser(userId);
  return { ok: true as const };
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/** Cierra sesión sin redirect (para idle / pestaña oculta desde el cliente). */
export async function endSessionAction() {
  await destroySession();
  return { ok: true as const };
}

