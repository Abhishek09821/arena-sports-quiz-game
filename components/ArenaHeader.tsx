"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { audio } from "@/lib/audio";
import { Gamepad2 } from "lucide-react";

const links = [
  { href: "/play", label: "Play" },
  { href: "/sprint", label: "Sprint" },
  { href: "/multiplayer", label: "1v1" },
  { href: "/challenge", label: "Challenge" },
];

export default function ArenaHeader() {
  const pathname = usePathname();

  return (
    <header className="arena-container flex items-center justify-between py-5">
      <Link
        href="/"
        className="flex items-center gap-2 group"
        onClick={() => audio.navigate()}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-arena-accent/20 to-arena-accent2/20 border border-arena-accent/20 grid place-items-center group-hover:border-arena-accent/40 transition-colors">
          <Gamepad2 size={16} className="text-arena-accent" />
        </div>
        <span className="font-display font-bold text-lg tracking-tight">
          ARENA<span className="text-arena-accent">.</span>
        </span>
      </Link>

      <nav className="hidden sm:flex items-center gap-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                active
                  ? "text-arena-text bg-white/[.06] border border-arena-line"
                  : "text-arena-muted hover:text-arena-text hover:bg-white/[.03] border border-transparent"
              }`}
              onClick={() => audio.navigate()}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile menu */}
      <nav className="flex sm:hidden items-center gap-1">
        {links.slice(0, 3).map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                active
                  ? "text-arena-text bg-white/[.06]"
                  : "text-arena-muted"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
