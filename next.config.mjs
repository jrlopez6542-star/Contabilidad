/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "pdfkit",
      "@prisma/client",
      "@libsql/client",
      "@prisma/adapter-libsql",
    ],
  },
};

export default nextConfig;
