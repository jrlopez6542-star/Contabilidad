import { prisma } from "./prisma";

const WINDOW_MS = 15 * 60 * 1000;
/** Máximo de fallos por email en la ventana; 5 es estricto sin bloquear de más en caja. */
const MAX_FAILURES = 5;
/** Intentos de recuperación por correo en la ventana (anti-abuso Resend / enumeración). */
const MAX_RESET_REQUESTS = 3;
/** Fallos de login por IP (además del límite por email). */
const MAX_IP_FAILURES = 25;

const RESET_EMAIL_PREFIX = "pwreset:";

export async function isLoginRateLimited(email: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const failures = await prisma.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      success: false,
      createdAt: { gte: since },
    },
  });
  return failures >= MAX_FAILURES;
}

export async function isLoginIpRateLimited(ip: string): Promise<boolean> {
  const normalized = (ip || "").trim();
  if (!normalized) return false;
  const since = new Date(Date.now() - WINDOW_MS);
  const failures = await prisma.loginAttempt.count({
    where: {
      ip: normalized,
      success: false,
      createdAt: { gte: since },
    },
  });
  return failures >= MAX_IP_FAILURES;
}

export async function recordLoginAttempt(
  email: string,
  success: boolean,
  ip = ""
) {
  await prisma.loginAttempt.create({
    data: {
      email: email.toLowerCase(),
      success,
      ip,
    },
  });
}

export async function isPasswordResetRateLimited(email: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const key = `${RESET_EMAIL_PREFIX}${email.toLowerCase()}`;
  const requests = await prisma.loginAttempt.count({
    where: {
      email: key,
      createdAt: { gte: since },
    },
  });
  return requests >= MAX_RESET_REQUESTS;
}

export async function recordPasswordResetRequest(email: string, ip = "") {
  await prisma.loginAttempt.create({
    data: {
      email: `${RESET_EMAIL_PREFIX}${email.toLowerCase()}`,
      success: false,
      ip,
    },
  });
}
