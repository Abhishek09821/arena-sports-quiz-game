"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { audio } from "@/lib/audio";
import { Gamepad2, Menu, X, User, LogOut, Shield, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "@/components/AuthContext";

const links = [
  { href: "/play", label: "Play" },
  { href: "/sprint", label: "Sprint" },
  { href: "/multiplayer", label: "1v1" },
  { href: "/challenge", label: "Challenge" },
];

export default function ArenaHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, isAdmin, signOut, isLoading, openAuthModal, requireAuth } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className="arena-header"
        data-scrolled={scrolled ? "true" : undefined}
      >
        <div className="arena-container flex items-center justify-between py-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            onClick={() => audio.navigate()}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-arena-accent/15 to-arena-accent2/15 border border-arena-accent/15 grid place-items-center group-hover:border-arena-accent/35 group-hover:shadow-[0_0_20px_rgba(0,212,255,0.1)] transition-all duration-300">
              <Gamepad2 size={16} className="text-arena-accent" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              ARENA<span className="text-arena-accent">.</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-250 relative ${
                    active
                      ? "text-arena-text arena-nav-active"
                      : "text-arena-muted hover:text-arena-text"
                  }`}
                  onClick={(e) => {
                    audio.navigate();
                    if (!user) {
                      e.preventDefault();
                      requireAuth(link.href);
                    }
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User Auth controls */}
          <div className="hidden sm:flex items-center gap-2">
            {!isLoading && (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="arena-btn arena-btn-ghost text-xs border border-arena-accent/30 text-arena-accent hover:bg-arena-accent/10 px-3 py-1.5"
                    onClick={() => audio.click()}
                  >
                    <Shield size={13} />
                    Admin
                  </Link>
                )}

                {user ? (
                  <div className="flex items-center gap-2 pl-2 border-l border-arena-line">
                    <div className="flex items-center gap-1.5 text-xs text-arena-text font-medium px-2.5 py-1.5 rounded-lg bg-white/[.04] border border-arena-line">
                      <User size={13} className="text-arena-accent" />
                      <span className="max-w-[120px] truncate">
                        {profile?.display_name || user.email?.split("@")[0]}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        audio.click();
                        signOut();
                      }}
                      className="w-8 h-8 rounded-lg border border-arena-line bg-white/[.03] grid place-items-center hover:bg-white/[.08] hover:text-arena-bad transition-colors text-arena-muted"
                      title="Sign Out"
                    >
                      <LogOut size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="arena-btn arena-btn-ghost text-xs px-3 py-1.5 cursor-pointer"
                      onClick={() => {
                        audio.click();
                        openAuthModal("signin");
                      }}
                    >
                      <LogIn size={13} />
                      Sign In
                    </button>
                    <button
                      type="button"
                      className="arena-btn arena-btn-primary text-xs px-3.5 py-1.5 shadow-[0_0_15px_rgba(0,212,255,0.2)] cursor-pointer"
                      onClick={() => {
                        audio.click();
                        openAuthModal("signup");
                      }}
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden w-9 h-9 rounded-xl border border-arena-line bg-white/[.03] grid place-items-center hover:bg-white/[.06] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* Mobile slide-in drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm sm:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              className="fixed top-0 right-0 bottom-0 w-[270px] z-30 sm:hidden bg-arena-panel/95 backdrop-blur-xl border-l border-arena-line p-6 pt-20 flex flex-col justify-between"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="flex flex-col gap-2">
                {links.map((link, i) => {
                  const active = pathname === link.href;
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i + 0.1 }}
                    >
                      <Link
                        href={link.href}
                        className={`block px-4 py-3 rounded-xl text-base font-semibold transition-all ${
                          active
                            ? "text-arena-text bg-white/[.06] border border-arena-accent/20"
                            : "text-arena-muted hover:text-arena-text hover:bg-white/[.03] border border-transparent"
                        }`}
                        onClick={(e) => {
                          audio.navigate();
                          setMobileOpen(false);
                          if (!user) {
                            e.preventDefault();
                            requireAuth(link.href);
                          }
                        }}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-semibold text-arena-accent bg-arena-accent/10 border border-arena-accent/20"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Shield size={16} /> Admin Dashboard
                  </Link>
                )}
              </div>

              {/* Mobile auth footer */}
              <div className="pt-6 border-t border-arena-line">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-arena-text">
                      <User size={15} className="text-arena-accent" />
                      <span className="truncate">{profile?.display_name || user.email}</span>
                    </div>
                    <button
                      onClick={() => {
                        signOut();
                        setMobileOpen(false);
                      }}
                      className="arena-btn arena-btn-ghost w-full justify-center text-xs text-arena-bad"
                    >
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="arena-btn arena-btn-ghost text-xs justify-center cursor-pointer"
                      onClick={() => {
                        setMobileOpen(false);
                        openAuthModal("signin");
                      }}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      className="arena-btn arena-btn-primary text-xs justify-center cursor-pointer"
                      onClick={() => {
                        setMobileOpen(false);
                        openAuthModal("signup");
                      }}
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
