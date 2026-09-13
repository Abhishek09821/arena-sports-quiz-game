"use client";

import Link from "next/link";
import { motion } from "motion/react";
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
} from "lucide-react";
import { SPORT_LIST, SPORT_META, QUESTIONS } from "@/data/questions";
import { audio } from "@/lib/audio";

const modes = [
  {
    icon: <Gamepad2 size={22} />,
    title: "Classic",
    desc: "5–20 questions. Your pace.",
    href: "/play",
    color: "from-arena-accent/20 to-arena-accent/5",
  },
  {
    icon: <Timer size={22} />,
    title: "60s Sprint",
    desc: "One minute. Maximum damage.",
    href: "/sprint",
    color: "from-arena-warn/20 to-arena-warn/5",
  },
  {
    icon: <Swords size={22} />,
    title: "1v1 Buzzer",
    desc: "Real-time head-to-head.",
    href: "/multiplayer",
    color: "from-arena-bad/20 to-arena-bad/5",
  },
  {
    icon: <Trophy size={22} />,
    title: "Challenge",
    desc: "10 custom questions. Dare someone.",
    href: "/challenge",
    color: "from-arena-accent2/20 to-arena-accent2/5",
  },
];

const stats = [
  { icon: <Gamepad2 size={16} />, value: "8", label: "Sports" },
  { icon: <Calendar size={16} />, value: "1990–2026", label: "Coverage" },
  { icon: <HelpCircle size={16} />, value: String(QUESTIONS.length) + "+", label: "Questions" },
  { icon: <Users size={16} />, value: "4", label: "Game Modes" },
];

export default function Home() {
  return (
    <main>
      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="arena-container pt-16 sm:pt-24 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="arena-eyebrow mb-4">
            Premium Sports Quiz Platform
          </div>

          <h1 className="font-display text-[clamp(56px,9vw,110px)] leading-[0.9] tracking-[-0.065em] max-w-[900px]">
            <span className="block">ARENA</span>
            <span className="block bg-gradient-to-r from-arena-accent via-arena-accent2 to-arena-accent bg-clip-text text-transparent">
              SPORTS QUIZ
            </span>
          </h1>

          <p className="text-arena-muted text-lg max-w-[620px] mt-5 leading-relaxed">
            Test your sports knowledge across eight disciplines. Fast
            gameplay, premium feedback, and competition modes that
            actually feel competitive.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              href="/play"
              className="arena-btn arena-btn-primary text-base px-6 py-3.5"
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
          </div>
        </motion.div>
      </section>

      {/* ── Stats Bar ───────────────────────────────────────── */}
      <section className="arena-container py-6">
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="arena-card flex items-center gap-3 py-3 px-4"
            >
              <div className="text-arena-accent">{stat.icon}</div>
              <div>
                <div className="font-display font-bold text-lg tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs text-arena-muted uppercase tracking-wider font-semibold">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Sports Grid ─────────────────────────────────────── */}
      <section className="arena-container py-8">
        <div className="flex justify-between items-end mb-5">
          <div>
            <div className="arena-eyebrow">The Arena</div>
            <h2 className="font-display text-2xl sm:text-3xl tracking-tight mt-1">
              Eight sports. One scoreboard.
            </h2>
          </div>
          <div className="arena-pill hidden sm:flex">
            {QUESTIONS.length} questions
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SPORT_LIST.map((sport, i) => {
            const meta = SPORT_META[sport];
            return (
              <motion.div
                key={sport}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i + 0.2, duration: 0.3 }}
              >
                <Link
                  href={`/play?sport=${encodeURIComponent(sport)}`}
                  className="arena-card arena-sport-card block hover:translate-y-[-3px] transition-transform"
                  data-sport={sport}
                  onClick={() => audio.select()}
                >
                  <div className="text-4xl mb-3">{meta.icon}</div>
                  <div>
                    <h3 className="font-display font-bold tracking-tight">
                      {sport}
                    </h3>
                    <div className="text-xs text-arena-muted mt-0.5">
                      1990–2026 archive
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Game Modes ──────────────────────────────────────── */}
      <section className="arena-container py-8">
        <div className="arena-eyebrow mb-2">Game Modes</div>
        <h2 className="font-display text-2xl sm:text-3xl tracking-tight mb-5">
          Pick your format.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {modes.map((mode, i) => (
            <motion.div
              key={mode.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i + 0.3, duration: 0.3 }}
            >
              <Link
                href={mode.href}
                className="arena-card block group hover:translate-y-[-3px] transition-transform h-full"
                onClick={() => audio.select()}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mode.color} grid place-items-center mb-3 group-hover:scale-110 transition-transform`}
                >
                  {mode.icon}
                </div>
                <h3 className="font-display font-bold tracking-tight mb-1">
                  {mode.title}
                </h3>
                <p className="text-sm text-arena-muted">{mode.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="arena-container py-10 mt-8 border-t border-arena-line">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="font-display text-xs tracking-[0.14em] uppercase text-arena-muted font-bold">
              Built for sport obsessives
            </div>
            <div className="text-sm text-arena-muted/60 mt-1">
              Arena · Original verified question bank · Premium sports quiz
              platform
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin"
              className="text-xs text-arena-muted/40 hover:text-arena-muted transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
