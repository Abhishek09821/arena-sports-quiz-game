"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  ArrowLeft,
  Users,
  Gamepad2,
  Trophy,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Clock,
  Swords,
  Radio,
  BarChart3,
  TrendingUp,
  Activity,
  LogOut,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  CircleDot,
  Hash,
} from "lucide-react";
import { audio } from "@/lib/audio";

interface RoomItem {
  id: string;
  code: string;
  mode: string;
  status: "waiting" | "live" | "finished" | string;
  sport: string;
  difficulty: string;
  hostName: string;
  rounds: number;
  createdAt: string;
  rawCreatedAt: string;
}

interface AdminTelemetryData {
  users: {
    total: number;
    newToday: number;
    activeNow: number;
  };
  rooms: {
    total: number;
    waiting: number;
    live: number;
    finished: number;
    recent: RoomItem[];
  };
  games: {
    totalPlayed: number;
    totalSoloSessions: number;
    totalMultiplayer: number;
  };
  questions: {
    totalCreated: number;
  };
  analytics: {
    dailyTimeline: Array<{ date: string; label: string; games: number; rooms: number }>;
    hourlyTimeline: Array<{ hour: number; label: string; count: number }>;
    sportPopularity: Record<string, number>;
  };
}

interface UserProfileRow {
  id: string;
  email: string;
  display_name: string;
  role: string;
  total_games_played: number;
  total_score: number;
  created_at: string;
}

type Tab = "analytics" | "rooms" | "users";

