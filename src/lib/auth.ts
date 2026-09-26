import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import {
  can,
  canUsePin,
  isRole,
  type Permission,
  type Role,
} from "./roles";
import {
  isLoginIpRateLimited,
  isLoginRateLimited,
  recordLoginAttempt,
} from "./rate-limit";
import { writeAudit } from "./audit";

const COOKIE_NAME = "contabilidad_session";
/** Cookie firmada (httpOnly) con los cajeros de confianza de este dispositivo. */
const DEVICE_COOKIE_NAME = "contabilidad_device";
const DEVICE_MAX_AGE_SEC = 60 * 60 * 24 * 90;
const DEVICE_AUDIENCE = "contabilidad:device";
const DEVICE_MAX_USERS = 8;
/** Fallos de PIN consecutivos antes de bloquear el PIN del usuario. */
export const PIN_MAX_FAILURES = 5;
const PIN_ATTEMPT_PREFIX = "pin:";

/** Session length: 7 days balances UX for caja/mostrador vs re-auth frequency. */
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;
/** "Recordarme" en este dispositivo: 30 días. */
const REMEMBER_MAX_AGE_SEC = 60 * 60 * 24 * 30;

let warnedWeakSecret = false;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  const weak = !secret || secret === "dev-secret" || secret.length < 32;
  if (process.env.NODE_ENV === "production" && weak) {
    // Fail closed: a guessable AUTH_SECRET would forge sessions.
    throw new Error(
      "[auth] CRÍTICO: AUTH_SECRET ausente, 'dev-secret' o demasiado corto (<32). Configure un secreto fuerte."
    );
  }
  if (weak && !warnedWeakSecret) {
    warnedWeakSecret = true;
    console.warn(
      "[auth] AUTH_SECRET débil o ausente; usando fallback solo en desarrollo."
    );
  }
  return new TextEncoder().encode(secret || "dev-secret");
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/**
 * Cookie de sesión:
 * - httpOnly: true — no accesible desde JS
 * - sameSite: 'lax' — protege CSRF en navegación cruzada sin romper login
 * - secure: true en producción (HTTPS en Vercel)
 * - path: '/' — cookie en todo el origen
 * No usamos prefijo __Host- (exigiría Secure+Path=/+sin Domain); riesgo bajo
 * de romper despliegues con dominio custom mal configurado.
 */
function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function createSession(user: SessionUser, remember = false) {
  const maxAge = remember ? REMEMBER_MAX_AGE_SEC : SESSION_MAX_AGE_SEC;
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAge)
    .sign(getSecret());

  cookies().set(COOKIE_NAME, token, cookieOpts(maxAge));
}

export async function destroySession() {
  cookies().set(COOKIE_NAME, "", cookieOpts(0));
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.id as string;
    if (!id) return null;

    // Reload from DB so role/active changes apply without waiting for JWT expiry
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.active) return null;
    if (!isRole(user.role)) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    // expired=1: el middleware borra la cookie (evita bucle login↔dashboard
    // cuando el JWT es válido pero el usuario fue desactivado).
    redirect("/login?expired=1");
  }
  return session;
}

export async function requirePermission(
  permission: Permission
): Promise<SessionUser> {
  const session = await requireSession();
  if (!can(session.role, permission)) {
    redirect("/dashboard");
  }
  return session;
}

/** Alias de requirePermission para server actions (mismo comportamiento). */
export async function assertPermission(
  permission: Permission
): Promise<SessionUser> {
  return requirePermission(permission);
}

export async function login(
  email: string,
  password: string,
  ip = "",
  remember = false
) {
  const normalized = email.trim().toLowerCase();

  if (
    (await isLoginRateLimited(normalized)) ||
    (await isLoginIpRateLimited(ip))
  ) {
    return {
      error:
        "Demasiados intentos fallidos. Intente de nuevo en 15 minutos.",
    } as const;
  }

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  // Usuario inexistente, inactivo o rol inválido: misma respuesta genérica
  // (no filtrar si la cuenta existe).
  if (!user || !user.active || !isRole(user.role)) {
    await recordLoginAttempt(normalized, false, ip);
    return null;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await recordLoginAttempt(normalized, false, ip);
    return null;
  }

  await recordLoginAttempt(normalized, true, ip);
  // Login con contraseña desbloquea el PIN y reinicia el contador.
  if (user.pinFailedAttempts || user.pinLockedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { pinFailedAttempts: 0, pinLockedAt: null },
    });
  }
  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  await createSession(sessionUser, remember);
  if (canUsePin(user.role)) {
    await addTrustedDeviceUser(user.id);
  }
  await writeAudit(
    sessionUser,
    "login",
    "user",
    user.id,
    `Inicio de sesión (${user.email})${remember ? " · recordarme 30 días" : ""}`
  );
  return sessionUser;
}

// ---------------------------------------------------------------------------
// Dispositivo de confianza + PIN de caja
// ---------------------------------------------------------------------------

function deviceCookieOpts(maxAge: number) {
  return { ...cookieOpts(maxAge) };
}

