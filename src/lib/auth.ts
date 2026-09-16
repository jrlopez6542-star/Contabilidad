import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { can, isRole, type Permission, type Role } from "./roles";

const COOKIE_NAME = "contabilidad_session";

function getSecret() {
  const secret = process.env.AUTH_SECRET || "dev-secret";
  return new TextEncoder().encode(secret);
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

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
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
    redirect("/login");
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

export async function assertPermission(
  permission: Permission
): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!can(session.role, permission)) {
    redirect("/dashboard");
  }
  return session;
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return null;
  if (!isRole(user.role)) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  await createSession(sessionUser);
  return sessionUser;
}
