import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Libres Cobros",
  description:
    "Sistema de gestión de cuotas de club deportivo. Los socios pueden consultar sus cuotas por DNI y pagar online.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-full flex flex-col font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
