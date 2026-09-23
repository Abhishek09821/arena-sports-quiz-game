"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X, Sun, Moon, LogOut, Trophy } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "./AuthContext";
import { GAME_MODES, FAQS } from "@/data/site";

export default function ArenaHeader() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, openAuthModal, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdown, setDropdown] = useState<"modes" | "faqs" | null>(null);
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMobileOpen(false); setDropdown(null); }, [pathname]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMobileOpen(false); setDropdown(null); menuButton.current?.focus(); }
    };
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) { setDropdown(null); setMobileOpen(false); }
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, []);

  const toggle = (name: "modes" | "faqs") => setDropdown(value => value === name ? null : name);
  return <header className="site-header" ref={header}>
    <div className="site-nav">
      <Link href="/" className="site-brand" aria-label="Arena home"><Trophy size={20} strokeWidth={1.7} />ARENA<span>.</span></Link>
      <nav id="site-navigation" className={`site-links ${mobileOpen ? "is-open" : ""}`} aria-label="Main navigation">
        <Link href="/friends" aria-current={pathname === "/friends" ? "page" : undefined}>Friends</Link>
        {(["modes", "faqs"] as const).map((name, index) => <Fragment key={name}>{index === 1 && <Link className="methodology-link" href="/methodology">Methodology</Link>}<div className="nav-group" onMouseEnter={() => { if (window.matchMedia("(min-width: 801px) and (hover: hover)").matches) setDropdown(name); }} onMouseLeave={() => { if (window.matchMedia("(min-width: 801px) and (hover: hover)").matches) setDropdown(null); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropdown(null); }}>
          <button className="nav-trigger" aria-expanded={dropdown === name} aria-controls={`nav-${name}`} onClick={() => toggle(name)}>{name === "modes" ? "Modes" : "FAQs"}<ChevronDown size={13} /></button>
          <div id={`nav-${name}`} className={`nav-popover ${name === "faqs" ? "nav-faqs" : ""}`} hidden={dropdown !== name}>
            <p className="nav-caption">{name === "modes" ? "Find your next game" : "A little help"}</p>
            {name === "modes" ? GAME_MODES.map(mode => <Link key={mode.href} href={mode.href} onClick={() => {setDropdown(null);setMobileOpen(false);}}><strong>{mode.title}</strong><span>{mode.description}</span></Link>) : <>{FAQS.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}<a className="nav-contact" href="mailto:abhishek.tiwarii9821@gmail.com">Still have a question? Email us →</a></>}
          </div>
        </div></Fragment>)}
        {isAdmin && <Link href="/admin">Admin</Link>}
      </nav>
      <div className="site-actions">
        <button className="nav-icon" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
        {user ? <button className="nav-icon" onClick={() => void signOut()} aria-label="Sign out"><LogOut size={18} /></button> : <button className="nav-signin" onClick={() => openAuthModal("signin")}>Sign in</button>}
        <button ref={menuButton} className="nav-icon mobile-menu-toggle" onClick={() => setMobileOpen(value => !value)} aria-expanded={mobileOpen} aria-controls="site-navigation" aria-label={mobileOpen ? "Close menu" : "Open menu"}>{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button>
      </div>
    </div>
  </header>;
}
