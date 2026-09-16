import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Contabilidad MVP — Facturación y control de ventas",
  description: "MVP de contabilidad, ventas y facturación interna (COP, es-CO)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CO">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