/** Ids de usuario recordados en este dispositivo (cookie firmada). */
export async function readTrustedDeviceUserIds(): Promise<string[]> {
  const token = cookies().get(DEVICE_COOKIE_NAME)?.value;
  if (!token) return [];
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      audience: DEVICE_AUDIENCE,
    });
    const uids = payload.uids;
    if (!Array.isArray(uids)) return [];
    return uids.filter((u): u is string => typeof u === "string").slice(0, DEVICE_MAX_USERS);
  } catch {
    return [];
  }
}

async function writeTrustedDeviceUserIds(uids: string[]) {
  if (uids.length === 0) {
    cookies().set(DEVICE_COOKIE_NAME, "", deviceCookieOpts(0));
    return;
  }
  const token = await new SignJWT({ uids })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(DEVICE_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + DEVICE_MAX_AGE_SEC)
    .sign(getSecret());
  cookies().set(DEVICE_COOKIE_NAME, token, deviceCookieOpts(DEVICE_MAX_AGE_SEC));
}

/** Tras un login completo (correo + contraseña), recuerda al cajero en este dispositivo. */
export async function addTrustedDeviceUser(userId: string) {
  const current = await readTrustedDeviceUserIds();
  const next = [userId, ...current.filter((u) => u !== userId)].slice(
    0,
    DEVICE_MAX_USERS
  );
  await writeTrustedDeviceUserIds(next);
}

export async function removeTrustedDeviceUser(userId: string) {
  const current = await readTrustedDeviceUserIds();
  await writeTrustedDeviceUserIds(current.filter((u) => u !== userId));
}

export type TrustedCashier = { id: string; name: string; locked: boolean };

/** Cajeros recordados en este dispositivo que pueden entrar con PIN ahora mismo. */
export async function getTrustedCashiers(): Promise<TrustedCashier[]> {
  const uids = await readTrustedDeviceUserIds();
  if (uids.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: uids }, active: true, NOT: { pinHash: null } },
    select: { id: true, name: true, role: true, pinLockedAt: true },
  });
  return uids
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => !!u && canUsePin(u.role))
    .map((u) => ({ id: u.id, name: u.name, locked: !!u.pinLockedAt }));
}

const PIN_GENERIC_ERROR = "PIN incorrecto.";
const PIN_LOCKED_ERROR =
  "PIN bloqueado por intentos fallidos. Inicie sesión con su correo y contraseña.";

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

/**
 * Login con PIN: solo cajeros (vendedor/contador) activos, con PIN, recordados
 * en este dispositivo. 5 fallos => PIN bloqueado hasta login con contraseña.
 * Límite por IP compartido con el login normal.
 */
export async function loginWithPin(
  userId: string,
  pin: string,
  ip = ""
): Promise<{ ok: true } | { error: string }> {
  const trusted = await readTrustedDeviceUserIds();
  if (!userId || !trusted.includes(userId)) {
    return { error: "Este dispositivo no está autorizado para ese usuario. Use correo y contraseña." };
  }

  if (await isLoginIpRateLimited(ip)) {
    return {
      error: "Demasiados intentos fallidos. Intente de nuevo en 15 minutos.",
    };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active || !isRole(user.role) || !canUsePin(user.role) || !user.pinHash) {
    return { error: "El acceso con PIN no está disponible para este usuario. Use correo y contraseña." };
  }
  const attemptKey = `${PIN_ATTEMPT_PREFIX}${user.email}`;

  if (user.pinLockedAt) {
    await recordLoginAttempt(attemptKey, false, ip);
    return { error: PIN_LOCKED_ERROR };
  }

  const ok = isValidPinFormat(pin) && (await verifyPassword(pin, user.pinHash));
  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  if (!ok) {
    await recordLoginAttempt(attemptKey, false, ip);
    const failures = (user.pinFailedAttempts ?? 0) + 1;
    const lock = failures >= PIN_MAX_FAILURES;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinFailedAttempts: failures,
        ...(lock ? { pinLockedAt: new Date() } : {}),
      },
    });
    await writeAudit(
      sessionUser,
      "pin_login_failed",
      "user",
      user.id,
      `PIN incorrecto (${user.email}) · intento ${failures}/${PIN_MAX_FAILURES}`
    );
    if (lock) {
      await writeAudit(
        sessionUser,
        "pin_lockout",
        "user",
        user.id,
        `PIN bloqueado tras ${PIN_MAX_FAILURES} intentos fallidos (${user.email})`
      );
      return { error: PIN_LOCKED_ERROR };
    }
    const left = PIN_MAX_FAILURES - failures;
    return {
      error: `${PIN_GENERIC_ERROR} Le quedan ${left} intento${left === 1 ? "" : "s"}.`,
    };
  }

  await recordLoginAttempt(attemptKey, true, ip);
  if (user.pinFailedAttempts) {
    await prisma.user.update({
      where: { id: user.id },
      data: { pinFailedAttempts: 0 },
    });
  }
  await createSession(sessionUser);
  await writeAudit(
    sessionUser,
    "pin_login",
    "user",
    user.id,
    `Inicio de sesión con PIN (${user.email})`
  );
  return { ok: true };
}
