import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  ROLE_PERMISSIONS,
  isRole,
  permissionForPath,
} from "@/lib/roles";

const COOKIE_NAME = "contabilidad_session";

let warnedWeakSecret = false;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (
    process.env.NODE_ENV === "production" &&
    (!secret || secret === "dev-secret")
  ) {
    if (!warnedWeakSecret) {
      warnedWeakSecret = true;
      console.error(
        "[middleware] CRÍTICO: AUTH_SECRET ausente o igual a 'dev-secret' en producción. Configure un secreto fuerte en Vercel."
      );
    }
  }
  return new TextEncoder().encode(secret || "dev-secret");
}

function isStaticPublicAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/uploads/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
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

  if (authenticated && role && isRole(role)) {
    const needed = permissionForPath(pathname);
    if (needed) {
      const perms = ROLE_PERMISSIONS[role];
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
    "/((?!_next/static|_next/image|favicon.ico|uploads/|sw\.js|icons/|.*\\.(?:png|jpe?g|webp|gif|svg|ico|txt|xml|webmanifest)$).*)",
  ],
};
