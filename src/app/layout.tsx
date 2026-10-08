import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegistration } from "@/components/PwaRegistration";
import { SuperAdminThemeInjector } from "@/components/SuperAdminThemeInjector";
import { PublicThemeToggle } from "@/components/PublicThemeToggle";

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
      <head>
        {/* Apply saved day/night theme before paint to avoid a flash of the wrong mode. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('libres-theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${manrope.variable} min-h-full flex flex-col font-sans antialiased`}>
        <Providers>{children}</Providers>
        <SuperAdminThemeInjector />
        <PublicThemeToggle />
        <PwaRegistration />
      </body>
    </html>
  );
}
