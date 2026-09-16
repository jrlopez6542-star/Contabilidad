/** @type {import('next').NextConfig} */
const nextConfig = {
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
      "/quotes/[id]/pdf": [
        "./node_modules/pdfkit/**/*",
        "./public/logo-bunuelandia-pdf.png",
        "./public/logo-bunuelandia.png",
      ],
    },
  },
};

export default nextConfig;
