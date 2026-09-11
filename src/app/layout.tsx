import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Libres Cobros",
  description:
    "Sistema de gestión de cobros para instituciones. Socios, cuotas y pagos en un solo lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${manrope.variable} min-h-full flex flex-col font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
