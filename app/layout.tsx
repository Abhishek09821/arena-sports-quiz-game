import "@/app/globals.css";
import type { Metadata } from "next";
import ArenaHeader from "@/components/ArenaHeader";
import AuthModal from "@/components/AuthModal";
import { AuthProvider } from "@/components/AuthContext";

export const metadata: Metadata = {
  title: "Arena — Premium Sports Quiz",
  description:
    "Test your sports knowledge across 8 sports from 1990 to 2026. Fast gameplay, premium UI, and competitive modes.",
  keywords: ["sports quiz", "trivia", "cricket", "football", "basketball", "tennis", "formula 1", "arena"],
  openGraph: {
    title: "Arena — Premium Sports Quiz",
    description: "Test your sports knowledge. 8 sports. 1990–2026. Multiple game modes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <div className="min-h-screen relative overflow-hidden">
            {/* Animated Background Mesh */}
            <div className="arena-bg-mesh">
              <div className="arena-orb arena-orb--1" />
              <div className="arena-orb arena-orb--2" />
              <div className="arena-orb arena-orb--3" />
              <div className="arena-orb arena-orb--4" />
            </div>

            {/* Subtle Grid Overlay */}
            <div className="arena-grid-bg" />

            {/* Noise */}
            <div className="noise" />

            {/* Header & Content */}
            <ArenaHeader />
            <AuthModal />
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
