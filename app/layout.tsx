import "@/app/globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import ArenaHeader from "@/components/ArenaHeader";
import AuthModal from "@/components/AuthModal";
import { AuthProvider } from "@/components/AuthContext";

export const metadata: Metadata = {
  title: "Arena — Premium Sports Quiz",
  description:
    "Test your sports knowledge across 6 sports from 1975 to 2026. Fast gameplay, premium UI, and competitive modes.",
  keywords: ["sports quiz", "trivia", "cricket", "football", "basketball", "tennis", "formula 1", "arena"],
  openGraph: {
    title: "Arena — Premium Sports Quiz",
    description: "Test your sports knowledge. 6 sports. 1975–2026. Multiple game modes.",
    type: "website",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider><AuthProvider>
          <div className="min-h-screen relative overflow-hidden">
            <div className="arena-grid-bg" />

            {/* Header & Content */}
            <ArenaHeader />
            <AuthModal />
            {children}
          </div>
        </AuthProvider></ThemeProvider>
      </body>
    </html>
  );
}
