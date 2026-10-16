import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegistration } from "@/components/PwaRegistration";
import { SuperAdminThemeInjector } from "@/components/SuperAdminThemeInjector";
import { ThemeToggle } from "@/components/ThemeToggle";

/* Type system: Inter (body/UI — most-used Google Font), Plus Jakarta Sans
   (headings — display weight and personality), JetBrains Mono (kickers/
   labels). Poppins is deliberately excluded (competitor trade dress). */
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Fallback only — SuperAdminThemeInjector / ThemeToggle keep meta[theme-color] live.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a12" },
  ],
};

export const metadata: Metadata = {
  title: "Libres Cobros",
  description:
    "Cobrá tus cuotas sin comisiones ni letra chica: precio publicado, sin porcentaje sobre lo que recaudás y gratis hasta 50 socios.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg?v=4", type: "image/svg+xml" },
      { url: "/favicon.ico?v=4", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png?v=3",
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
      <body className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable} min-h-full flex flex-col font-sans antialiased`}>
        <Providers>{children}</Providers>
        <SuperAdminThemeInjector />
        <ThemeToggle />
        <PwaRegistration />
        <Analytics />
      </body>
    </html>
  );
}
