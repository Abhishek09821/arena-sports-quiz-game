"use client";

import Link from "next/link";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import {
  ArrowRight,
  Zap,
  Swords,
  Trophy,
  Timer,
  Gamepad2,
  Users,
  Calendar,
  HelpCircle,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import { SPORT_LIST, SPORT_META } from "@/data/questions";
import { audio } from "@/lib/audio";

const modes = [
  {
    icon: <Gamepad2 size={22} />,
    title: "Classic",
    desc: "5–20 questions. Your pace.",
    href: "/play",
    accent: "#00d4ff",
  },
  {
    icon: <Timer size={22} />,
    title: "60s Sprint",
    desc: "One minute. Maximum damage.",
    href: "/sprint",
    accent: "#f59e0b",
  },
  {
    icon: <Swords size={22} />,
    title: "1v1 Buzzer",
    desc: "Real-time head-to-head.",
    href: "/multiplayer",
    accent: "#ff4d6a",
  },
  {
    icon: <Trophy size={22} />,
    title: "Challenge",
    desc: "10 custom questions. Dare someone.",
    href: "/challenge",
    accent: "#a855f7",
  },
];

const stats = [
  { icon: <Gamepad2 size={16} />, value: "8", label: "Sports", color: "#00d4ff" },
  { icon: <Calendar size={16} />, value: "1990–2026", label: "Coverage", color: "#a855f7" },
  { icon: <HelpCircle size={16} />, value: "AI Generated", label: "Questions", color: "#22d37e" },
  { icon: <Users size={16} />, value: "4", label: "Game Modes", color: "#f59e0b" },
];

function AnimatedSection({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.2, 0.9, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const sportsRef = useRef<HTMLDivElement>(null);
  const sportsInView = useInView(sportsRef, { once: true, margin: "-60px" });

  return (
    <main>
      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="arena-container pt-20 sm:pt-32 pb-12 relative">
        <div className="max-w-[900px]">
          {/* Eyebrow */}
          <motion.div
            className="arena-eyebrow mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            Premium Sports Quiz Platform
          </motion.div>

          {/* Title — staggered word reveal */}
          <h1 className="font-display text-[clamp(52px,9vw,120px)] leading-[0.88] tracking-[-0.065em]">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.2, 0.9, 0.3, 1] }}
            >
              ARENA
            </motion.span>
            <motion.span
              className="block arena-gradient-text"
              initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.2, 0.9, 0.3, 1] }}
            >
              SPORTS QUIZ
            </motion.span>
          </h1>

          {/* Subtitle */}
          <motion.p
            className="text-arena-muted text-lg sm:text-xl max-w-[620px] mt-6 leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Test your sports knowledge across eight disciplines. Fast
            gameplay, premium feedback, and competition modes that
            actually feel competitive.
          </motion.p>

          {/* CTA Row */}
          <motion.div
            className="flex flex-wrap gap-3 mt-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Link
              href="/play"
              className="arena-btn arena-btn-primary text-base px-7 py-4"
              onClick={() => audio.unlock()}
            >
              <Zap size={18} />
              Play Now
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/sprint"
              className="arena-btn arena-btn-ghost"
              onClick={() => audio.unlock()}
            >
              <Timer size={17} />
              60s Sprint
            </Link>
            <Link
              href="/multiplayer"
              className="arena-btn arena-btn-ghost"
              onClick={() => audio.unlock()}
            >
              <Swords size={17} />
              1v1 Buzzer
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-arena-muted/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown size={16} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Gradient Divider ─────────────────────────────────── */}
      <div className="arena-container"><div className="arena-divider" /></div>

      {/* ── Stats Bar ───────────────────────────────────────── */}
      <section className="arena-container py-10">
        <AnimatedSection>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="arena-card arena-card-shine flex items-center gap-3.5 py-4 px-5"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 * i, duration: 0.4 }}
                whileHover={{ y: -3 }}
              >
                <div
                  className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                  style={{ background: `${stat.color}15`, color: stat.color }}
                >
                  {stat.icon}
                </div>
                <div>
                  <div className="font-display font-bold text-xl tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-[11px] text-arena-muted uppercase tracking-wider font-semibold">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ── Sports Grid ─────────────────────────────────────── */}
      <section className="arena-container py-10" ref={sportsRef}>
        <AnimatedSection>
          <div className="flex justify-between items-end mb-6">
            <div>
              <div className="arena-eyebrow">The Arena</div>
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight mt-1.5 font-bold">
                Eight sports. One scoreboard.
              </h2>
            </div>
            <div className="arena-pill hidden sm:flex">
              Infinite AI trivia
            </div>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SPORT_LIST.map((sport, i) => {
            const meta = SPORT_META[sport];
            return (
              <motion.div
                key={sport}
                initial={{ opacity: 0, y: 20 }}
                animate={sportsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.06 * i + 0.15, duration: 0.4, ease: [0.2, 0.9, 0.3, 1] }}
              >
                <Link
                  href={`/play?sport=${encodeURIComponent(sport)}`}
                  className="arena-card arena-card-shine arena-sport-card block group"
                  data-sport={sport}
                  onClick={() => audio.select()}
                  style={{ "--sport-color": meta.color } as React.CSSProperties}
                >
                  <motion.div
                    className="text-4xl mb-3"
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {meta.icon}
                  </motion.div>
                  <div>
                    <h3 className="font-display font-bold tracking-tight text-base">
                      {sport}
                    </h3>
                    <div className="text-[11px] text-arena-muted mt-0.5 flex items-center gap-1">
                      1990–2026
                      <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Gradient Divider ─────────────────────────────────── */}
      <div className="arena-container"><div className="arena-divider" /></div>

      {/* ── Game Modes ──────────────────────────────────────── */}
      <section className="arena-container py-10">
        <AnimatedSection>
          <div className="arena-eyebrow mb-2">Game Modes</div>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-6 font-bold">
            Pick your format.
          </h2>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {modes.map((mode, i) => (
            <motion.div
              key={mode.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 * i + 0.1, duration: 0.4 }}
            >
              <Link
                href={mode.href}
                className="arena-card arena-card-shine block group h-full"
                onClick={() => audio.select()}
              >
                {/* Accent line */}
                <div
                  className="w-full h-[2px] rounded-full mb-5 opacity-50 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(90deg, ${mode.accent}, transparent)` }}
                />
                <div
                  className="w-11 h-11 rounded-xl grid place-items-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                  style={{
                    background: `${mode.accent}12`,
                    color: mode.accent,
                    boxShadow: `0 0 0 rgba(0,0,0,0)`,
                  }}
                >
                  {mode.icon}
                </div>
                <h3 className="font-display font-bold tracking-tight text-lg mb-1">
                  {mode.title}
                </h3>
                <p className="text-sm text-arena-muted leading-relaxed">{mode.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs text-arena-muted/50 group-hover:text-arena-accent/70 transition-colors">
                  <span>Play</span>
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="arena-container py-12 mt-8">
        <div className="arena-divider mb-8" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="font-display text-xs tracking-[0.14em] uppercase text-arena-muted font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-arena-accent animate-pulse" />
              Built for sport obsessives
            </div>
            <div className="text-sm text-arena-muted/50 mt-1.5">
              Arena · Original verified question bank · Premium sports quiz
              platform
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin"
              className="text-xs text-arena-muted/30 hover:text-arena-muted transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
