import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/layout/shell";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ReForge — AI Engineering Intelligence",
    template: "%s — ReForge",
  },
  description:
    "ReForge is an AI-powered engineering intelligence console: analyze, plan, impact-model, build, execute, and verify changes to your codebase.",
};

export const viewport: Viewport = {
  themeColor: "#0E0E10",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} overflow-x-hidden`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bg-canvas text-text-primary antialiased font-sans overflow-x-hidden">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
