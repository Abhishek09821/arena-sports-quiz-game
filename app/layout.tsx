import "./globals.css";
import Link from "next/link";

export const metadata = { title: "Arena — Sports Quiz", description: "Fast, polished sports trivia from 1990–2026." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><div className="noise" /><header className="container nav"><Link href="/" className="brand">ARENA<span>.</span></Link><nav className="nav-links"><Link className="nav-link" href="/play">Play</Link><Link className="nav-link" href="/multiplayer">1v1</Link><Link className="nav-link" href="/challenge">Challenge</Link></nav></header>{children}</div>;
}
