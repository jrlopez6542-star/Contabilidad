"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { destroySession, login } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) {
    return { error: "Correo y contraseña son obligatorios." };
  }
  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers().get("x-real-ip") ||
    "";
  const user = await login(email, password, ip);
  if (user && "error" in user) {
    return { error: user.error };
  }
  if (!user) {
    return { error: "Credenciales inválidas." };
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
