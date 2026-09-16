"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission, hashPassword, requireSession, verifyPassword } from "@/lib/auth";
import { isRole, ROLES } from "@/lib/roles";
import { writeAudit } from "@/lib/audit";

function parseRole(value: string) {
  return isRole(value) ? value : null;
}

export async function createUserAction(formData: FormData) {
  const session = await assertPermission("users:manage");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = parseRole(String(formData.get("role") || ""));
  const password = String(formData.get("password") || "");
  const active =
    formData.get("active") === "on" || formData.get("active") === "true";

  if (!name || !email || !role) {
    return { error: "Nombre, correo y rol son obligatorios." };
  }
  if (!ROLES.includes(role)) {
    return { error: "Rol inválido." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe un usuario con ese correo." };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      passwordHash,
      active,
    },
  });
  await writeAudit(session, "create", "user", user.id, `Creó usuario ${email} (${role})`);
  revalidatePath("/users");
  return { ok: true };
}

export async function updateUserAction(formData: FormData) {
  const session = await assertPermission("users:manage");
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = parseRole(String(formData.get("role") || ""));
  const active =
    formData.get("active") === "on" || formData.get("active") === "true";

  if (!id || !name || !email || !role) {
    return { error: "Datos incompletos." };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "Usuario no encontrado." };

  // Prevent self-lockout: cannot deactivate or demote yourself away from admin
  if (user.id === session.id) {
    if (!active) {
      return { error: "No puede desactivarse a sí mismo." };
    }
    if (role !== "admin") {
      return { error: "No puede quitarse el rol de administrador." };
    }
  }

  const conflict = await prisma.user.findFirst({
    where: { email, NOT: { id } },
  });
  if (conflict) {
    return { error: "Ya existe otro usuario con ese correo." };
  }

  await prisma.user.update({
    where: { id },
    data: { name, email, role, active },
  });
  await writeAudit(
    session,
    "update",
    "user",
    id,
    `Actualizó usuario ${email} (${role}${active ? "" : ", inactivo"})`
  );
  revalidatePath("/users");
  return { ok: true };
}

export async function setUserPasswordAction(formData: FormData) {
  const session = await assertPermission("users:manage");
  const id = String(formData.get("id") || "");
  const password = String(formData.get("password") || "");
  if (!id) return { error: "Usuario inválido." };
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }
  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  await writeAudit(session, "update", "user", id, "Restableció contraseña de usuario");
  revalidatePath("/users");
  return { ok: true };
}

export async function deactivateUserAction(id: string) {
  const session = await assertPermission("users:manage");
  if (id === session.id) {
    return { error: "No puede desactivarse a sí mismo." };
  }
  await prisma.user.update({ where: { id }, data: { active: false } });
  await writeAudit(session, "update", "user", id, "Desactivó usuario");
  revalidatePath("/users");
  return { ok: true };
}

export async function activateUserAction(id: string) {
  const session = await assertPermission("users:manage");
  await prisma.user.update({ where: { id }, data: { active: true } });
  await writeAudit(session, "update", "user", id, "Activó usuario");
  revalidatePath("/users");
  return { ok: true };
}

export async function updateOwnProfileAction(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!name || !email) {
    return { error: "Nombre y correo son obligatorios." };
  }

  const conflict = await prisma.user.findFirst({
    where: { email, NOT: { id: session.id } },
  });
  if (conflict) {
    return { error: "Ya existe otro usuario con ese correo." };
  }

  await prisma.user.update({
    where: { id: session.id },
    data: { name, email },
  });
  await writeAudit(session, "update", "user", session.id, "Actualizó su perfil");
  revalidatePath("/profile");
  revalidatePath("/users");
  return { ok: true };
}

export async function changeOwnPasswordAction(formData: FormData) {
  const session = await requireSession();
  const currentPassword = String(formData.get("currentPassword") || "");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!currentPassword || !password) {
    return { error: "Complete todos los campos de contraseña." };
  }
  if (password.length < 6) {
    return { error: "La nueva contraseña debe tener al menos 6 caracteres." };
  }
  if (password !== confirmPassword) {
    return { error: "La confirmación no coincide." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return { error: "Usuario no encontrado." };

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    return { error: "La contraseña actual es incorrecta." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: session.id },
    data: { passwordHash },
  });
  await writeAudit(session, "update", "user", session.id, "Cambió su contraseña");
  revalidatePath("/profile");
  return { ok: true };
}