export default function AdminDashboardPage() {
  const router = useRouter();

  const [telemetry, setTelemetry] = useState<AdminTelemetryData | null>(null);
  const [users, setUsers] = useState<UserProfileRow[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("analytics");
  const [timeRange, setTimeRange] = useState<"7d" | "24h">("7d");
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string>("Admin");
  const [userSearch, setUserSearch] = useState("");

  // Check Admin Authorization Token
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = sessionStorage.getItem("arena_admin_token");
    const id = sessionStorage.getItem("arena_admin_id") || "arena-admin";

    if (!token) {
      router.push("/admin/login");
      return;
    }

    setAdminToken(token);
    setAdminId(id);
  }, [router]);

  // Fetch Telemetry Data
  const fetchTelemetry = useCallback(
    async (isBackground = false) => {
      if (!adminToken) return;
      if (!isBackground) setIsFetching(true);
      setFetchError(null);

      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${adminToken}`,
        };

        const [statsRes, usersRes] = await Promise.all([
          fetch("/api/admin/stats", { headers }),
          fetch("/api/admin/users", { headers }),
        ]);

        if (statsRes.status === 401 || usersRes.status === 401) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("arena_admin_token");
          }
          router.push("/admin/login");
          return;
        }

        const statsData = await statsRes.json();
        if (statsData.success && statsData.stats) {
          setTelemetry(statsData.stats);
          setLastUpdated(
            new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
          );
        } else {
          throw new Error(statsData.error || "Failed to load telemetry");
        }

        const usersData = await usersRes.json();
        if (usersData.success && usersData.users) {
          setUsers(usersData.users);
        }
      } catch (err) {
        if (!isBackground) {
          setFetchError(err instanceof Error ? err.message : "Error connecting to telemetry service.");
        }
      } finally {
        if (!isBackground) setIsFetching(false);
      }
    },
    [adminToken, router]
  );

  // Initial load
  useEffect(() => {
    if (adminToken) {
      fetchTelemetry(false);
    }
  }, [adminToken, fetchTelemetry]);

  // Real-time polling loop (every 5 seconds when autoRefresh is enabled)
  useEffect(() => {
    if (!autoRefresh || !adminToken) return;

    const interval = setInterval(() => {
      fetchTelemetry(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, adminToken, fetchTelemetry]);

  const handleLogout = () => {
    audio.click();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("arena_admin_token");
      sessionStorage.removeItem("arena_admin_id");
      document.cookie = "arena_admin_token=; path=/; max-age=0";
    }
    router.push("/admin/login");
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.display_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.id?.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  // Max value calculation for SVG timeline chart
  const timelineData = useMemo(() => {
    if (!telemetry?.analytics) return [];
    if (timeRange === "7d") {
      return telemetry.analytics.dailyTimeline.map((item) => ({
        label: item.label,
        value: item.games,
        secondary: item.rooms,
      }));
    } else {
      return telemetry.analytics.hourlyTimeline.map((item) => ({
        label: item.label,
        value: item.count,
        secondary: Math.round(item.count * 0.4),
      }));
    }
  }, [telemetry, timeRange]);

  const maxTimelineValue = useMemo(() => {
    const vals = timelineData.map((d) => d.value);
    return Math.max(...vals, 5);
  }, [timelineData]);

  if (!adminToken && isFetching) {
    return (
      <div className="min-h-screen bg-arena-bg flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-arena-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arena-bg text-white selection:bg-red-500/30">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-arena-line/80 bg-[#0B0D13]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl border border-arena-line flex items-center justify-center text-arena-muted hover:text-white hover:bg-white/[.04] transition-colors"
              title="Return to Arena Main"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)]">
                <Shield size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm tracking-wide">COMMAND CENTER</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-[10px] font-mono font-semibold text-red-400 uppercase">
                    Admin Portal
                  </span>
                </div>
                <div className="text-[11px] text-arena-muted font-mono flex items-center gap-1.5">
                  <span>ID: {adminId}</span>
                  <span>•</span>
                  <span className="text-arena-accent flex items-center gap-1">
                    <Radio size={10} className="animate-pulse" /> Live Telemetry
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Auto-Refresh Status */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                autoRefresh
                  ? "bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.15)]"
                  : "bg-white/[.03] border-arena-line text-arena-muted hover:text-white"
              }`}
              title="Toggle 5s real-time live polling"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? "bg-green-400 animate-ping" : "bg-arena-muted"}`} />
              <span>{autoRefresh ? "Live Stream (5s)" : "Paused"}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchTelemetry(false)}
              disabled={isFetching}
              className="p-2 rounded-xl border border-arena-line bg-white/[.03] text-arena-muted hover:text-white hover:bg-white/[.06] transition-all cursor-pointer disabled:opacity-50"
              title="Manual refresh"
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin text-arena-accent" : ""} />
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.1)]"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {fetchError && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle size={18} />
              <span>{fetchError}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchTelemetry(false)}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            4 HERO REAL-TIME TELEMETRY METRIC CARDS
           ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* 1. USERS METRIC */}
          <div className="relative overflow-hidden rounded-2xl border border-arena-line/80 bg-gradient-to-b from-[#141722]/90 to-[#0C0E15]/90 p-5 shadow-xl">
            <div className="absolute top-0 right-0 p-4 text-arena-accent/15">
              <Users size={48} />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-arena-muted">
                Users Telemetry
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-arena-accent/10 border border-arena-accent/30 text-arena-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-arena-accent animate-pulse" />
                {telemetry?.users.activeNow ?? 0} active now
              </span>
            </div>
            <div className="font-display text-4xl font-extrabold tracking-tight text-white mb-1">
              {telemetry?.users.total.toLocaleString() ?? "—"}
            </div>
            <p className="text-xs text-arena-muted flex items-center gap-1.5">
              <TrendingUp size={12} className="text-green-400" />
              <span className="text-green-400 font-semibold">+{telemetry?.users.newToday ?? 0}</span> new registrations today
            </p>
          </div>

          {/* 2. GAMES PLAYED METRIC */}
          <div className="relative overflow-hidden rounded-2xl border border-arena-line/80 bg-gradient-to-b from-[#141722]/90 to-[#0C0E15]/90 p-5 shadow-xl">
            <div className="absolute top-0 right-0 p-4 text-green-400/15">
              <Gamepad2 size={48} />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-arena-muted">
                Total Games Played
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/25">
                Completed
              </span>
            </div>
            <div className="font-display text-4xl font-extrabold tracking-tight text-white mb-1">
              {telemetry?.games.totalPlayed.toLocaleString() ?? "—"}
            </div>
            <p className="text-xs text-arena-muted">
              <span className="text-white font-medium">{telemetry?.games.totalMultiplayer ?? 0}</span> rooms •{" "}
              <span className="text-white font-medium">{telemetry?.games.totalSoloSessions ?? 0}</span> solo sessions
            </p>
          </div>

          {/* 3. ROOMS TELEMETRY METRIC */}
          <div className="relative overflow-hidden rounded-2xl border border-arena-line/80 bg-gradient-to-b from-[#141722]/90 to-[#0C0E15]/90 p-5 shadow-xl">
            <div className="absolute top-0 right-0 p-4 text-purple-400/15">
              <Swords size={48} />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-arena-muted">
                Rooms Created
              </span>
              <span className="text-[10px] font-mono text-arena-muted">1v1 Realtime</span>
            </div>
            <div className="font-display text-4xl font-extrabold tracking-tight text-white mb-2">
              {telemetry?.rooms.total.toLocaleString() ?? "—"}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-green-500/15 text-green-400 border border-green-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {telemetry?.rooms.live ?? 0} Live
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                {telemetry?.rooms.waiting ?? 0} Waiting
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/[.04] text-arena-muted border border-arena-line">
                {telemetry?.rooms.finished ?? 0} Finished
              </span>
            </div>
          </div>

          {/* 4. TOTAL QUESTIONS METRIC (METRIC ONLY, NO HEAVY TABLE) */}
          <div className="relative overflow-hidden rounded-2xl border border-arena-line/80 bg-gradient-to-b from-[#141722]/90 to-[#0C0E15]/90 p-5 shadow-xl">
            <div className="absolute top-0 right-0 p-4 text-orange-400/15">
              <Trophy size={48} />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-arena-muted">
                Questions Metric
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/25">
                AI + Curated
              </span>
            </div>
            <div className="font-display text-4xl font-extrabold tracking-tight text-white mb-1">
              {telemetry?.questions.totalCreated.toLocaleString() ?? "—"}
            </div>
            <p className="text-xs text-arena-muted">
              Across 8 sports • High accuracy curriculum
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TABS NAVIGATION
           ═══════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between border-b border-arena-line mb-6 pb-2 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-arena-accent/15 text-arena-accent border border-arena-accent/40 shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                  : "text-arena-muted hover:text-white hover:bg-white/[.03]"
              }`}
            >
              <BarChart3 size={15} />
              Full Analysis & Graphs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rooms")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "rooms"
                  ? "bg-arena-accent/15 text-arena-accent border border-arena-accent/40 shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                  : "text-arena-muted hover:text-white hover:bg-white/[.03]"
              }`}
            >
              <Radio size={15} className="text-green-400 animate-pulse" />
              Real-Time Rooms ({telemetry?.rooms.recent.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "users"
                  ? "bg-arena-accent/15 text-arena-accent border border-arena-accent/40 shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                  : "text-arena-muted hover:text-white hover:bg-white/[.03]"
              }`}
            >
              <Users size={15} />
              Registered Users ({users.length})
            </button>
          </div>

          <div className="text-xs font-mono text-arena-muted flex items-center gap-2">
            <span>Last Synced: {lastUpdated || "Connecting..."}</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 1: FULL ANALYSIS & DATE/TIME GRAPHS
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Timeline Activity Chart Card */}
            <div className="rounded-3xl border border-arena-line/80 bg-gradient-to-b from-[#13151F] to-[#0A0C12] p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity size={18} className="text-arena-accent" />
                    <h3 className="text-lg font-display font-bold text-white tracking-wide">
                      Activity Timeline (Date & Time Wise Analysis)
                    </h3>
                  </div>
                  <p className="text-xs text-arena-muted">
                    Visual telemetry curve of games and rooms played over time
                  </p>
                </div>

                {/* Date range filter */}
                <div className="flex items-center gap-1.5 bg-white/[.04] p-1 rounded-xl border border-arena-line">
                  <button
                    type="button"
                    onClick={() => setTimeRange("7d")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                      timeRange === "7d"
                        ? "bg-arena-accent text-black shadow-sm"
                        : "text-arena-muted hover:text-white"
                    }`}
                  >
                    Past 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeRange("24h")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                      timeRange === "24h"
                        ? "bg-arena-accent text-black shadow-sm"
                        : "text-arena-muted hover:text-white"
                    }`}
                  >
                    Past 24 Hours
                  </button>
                </div>
              </div>

              {/* Interactive SVG Bar/Area Chart */}
              <div className="mt-4">
                <div className="h-64 flex items-end gap-2 sm:gap-4 pt-8 pb-2 px-2 border-b border-arena-line">
                  {timelineData.map((d, i) => {
                    const heightPercent = Math.max(12, Math.round((d.value / maxTimelineValue) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                        {/* Hover Tooltip */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 border border-arena-line text-xs font-mono px-2 py-1 rounded-md pointer-events-none whitespace-nowrap shadow-xl z-20">
                          <span className="text-arena-accent font-bold">{d.value}</span> games • {d.label}
                        </div>

                        {/* Bar */}
                        <div className="w-full max-w-[40px] flex items-end justify-center h-full">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPercent}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className="w-full rounded-t-lg bg-gradient-to-t from-arena-accent/30 via-arena-accent/60 to-arena-accent hover:to-white transition-all shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                          />
                        </div>

                        {/* Label */}
                        <span className="text-[10px] font-mono text-arena-muted group-hover:text-white transition-colors truncate max-w-full">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-arena-muted mt-3 px-1">
                  <span>● Games Played Activity Curve</span>
                  <span>Peak Value: {maxTimelineValue} matches</span>
                </div>
              </div>
            </div>

            {/* Sub-Grids: Sport Popularity & Game Mode Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sport Popularity */}
              <div className="rounded-3xl border border-arena-line/80 bg-gradient-to-b from-[#13151F] to-[#0A0C12] p-6 shadow-xl">
                <h4 className="text-sm font-display font-bold text-white mb-4 flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-400" />
                  Sport Popularity Distribution
                </h4>

                <div className="space-y-3">
                  {Object.entries(telemetry?.analytics.sportPopularity || {}).length > 0 ? (
                    Object.entries(telemetry!.analytics.sportPopularity)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([sport, count], idx) => {
                        const total = Object.values(telemetry!.analytics.sportPopularity).reduce((a, b) => a + b, 0) || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span>{sport}</span>
                              <span className="font-mono text-arena-muted">{count} matches ({pct}%)</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-white/[.04] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-arena-accent to-blue-500"
                                style={{ width: `${Math.max(5, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-xs text-arena-muted py-8 text-center font-mono">
                      Telemetry data accumulating as matches are played...
                    </div>
                  )}
                </div>
              </div>

              {/* Game Modes Distribution */}
              <div className="rounded-3xl border border-arena-line/80 bg-gradient-to-b from-[#13151F] to-[#0A0C12] p-6 shadow-xl">
                <h4 className="text-sm font-display font-bold text-white mb-4 flex items-center gap-2">
                  <Layers size={16} className="text-arena-accent" />
                  Game Modes Share
                </h4>

                <div className="space-y-4 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="flex items-center gap-2">
                        <Swords size={14} className="text-purple-400" />
                        1v1 Realtime Multiplayer
                      </span>
                      <span className="font-mono text-arena-accent">
                        {telemetry?.games.totalMultiplayer ?? 0} Rooms
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-white/[.04] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 w-[65%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="flex items-center gap-2">
                        <Gamepad2 size={14} className="text-green-400" />
                        Solo & Challenge Quizzes
                      </span>
                      <span className="font-mono text-green-400">
                        {telemetry?.games.totalSoloSessions ?? 0} Sessions
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-white/[.04] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 w-[35%]" />
                    </div>
                  </div>

                  <div className="mt-6 p-3.5 rounded-2xl bg-white/[.02] border border-arena-line text-xs text-arena-muted flex items-center justify-between">
                    <span>Curriculum Question Engine</span>
                    <span className="text-white font-mono font-semibold">Active & Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2: REAL-TIME ROOMS FEED
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "rooms" && (
          <div className="rounded-3xl border border-arena-line/80 bg-gradient-to-b from-[#13151F] to-[#0A0C12] p-6 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Radio size={18} className="text-green-400 animate-pulse" />
                  Real-Time Rooms Activity Feed
                </h3>
                <p className="text-xs text-arena-muted">
                  Live feed of 1v1 multiplayer matches created across Arena
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-arena-muted">
                  Showing {telemetry?.rooms.recent.length ?? 0} most recent
                </span>
              </div>
            </div>

            {telemetry?.rooms.recent && telemetry.rooms.recent.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-arena-line text-arena-muted uppercase font-mono text-[10px] tracking-wider">
                      <th className="py-3 px-4">Room Code</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Sport</th>
                      <th className="py-3 px-4">Difficulty</th>
                      <th className="py-3 px-4">Host</th>
                      <th className="py-3 px-4">Rounds</th>
                      <th className="py-3 px-4">Created Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-arena-line/40">
                    {telemetry.rooms.recent.map((rm) => (
                      <tr key={rm.id} className="hover:bg-white/[.02] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-arena-accent tracking-wider">
                          {rm.code}
                        </td>
                        <td className="py-3.5 px-4">
                          {rm.status === "live" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 font-semibold text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                              Live Match
                            </span>
                          ) : rm.status === "waiting" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 font-semibold text-[10px]">
                              In Lobby
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[.04] border border-arena-line text-arena-muted text-[10px]">
                              Finished
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-white">{rm.sport}</td>
                        <td className="py-3.5 px-4 text-arena-muted">{rm.difficulty}</td>
                        <td className="py-3.5 px-4 font-mono text-arena-accent/80">{rm.hostName}</td>
                        <td className="py-3.5 px-4 font-mono text-arena-muted">{rm.rounds} Qs</td>
                        <td className="py-3.5 px-4 font-mono text-arena-muted whitespace-nowrap">
                          {rm.createdAt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 text-arena-muted font-mono text-xs">
                No active multiplayer rooms found yet. Create a 1v1 room to view telemetry live!
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 3: REGISTERED USERS
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "users" && (
          <div className="rounded-3xl border border-arena-line/80 bg-gradient-to-b from-[#13151F] to-[#0A0C12] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Users size={18} className="text-arena-accent" />
                  Registered User Accounts
                </h3>
                <p className="text-xs text-arena-muted">
                  Player profiles with total matches and aggregate score records
                </p>
              </div>

              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-arena-muted pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter users..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/[.03] border border-arena-line text-xs text-white placeholder:text-arena-muted focus:outline-none focus:border-arena-accent transition-all"
                />
              </div>
            </div>

            {filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-arena-line text-arena-muted uppercase font-mono text-[10px] tracking-wider">
                      <th className="py-3 px-4">Player</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Matches</th>
                      <th className="py-3 px-4">Total Score</th>
                      <th className="py-3 px-4">Joined At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-arena-line/40">
                    {filteredUsers.map((u) => {
                      const d = new Date(u.created_at);
                      const dateStr = d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
                      return (
                        <tr key={u.id} className="hover:bg-white/[.02] transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white">
                            {u.display_name || "Anonymous Player"}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-arena-muted">{u.email}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-white/[.04] border border-arena-line text-[10px] font-mono text-arena-muted">
                              player
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-white">{u.total_games_played ?? 0}</td>
                          <td className="py-3.5 px-4 font-mono text-arena-accent">{u.total_score ?? 0}</td>
                          <td className="py-3.5 px-4 font-mono text-arena-muted whitespace-nowrap">{dateStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 text-arena-muted font-mono text-xs">
                No users match your search query.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
