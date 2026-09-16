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
  superadmin: [
    "users:manage",
    "company:read",
    "company:write",
    "products:read",
    "products:write",
    "customers:read",
    "customers:write",
    "invoices:read",
    "invoices:write",
    "quotes:read",
    "quotes:write",
    "payments:read",
    "payments:write",
    "expenses:read",
    "expenses:write",
    "reports:read",
    "backup:export",
    "dashboard:read",
    "cash:read",
    "cash:write",
    "audit:read",
  ],
  admin: [
    "company:read",
    "company:write",
    "products:read",
    "products:write",
    "customers:read",
    "customers:write",
    "invoices:read",
    "invoices:write",
    "quotes:read",
    "quotes:write",
    "payments:read",
    "payments:write",
    "expenses:read",
    "expenses:write",
    "reports:read",
    "backup:export",
    "dashboard:read",
    "cash:read",
    "cash:write",
    "audit:read",
  ],
  vendedor: [
    "products:read",
    "customers:read",
    "customers:write",
    "invoices:read",
    "invoices:write",
    "quotes:read",
    "quotes:write",
    "payments:read",
    "payments:write",
    "dashboard:read",
    "cash:read",
  ],
  contador: [
    "company:read",
    "products:read",
    "customers:read",
    "invoices:read",
    "quotes:read",
    "payments:read",
    "payments:write",
    "expenses:read",
    "expenses:write",
    "reports:read",
    "dashboard:read",
    "cash:read",
    "cash:write",
    "audit:read",
  ],
};

function permissionForPath(pathname: string): string | null {
  if (pathname.startsWith("/users")) return "users:manage";
  if (pathname.startsWith("/company")) return "company:read";
  if (pathname.startsWith("/expenses")) return "expenses:read";
  if (pathname.startsWith("/products")) return "products:read";
  if (pathname.startsWith("/customers")) return "customers:read";
  if (pathname.startsWith("/quotes/new")) return "quotes:write";
  if (pathname.startsWith("/quotes")) return "quotes:read";
  if (pathname.startsWith("/invoices/new")) return "invoices:write";
  if (pathname.startsWith("/invoices")) return "invoices:read";
  if (pathname.startsWith("/payments")) return "payments:read";
  if (pathname.startsWith("/caja")) return "cash:read";
  if (pathname.startsWith("/audit")) return "audit:read";
  if (pathname.startsWith("/reports")) return "reports:read";
  if (pathname.startsWith("/backup")) return "backup:export";
  if (pathname.startsWith("/dashboard")) return "dashboard:read";
  return null;
}

function isStaticPublicAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/uploads/") ||
    pathname === "/logo-bunuelandia.png" ||
    pathname === "/logo-bunuelandia-sidebar.png" ||
    pathname === "/logo-bunuelandia-header-dark.png" ||
    pathname === "/logo-bunuelandia-pdf.png" ||
    /\.(?:png|jpe?g|webp|gif|svg|ico|txt|xml|webmanifest)$/i.test(pathname)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public static assets must never hit auth redirects (login logo / branding).
  if (isStaticPublicAsset(pathname)) {
    return NextResponse.next();
  }

  const isLogin = pathname.startsWith("/login");
  const isForgot =
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");
  const isBrandingApi =
    pathname === "/api/branding" || pathname.startsWith("/api/branding/");
  const isPublic =
    isLogin ||
    isForgot ||
    isBrandingApi ||
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
  // Skip Next internals, favicon, common static assets, and /uploads.
  // forgot/reset stay in the matcher so isPublic can allow them without auth.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads/|.*\\.(?:png|jpe?g|webp|gif|svg|ico|txt|xml|webmanifest)$).*)",
  ],
};
