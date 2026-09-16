"use server";

import { redirect } from "next/navigation";
import { destroySession, login } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) {
    return { error: "Correo y contraseña son obligatorios." };
  }
  const user = await login(email, password);
  if (!user) {
    return { error: "Credenciales inválidas." };
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
