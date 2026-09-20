export const DEFAULT_LOGO = "/logo-bunuelandia.png";
export const DEFAULT_COMPANY_NAME = "Buñuelandia";

/** ~1.5 MB original file ≈ ~2 MB base64 data URL (fits Vercel body + Turso TEXT). */
export const MAX_LOGO_FILE_BYTES = 1_500_000;
export const MAX_LOGO_DATA_URL_CHARS = 2_100_000;

export function isDataImageUrl(url: string): boolean {
  return url.startsWith("data:image/");
}

/** Raster data URLs only — block SVG data URLs (scriptable). */
export function isSafeDataImageUrl(url: string): boolean {
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(url);
}

/**
 * Ephemeral filesystem uploads under /public/uploads do not persist on Vercel.
 * Treat those paths as invalid so UI falls back to the bundled default logo.
 */
export function isEphemeralUploadPath(url: string): boolean {
  return url.startsWith("/uploads/") || url === "/uploads";
}

export function isAllowedLogoUrl(url: string): boolean {
  if (!url) return false;
  if (isDataImageUrl(url)) return isSafeDataImageUrl(url);
  if (isEphemeralUploadPath(url)) return false;
  // Solo paths relativos del origen (no protocol-relative //evil).
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  // Remotos http(s) permitidos solo como <img src>; no se fetchean en servidor.
  if (/^https?:\/\//i.test(url)) return true;
  return false;
}

/** Path logos, remote URLs, and data URLs all work as <img src>. */
export function companyLogoSrc(logoUrl?: string | null): string {
  const url = (logoUrl || "").trim();
  if (isAllowedLogoUrl(url)) {
    // Cache-bust only for the bundled default path (not data URLs).
    if (url === DEFAULT_LOGO || url.startsWith("/logo-bunuelandia.png")) {
      return "/logo-bunuelandia.png?v=3";
    }
    return url;
  }
  return "/logo-bunuelandia.png?v=3";
}
