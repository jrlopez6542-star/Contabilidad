import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { VIEW_MODE_BOOT_SCRIPT } from "@/lib/view-mode";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Buñuelandia — Facturación y gestión comercial",
  description:
    "Sistema de facturación e inventario de Buñuelandia (COP, es-CO)",
  applicationName: "Buñuelandia",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Buñuelandia",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
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
      <body className={inter.className}>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
