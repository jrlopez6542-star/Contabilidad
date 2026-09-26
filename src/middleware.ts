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
  const weak = !secret || secret === "dev-secret" || secret.length < 32;
  if (process.env.NODE_ENV === "production" && weak) {
    throw new Error(
      "[middleware] CRÍTICO: AUTH_SECRET ausente, 'dev-secret' o demasiado corto (<32)."
    );
  }
  if (weak && !warnedWeakSecret) {
    warnedWeakSecret = true;
    console.warn(
      "[middleware] AUTH_SECRET débil o ausente; usando fallback solo en desarrollo."
    );
  }
  return new TextEncoder().encode(secret || "dev-secret");
}

/**
 * CSP con nonce por petición (reemplaza 'unsafe-inline' en script-src).
 * Next 14 lee el nonce del header Content-Security-Policy de la petición y lo
 * aplica a sus propios scripts; el layout lo usa para el script de arranque
 * (tema / modo de vista) vía el header x-nonce.
 * 'strict-dynamic' permite los chunks que Next carga desde scripts con nonce.
 * style-src mantiene 'unsafe-inline' (atributos style de React / Next).
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    // blob: needed so Imprimir ticket can load the PDF in a hidden iframe
    "frame-src 'self' blob:",
    "object-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function withCsp(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  return response;
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
  // Vercel Cron: autenticado por CRON_SECRET dentro de la ruta (sin sesión).
  const isCronApi = pathname.startsWith("/api/cron/");
  const isBrandingApi =
    pathname === "/api/branding" || pathname.startsWith("/api/branding/");
  const isPublic =
    isLogin ||
    isForgot ||
    isBrandingApi ||
    isCronApi ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

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
    return withCsp(NextResponse.redirect(url), csp);
  }

  if (authenticated && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return withCsp(NextResponse.redirect(url), csp);
  }

  if (authenticated && role && isRole(role)) {
    const needed = permissionForPath(pathname);
    if (needed) {
      const perms = ROLE_PERMISSIONS[role];
      if (!perms.includes(needed)) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return withCsp(NextResponse.redirect(url), csp);
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  return withCsp(
    NextResponse.next({
      request: { headers: requestHeaders },
    }),
    csp
  );
}

export const config = {
  // Skip Next internals, favicon, common static assets, and /uploads.
  // forgot/reset stay in the matcher so isPublic can allow them without auth.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads/|sw\.js|icons/|.*\\.(?:png|jpe?g|webp|gif|svg|ico|txt|xml|webmanifest)$).*)",
  ],
};
