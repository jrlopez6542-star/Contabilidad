/** @type {import('next').NextConfig} */

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Vercel always serves HTTPS in production — HSTS is safe and recommended.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Medium CSP: allows theme/view boot inline scripts in layout; avoids breaking Next 14.
  // No 'unsafe-eval' — App Router production builds do not need it.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
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
    ].join("; "),
  },
];

const STATIC_ASSET_CACHE =
  "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig = {
  poweredByHeader: false,
  compress: true,
  // next/image is rarely used (logos use <img>); formats ready if adopted later.
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverComponentsExternalPackages: [
      "pdfkit",
      "jszip",
      "@prisma/client",
      "@libsql/client",
      "@prisma/adapter-libsql",
    ],
    serverActions: {
      bodySizeLimit: "2mb",
    },
    outputFileTracingIncludes: {
      "/invoices/[id]/pdf": [
        "./node_modules/pdfkit/**/*",
        "./public/logo-bunuelandia-pdf.png",
        "./public/logo-bunuelandia.png",
      ],
      "/invoices/[id]/ticket": [
        "./node_modules/pdfkit/**/*",
        "./public/logo-bunuelandia-pdf.png",
        "./public/logo-bunuelandia.png",
      ],
      "/quotes/[id]/pdf": [
        "./node_modules/pdfkit/**/*",
        "./public/logo-bunuelandia-pdf.png",
        "./public/logo-bunuelandia.png",
      ],
      "/quotes/[id]/ticket": [
        "./node_modules/pdfkit/**/*",
        "./public/logo-bunuelandia-pdf.png",
        "./public/logo-bunuelandia.png",
      ],
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
      {
        source: "/logo-bunuelandia.png",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
      {
        source: "/logo-bunuelandia-sidebar.png",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
      {
        source: "/logo-bunuelandia-header-dark.png",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
      {
        source: "/logo-bunuelandia-pdf.png",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
    ];
  },
};

export default nextConfig;
