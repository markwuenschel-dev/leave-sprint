import type { Metadata } from "next";
import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Leave Sprint Twin — Mark Wuenschel",
  description: "High-signal, local-first Next.js command center for the 29-day leave sprint (June 17 – July 15 2026). Daily rhythm, stage tracking, problem bank, and progress.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="bg-[#0a0c10] text-[#e6e8eb] antialiased">
        {children}
      </body>
    </html>
  );
}
