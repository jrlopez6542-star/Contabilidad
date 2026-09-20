"use server";

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { appBaseUrl, sendEmail } from "@/lib/email";
import {
  isPasswordResetRateLimited,
  recordPasswordResetRequest,
} from "@/lib/rate-limit";
import { headers } from "next/headers";

const GENERIC_OK =
  "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESET_TOKEN_UNAVAILABLE = "RESET_TOKEN_UNAVAILABLE";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Ingrese un correo electrónico válido." };
  }

  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers().get("x-real-ip") ||
    "";

  if (await isPasswordResetRateLimited(email)) {
    // Same generic OK — do not reveal that rate limit tripped for a given address.
    return { ok: true, message: GENERIC_OK };
  }
  await recordPasswordResetRequest(email, ip);

  // Same response for every address: enumeration-safe, but honest when Resend
  // is missing so users are not told an email was sent when it cannot be.
  if (!process.env.RESEND_API_KEY?.trim()) {
    return {
      ok: true,
      message:
        "La recuperación por correo aún no está configurada. Contacta al administrador para cambiar tu contraseña.",
    };
  }

  // Always return the same message (do not reveal whether the email exists).
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.active) {
      // Invalidate previous unused tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      const token = randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

      await prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt,
        },
      });

      const resetUrl = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      const html = `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #0b3d2e;">Restablecer contraseña</h2>
          <p>Hola ${escapeHtml(user.name)},</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Buñuelandia.</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}"
               style="background:#0b3d2e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
              Restablecer contraseña
            </a>
          </p>
          <p style="color:#64748b;font-size:13px;">Este enlace expira en 1 hora y solo se puede usar una vez.</p>
          <p style="color:#64748b;font-size:13px;">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
        </div>
      `;
      const text = `Restablecer contraseña\n\nHola ${user.name},\n\nAbre este enlace (válido 1 hora, un solo uso):\n${resetUrl}\n\nSi no solicitaste este cambio, ignora este mensaje.`;

      const sent = await sendEmail({
        to: user.email,
        subject: "Restablecer contraseña — Buñuelandia",
        html,
        text,
      });
      if (!sent.ok) {
        // Still return generic OK to avoid leaking account existence via email failures
        // (ops can see logs). Optionally surface a soft config error in non-prod.
        console.error("[password-reset] email send failed for user", user.id);
      }
    }
  } catch (err) {
    console.error("[password-reset] request failed", err);
  }

  return { ok: true, message: GENERIC_OK };
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") || "").trim();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!token) {
    return { error: "Enlace inválido o incompleto." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== confirm) {
    return { error: "Las contraseñas no coinciden." };
  }

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return {
      error:
        "El enlace no es válido o ha expirado. Solicita uno nuevo desde «Olvidé mi contraseña».",
    };
  }

  if (!record.user.active) {
    return { error: "La cuenta no está activa. Contacte al administrador." };
  }

  const passwordHash = await hashPassword(password);

  try {
    await prisma.$transaction(async (tx) => {
      // Atomically claim the token before changing the password. The conditional
      // update makes one-use semantics hold even for two concurrent submissions.
      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error(RESET_TOKEN_UNAVAILABLE);

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      // Wipe any other outstanding unused tokens for this user
      await tx.passwordResetToken.deleteMany({
        where: { userId: record.userId, usedAt: null },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === RESET_TOKEN_UNAVAILABLE) {
      return {
        error:
          "El enlace no es válido o ya fue utilizado. Solicita uno nuevo desde «Olvidé mi contraseña».",
      };
    }
    throw error;
  }

  return {
    ok: true,
    message: "Contraseña actualizada. Ya puedes iniciar sesión.",
  };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
