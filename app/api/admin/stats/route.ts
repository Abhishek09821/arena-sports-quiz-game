import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server_auth";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Database not connected" }, { status: 500 });
  }

  try {
    const now = new Date();
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Users Telemetry
    const [
      { count: usersCount },
      { count: newUsersTodayCount },
      { count: activeOnlinePlayers },
    ] = await Promise.all([
      adminClient.from("profiles").select("id", { count: "exact", head: true }),
      adminClient.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", past24h),
      adminClient.from("game_players").select("id", { count: "exact", head: true }).eq("connected", true),
    ]);

    // 2. Rooms Telemetry
    const [
      { count: totalRoomsCount },
      { count: waitingRoomsCount },
      { count: liveRoomsCount },
      { count: finishedRoomsCount },
      { data: recentRoomsData },
    ] = await Promise.all([
      adminClient.from("game_rooms").select("id", { count: "exact", head: true }),
      adminClient.from("game_rooms").select("id", { count: "exact", head: true }).eq("status", "waiting"),
      adminClient.from("game_rooms").select("id", { count: "exact", head: true }).eq("status", "live"),
      adminClient.from("game_rooms").select("id", { count: "exact", head: true }).eq("status", "finished"),
      adminClient
        .from("game_rooms")
        .select("id, code, mode, status, settings, current_round, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    // 3. Quiz Sessions Telemetry
    const [
      { count: totalSessionsCount },
      { count: completedSessionsCount },
      { data: sessionTimelineData },
      { data: roomTimelineData },
    ] = await Promise.all([
      adminClient.from("quiz_sessions").select("id", { count: "exact", head: true }),
      adminClient.from("quiz_sessions").select("id", { count: "exact", head: true }).eq("status", "completed"),
      adminClient.from("quiz_sessions").select("created_at, mode, sport").gte("created_at", past7d),
      adminClient.from("game_rooms").select("created_at, settings").gte("created_at", past7d),
    ]);

    // 4. Questions Counter (Metric only, no heavy table)
    const { count: questionsCount } = await adminClient
      .from("questions")
      .select("id", { count: "exact", head: true });

    // Baseline curated bank + dynamically generated questions
    const totalQuestionsCreated = (questionsCount || 0) + 120;

    // 5. Total Games Played
    const totalGamesPlayed = (completedSessionsCount || 0) + (finishedRoomsCount || 0);

    // 6. Time-Series Date & Time Wise Breakdown (Past 7 Days)
    const dailyActivityMap: Record<string, { date: string; label: string; games: number; rooms: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
      dailyActivityMap[key] = { date: key, label, games: 0, rooms: 0 };
    }

    if (sessionTimelineData) {
      sessionTimelineData.forEach((s) => {
        const dateKey = s.created_at?.split("T")[0];
        if (dateKey && dailyActivityMap[dateKey]) {
          dailyActivityMap[dateKey].games += 1;
        }
      });
    }

    if (roomTimelineData) {
      roomTimelineData.forEach((r) => {
        const dateKey = r.created_at?.split("T")[0];
        if (dateKey && dailyActivityMap[dateKey]) {
          dailyActivityMap[dateKey].rooms += 1;
          dailyActivityMap[dateKey].games += 1;
        }
      });
    }

    const dailyTimeline = Object.values(dailyActivityMap);

    // 7. Hourly Breakdown (Past 24 Hours)
    const hourlyActivityMap: Record<number, { hour: number; label: string; count: number }> = {};
    for (let h = 23; h >= 0; h--) {
      const targetTime = new Date(now.getTime() - h * 60 * 60 * 1000);
      const hr = targetTime.getHours();
      hourlyActivityMap[h] = {
        hour: hr,
        label: `${hr.toString().padStart(2, "0")}:00`,
        count: 0,
      };
    }

    if (sessionTimelineData) {
      sessionTimelineData.forEach((s) => {
        const itemTime = new Date(s.created_at).getTime();
        const diffHours = Math.floor((now.getTime() - itemTime) / (60 * 60 * 1000));
        if (diffHours >= 0 && diffHours < 24 && hourlyActivityMap[23 - diffHours]) {
          hourlyActivityMap[23 - diffHours].count += 1;
        }
      });
    }

    const hourlyTimeline = Object.values(hourlyActivityMap);

    // 8. Sport Breakdown
    const sportPopularity: Record<string, number> = {};
    if (sessionTimelineData) {
      sessionTimelineData.forEach((s) => {
        const sp = s.sport || "Mixed";
        sportPopularity[sp] = (sportPopularity[sp] || 0) + 1;
      });
    }
    if (roomTimelineData) {
      roomTimelineData.forEach((r) => {
        const sp = (r.settings as { sport?: string } | null)?.sport || "Multi-Sport";
        sportPopularity[sp] = (sportPopularity[sp] || 0) + 1;
      });
    }

    // 9. Format Recent Room List with Player Count and Timestamps
    const formattedRooms = (recentRoomsData || []).map((rm) => {
      const settings = (rm.settings || {}) as {
        hostName?: string;
        sport?: string;
        difficulty?: string;
        count?: number;
      };

      const d = new Date(rm.created_at);
      const timeStr = d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const dateStr = d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });

      return {
        id: rm.id,
        code: rm.code,
        mode: rm.mode || "1v1 Buzzer",
        status: rm.status, // "waiting" | "live" | "finished"
        sport: settings.sport || "All Sports",
        difficulty: settings.difficulty || "Mixed",
        hostName: settings.hostName || "Host",
        rounds: settings.count || 10,
        createdAt: `${timeStr} • ${dateStr}`,
        rawCreatedAt: rm.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        users: {
          total: usersCount || 0,
          newToday: newUsersTodayCount || 0,
          activeNow: Math.max(activeOnlinePlayers || 0, (liveRoomsCount || 0) * 2),
        },
        rooms: {
          total: totalRoomsCount || 0,
          waiting: waitingRoomsCount || 0,
          live: liveRoomsCount || 0,
          finished: finishedRoomsCount || 0,
          recent: formattedRooms,
        },
        games: {
          totalPlayed: totalGamesPlayed,
          totalSoloSessions: totalSessionsCount || 0,
          totalMultiplayer: totalRoomsCount || 0,
        },
        questions: {
          totalCreated: totalQuestionsCreated,
        },
        analytics: {
          dailyTimeline,
          hourlyTimeline,
          sportPopularity,
        },
      },
    });
  } catch (error) {
    console.error("[Admin Stats API Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch admin statistics" },
      { status: 500 }
    );
  }
}
