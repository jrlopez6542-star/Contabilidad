import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "contabilidad_session";

function getSecret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "dev-secret"
  );
}

/** Role permissions mirrored for Edge (no Prisma). Keep in sync with lib/roles.ts */
const ROLE_PERMS: Record<string, string[]> = {
  admin: [
    "users:manage",
    "company:read",
    "company:write",
    "products:read",
    "products:write",
    "customers:read",
    "customers:write",
    "invoices:read",
    "invoices:write",
    "payments:read",
    "payments:write",
    "expenses:read",
    "expenses:write",
    "dashboard:read",
  ],
  vendedor: [
    "products:read",
    "customers:read",
    "customers:write",
    "invoices:read",
    "invoices:write",
    "payments:read",
    "payments:write",
    "dashboard:read",
  ],
  contador: [
    "company:read",
    "products:read",
    "customers:read",
    "invoices:read",
    "payments:read",
    "payments:write",
    "expenses:read",
    "expenses:write",
    "dashboard:read",
  ],
};

function permissionForPath(pathname: string): string | null {
  if (pathname.startsWith("/users")) return "users:manage";
  if (pathname.startsWith("/company")) return "company:read";
  if (pathname.startsWith("/expenses")) return "expenses:read";
  if (pathname.startsWith("/products")) return "products:read";
  if (pathname.startsWith("/customers")) return "customers:read";
  if (pathname.startsWith("/invoices/new")) return "invoices:write";
  if (pathname.startsWith("/invoices")) return "invoices:read";
  if (pathname.startsWith("/payments")) return "payments:read";
  if (pathname.startsWith("/dashboard")) return "dashboard:read";
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname.startsWith("/login");
  const isPublic =
    isLogin ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let authenticated = false;
  let role: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      authenticated = true;
      role = (payload.role as string) || null;
    } catch {
      authenticated = false;
    }
  }

  if (!authenticated && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authenticated && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (authenticated && role) {
    const needed = permissionForPath(pathname);
    if (needed) {
      const perms = ROLE_PERMS[role] || [];
      if (!perms.includes(needed)) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
