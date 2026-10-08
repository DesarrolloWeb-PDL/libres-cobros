import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegistration } from "@/components/PwaRegistration";
import { SuperAdminThemeInjector } from "@/components/SuperAdminThemeInjector";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7c3aed",
};

export const metadata: Metadata = {
  title: "Libres Cobros",
  description:
    "Sistema de gestión de cobro",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${manrope.variable} min-h-full flex flex-col font-sans antialiased`}>
        <Providers>{children}</Providers>
        <SuperAdminThemeInjector />
        <PwaRegistration />
      </body>
    </html>
  );
}
