import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Shell } from "@/components/layout/shell";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "ReForge — AI Engineering Intelligence",
    template: "%s — ReForge",
  },
  description:
    "ReForge is an AI-powered engineering intelligence console: analyze, plan, impact-model, build, execute, and verify changes to your codebase.",
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
