import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { VIEW_MODE_BOOT_SCRIPT } from "@/lib/view-mode";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Buñuelandia — Facturación y gestión comercial",
  description:
    "Sistema de facturación, cotizaciones e inventario de Buñuelandia (COP, es-CO)",
  icons: {
    icon: "/logo-bunuelandia.png",
  },
  appleWebApp: {
    capable: true,
    title: "Buñuelandia",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b3d2e" },
    { media: "(prefers-color-scheme: dark)", color: "#061510" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CO" data-view-mode="auto" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `${THEME_BOOT_SCRIPT}${VIEW_MODE_BOOT_SCRIPT}`,
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
