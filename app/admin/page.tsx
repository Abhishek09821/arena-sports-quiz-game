"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  ArrowLeft,
  BarChart3,
  Users,
  Gamepad2,
  Trophy,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { SPORT_LIST, DIFFICULTY_LIST, SPORT_META } from "@/data/questions";
import { audio } from "@/lib/audio";

interface AdminStats {
  totalUsers: number;
  totalSessions: number;
  totalQuestions: number;
  totalChallenges: number;
  sportCounts: Record<string, number>;
  diffCounts: Record<string, number>;
  recentSessions: Array<{
    id: string;
    sport: string;
    difficulty: string;
    question_count: number;
    score: number;
    accuracy: number;
    status: string;
    created_at: string;
  }>;
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

type Tab = "overview" | "users" | "sessions";

export default function AdminPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading, token } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [userList, setUserList] = useState<UserProfileRow[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Authorization check
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/admin/login");
      } else if (!isAdmin) {
        setFetchError("Unauthorized: You do not possess administrator credentials.");
        setIsFetching(false);
      }
    }
  }, [user, isAdmin, isLoading, router]);

  const loadStats = async () => {
    if (!token) return;
    setIsFetching(true);
    setFetchError(null);

    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to fetch stats");
      }
      setStats(data.stats);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Error loading admin telemetry");
    } finally {
      setIsFetching(false);
    }
  };

  const loadUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUserList(data.users);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (isAdmin && token) {
      loadStats();
      loadUsers();
    }
  }, [isAdmin, token]);

  if (isLoading || (isFetching && !stats)) {
    return (
      <main className="arena-container min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-arena-muted">
          <Loader2 size={32} className="animate-spin text-arena-accent" />
          <span className="text-sm">Connecting to Admin Security Gateway...</span>
        </div>
      </main>
    );
  }

  if (fetchError) {
    return (
      <main className="arena-container py-16 max-w-lg mx-auto text-center">
        <div className="arena-card border-arena-bad/30 p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-arena-bad/10 text-arena-bad grid place-items-center mx-auto">
            <Shield size={24} />
          </div>
          <h2 className="font-display text-2xl font-bold text-arena-bad">Access Restricted</h2>
          <p className="text-sm text-arena-muted">{fetchError}</p>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/admin/login" className="arena-btn arena-btn-primary text-xs">
              Sign In as Admin
            </Link>
            <Link href="/" className="arena-btn arena-btn-ghost text-xs">
              Return Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="arena-container pb-20">
      <div className="pt-10 pb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-arena-muted hover:text-arena-text transition-colors mb-3"
          >
            <ArrowLeft size={15} /> Home
          </Link>

          <div className="flex items-center gap-2">
            <Shield size={20} className="text-arena-accent" />
            <span className="arena-eyebrow text-arena-accent">System Administration</span>
          </div>
          <h1 className="font-display text-[clamp(32px,5vw,52px)] font-bold tracking-tight mt-1">
            Arena Command Center
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { audio.click(); loadStats(); loadUsers(); }}
            className="arena-btn arena-btn-ghost text-xs"
            title="Refresh Telemetry"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-arena-line pb-3">
        <button
          className={`arena-btn text-xs ${activeTab === "overview" ? "arena-btn-primary" : "arena-btn-ghost"}`}
          onClick={() => { setActiveTab("overview"); audio.click(); }}
        >
          <BarChart3 size={14} /> Telemetry Overview
        </button>
        <button
          className={`arena-btn text-xs ${activeTab === "users" ? "arena-btn-primary" : "arena-btn-ghost"}`}
          onClick={() => { setActiveTab("users"); audio.click(); }}
        >
          <Users size={14} /> User Accounts ({stats?.totalUsers || 0})
        </button>
        <button
          className={`arena-btn text-xs ${activeTab === "sessions" ? "arena-btn-primary" : "arena-btn-ghost"}`}
          onClick={() => { setActiveTab("sessions"); audio.click(); }}
        >
          <Gamepad2 size={14} /> Live Quiz Sessions ({stats?.totalSessions || 0})
        </button>
      </div>

      {/* TAB 1: Overview */}
      {activeTab === "overview" && stats && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="arena-card p-4">
              <div className="flex items-center justify-between text-arena-muted mb-2">
                <span className="text-xs font-semibold uppercase">Total Users</span>
                <Users size={16} className="text-arena-accent" />
              </div>
              <div className="font-display text-3xl font-bold">{stats.totalUsers}</div>
              <div className="text-[11px] text-arena-muted mt-1">Registered profiles</div>
            </div>

            <div className="arena-card p-4">
              <div className="flex items-center justify-between text-arena-muted mb-2">
                <span className="text-xs font-semibold uppercase">Quiz Sessions</span>
                <Gamepad2 size={16} className="text-arena-accent2" />
              </div>
              <div className="font-display text-3xl font-bold">{stats.totalSessions}</div>
              <div className="text-[11px] text-arena-muted mt-1">Completed & in-progress</div>
            </div>

            <div className="arena-card p-4">
              <div className="flex items-center justify-between text-arena-muted mb-2">
                <span className="text-xs font-semibold uppercase">AI Questions</span>
                <Sparkles size={16} className="text-arena-gold" />
              </div>
              <div className="font-display text-3xl font-bold">{stats.totalQuestions}</div>
              <div className="text-[11px] text-arena-muted mt-1">Database cached pool</div>
            </div>

            <div className="arena-card p-4">
              <div className="flex items-center justify-between text-arena-muted mb-2">
                <span className="text-xs font-semibold uppercase">Challenges</span>
                <Trophy size={16} className="text-arena-good" />
              </div>
              <div className="font-display text-3xl font-bold">{stats.totalChallenges}</div>
              <div className="text-[11px] text-arena-muted mt-1">Custom player decks</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Questions by Sport */}
            <div className="arena-card space-y-4">
              <div className="arena-eyebrow">Database Distribution</div>
              <h3 className="font-display font-bold text-lg">Questions by Sport</h3>

              <div className="space-y-2.5">
                {SPORT_LIST.map((s) => {
                  const count = stats.sportCounts[s] || 0;
                  const maxCount = Math.max(...Object.values(stats.sportCounts), 1);
                  const pct = Math.round((count / maxCount) * 100);
                  const meta = SPORT_META[s];

                  return (
                    <div key={s} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          <span>{meta.icon}</span>
                          <span>{s}</span>
                        </span>
                        <span className="text-arena-muted">{count} questions</span>
                      </div>
                      <div className="w-full bg-white/[.04] h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-arena-accent to-arena-accent2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Questions by Difficulty & Activity */}
            <div className="space-y-6">
              <div className="arena-card space-y-4">
                <div className="arena-eyebrow">Difficulty Mix</div>
                <h3 className="font-display font-bold text-lg">Question Complexity</h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DIFFICULTY_LIST.map((d) => (
                    <div key={d} className="p-3 rounded-xl bg-white/[.03] border border-arena-line text-center">
                      <div className="text-[10px] uppercase font-semibold text-arena-muted">{d}</div>
                      <div className="font-display text-2xl font-bold mt-1">
                        {stats.diffCounts[d] || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Quiz Sessions Activity */}
              <div className="arena-card space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base">Recent Game Activity</h3>
                  <span className="text-xs text-arena-muted">Last 10 Rounds</span>
                </div>

                <div className="space-y-2">
                  {stats.recentSessions.length === 0 ? (
                    <div className="text-xs text-arena-muted text-center py-6">No recent quiz sessions yet.</div>
                  ) : (
                    stats.recentSessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-white/[.02] border border-arena-line text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-arena-text">{sess.sport}</span>
                          <span className="arena-pill text-[10px] px-1.5 py-0.5">{sess.difficulty}</span>
                        </div>
                        <div className="flex items-center gap-3 text-arena-muted">
                          <span className="text-arena-accent font-semibold">{sess.score} pts</span>
                          <span>{sess.accuracy}% acc</span>
                          <span className="text-[10px]">{new Date(sess.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Users */}
      {activeTab === "users" && (
        <div className="arena-card overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-arena-line text-arena-muted uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Games Played</th>
                <th className="py-3 px-4">Total Score</th>
                <th className="py-3 px-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arena-line">
              {userList.map((u) => (
                <tr key={u.id} className="hover:bg-white/[.02] transition-colors">
                  <td className="py-3 px-4 font-medium text-arena-text">
                    <div>{u.display_name || "Anonymous"}</div>
                    <div className="text-[10px] text-arena-muted">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`arena-pill px-2 py-0.5 text-[10px] ${u.role === "admin" ? "border-arena-accent text-arena-accent" : ""}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">{u.total_games_played}</td>
                  <td className="py-3 px-4 text-arena-accent font-semibold">{u.total_score}</td>
                  <td className="py-3 px-4 text-arena-muted">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Sessions */}
      {activeTab === "sessions" && stats && (
        <div className="arena-card overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-arena-line text-arena-muted uppercase tracking-wider">
                <th className="py-3 px-4">Session ID</th>
                <th className="py-3 px-4">Sport</th>
                <th className="py-3 px-4">Difficulty</th>
                <th className="py-3 px-4">Length</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arena-line">
              {stats.recentSessions.map((s) => (
                <tr key={s.id} className="hover:bg-white/[.02] transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-arena-muted">
                    {s.id.slice(0, 12)}...
                  </td>
                  <td className="py-3 px-4 font-medium text-arena-text">{s.sport}</td>
                  <td className="py-3 px-4">{s.difficulty}</td>
                  <td className="py-3 px-4">{s.question_count} Qs</td>
                  <td className="py-3 px-4 text-arena-accent font-semibold">{s.score}</td>
                  <td className="py-3 px-4">
                    <span className="arena-pill text-[10px] px-2 py-0.5">
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-arena-muted">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
