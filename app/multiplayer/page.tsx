"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Copy,
  Swords,
  Users,
  Wifi,
  WifiOff,
  Crown,
  AlertCircle,
  Check,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { audio } from "@/lib/audio";
import { buildGame } from "@/lib/quiz";
import { SPORT_LIST, DIFFICULTY_LIST, type Question, type Sport, type Difficulty } from "@/data/questions";
import { trackEvent } from "@/lib/analytics";

type RoomStatus = "idle" | "lobby" | "ready" | "playing" | "finished";
type PlayerState = { name: string; score: number; ready: boolean; connected: boolean };

function generateRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getPlayerToken(): string {
  if (typeof window === "undefined") return "usr_" + Math.random().toString(36).slice(2, 10);
  let t = sessionStorage.getItem("arena_mp_token");
  if (!t) {
    t = "usr_" + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem("arena_mp_token", t);
  }
  return t;
}

interface StoredMPSession {
  roomCode: string;
  playerToken: string;
  playerName: string;
  role: "host" | "guest";
}

export default function MultiplayerPage() {
  const [name, setName] = useState("Player 1");
  const [codeInput, setCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [status, setStatus] = useState<RoomStatus>("idle");
  const [players, setPlayers] = useState<Record<string, PlayerState>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [buzzWinner, setBuzzWinner] = useState<string | null>(null);
  const [myBuzzed, setMyBuzzed] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [events, setEvents] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);

  // New customization state for 1v1 Arena
  const [selectedSport, setSelectedSport] = useState<Sport | "All Sports">("All Sports");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | "Mixed">("Mixed");
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [roomSettings, setRoomSettings] = useState<{ sport: string; difficulty: string; hostName: string } | null>(null);

  const myIdRef = useRef<string>("usr_init");
  const channelRef = useRef<ReturnType<typeof supabase extends null ? never : NonNullable<typeof supabase>["channel"]> | null>(null);

  const addEvent = useCallback((msg: string) => {
    setEvents((prev) => [msg, ...prev].slice(0, 8));
  }, []);

  // Sync state directly from Supabase database
  const syncRoomState = useCallback(async (code: string, token: string) => {
    if (!code) return;
    try {
      const res = await fetch(`/api/multiplayer/room?code=${code}`);
      const data = await res.json();
      if (!res.ok || !data.success || !data.room) {
        return;
      }

      // Sync questions
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      }

      // Sync room settings
      if (data.room.settings) {
        setRoomSettings({
          sport: data.sport || "All Sports",
          difficulty: data.difficulty || "Mixed",
          hostName: data.hostName || "Host",
        });
      }

      // Sync players list
      if (Array.isArray(data.players)) {
        const playerMap: Record<string, PlayerState> = {};
        for (const p of data.players) {
          playerMap[p.player_token] = {
            name: p.display_name,
            score: p.score || 0,
            ready: true,
            connected: p.connected,
          };
        }
        setPlayers(playerMap);

        // Update scores
        const me = data.players.find((p: { player_token: string }) => p.player_token === token);
        const opp = data.players.find((p: { player_token: string }) => p.player_token !== token);
        if (me) setMyScore(me.score || 0);
        if (opp) setOpponentScore(opp.score || 0);

        // Determine host role
        if (data.players[0]?.player_token === token) {
          setIsHost(true);
        }
      }

      // Sync room status
      const remoteStatus = data.room.status;
      if (remoteStatus === "playing") {
        setStatus("playing");
      } else if (remoteStatus === "finished") {
        setStatus("finished");
      } else if (remoteStatus === "ready" || remoteStatus === "waiting") {
        setStatus("lobby");
      }
    } catch (err) {
      console.warn("[Multiplayer Sync] Error fetching room state:", err);
    }
  }, []);

  // Auto-restore multiplayer session across browser reloads
  useEffect(() => {
    myIdRef.current = getPlayerToken();
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("arena_mp_session") : null;
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as StoredMPSession;
      if (parsed.roomCode && parsed.playerToken) {
        myIdRef.current = parsed.playerToken;
        if (parsed.playerName) setName(parsed.playerName);
        setRoomCode(parsed.roomCode);
        setCodeInput(parsed.roomCode);
        setIsHost(parsed.role === "host");
        setStatus("lobby");
        addEvent(`Session restored. Reconnected to room ${parsed.roomCode}.`);
        void syncRoomState(parsed.roomCode, parsed.playerToken);
      }
    } catch {
      sessionStorage.removeItem("arena_mp_session");
    }
  }, [syncRoomState, addEvent]);

  // Periodic heartbeat polling to ensure both players are 100% synchronized
  useEffect(() => {
    if (!roomCode || status === "idle" || status === "finished") return;

    const interval = setInterval(() => {
      void syncRoomState(roomCode, myIdRef.current);
    }, 1200);

    return () => clearInterval(interval);
  }, [roomCode, status, syncRoomState]);

  // Create room with difficulty and sport stored in Supabase
  const createRoom = useCallback(async () => {
    setIsCreating(true);
    const code = generateRoomCode();
    setRoomCode(code);
    setCodeInput(code);
    setIsHost(true);

    const qs = buildGame({ sport: selectedSport, difficulty: selectedDifficulty, count: selectedCount });
    setQuestions(qs);
    setRoomSettings({
      sport: selectedSport,
      difficulty: selectedDifficulty,
      hostName: name || "Host",
    });

    try {
      await fetch("/api/multiplayer/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          hostName: name || "Host",
          sport: selectedSport,
          difficulty: selectedDifficulty,
          count: selectedCount,
          questions: qs,
          playerToken: myIdRef.current,
        }),
      });

      // Save active session for reload recovery
      sessionStorage.setItem(
        "arena_mp_session",
        JSON.stringify({
          roomCode: code,
          playerToken: myIdRef.current,
          playerName: name || "Host",
          role: "host",
        })
      );
    } catch (err) {
      console.warn("[Multiplayer] Supabase room persist notice:", err);
    } finally {
      setIsCreating(false);
      setStatus("lobby");
      addEvent(`Room created (${selectedDifficulty} • ${selectedSport}). Share code: ${code}`);
      trackEvent("room_created", { code, sport: selectedSport, difficulty: selectedDifficulty });
      audio.select();
    }
  }, [name, selectedSport, selectedDifficulty, selectedCount, addEvent]);

  // Join room with strict capacity enforcement
  const joinRoom = useCallback(async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setIsJoining(true);
    setJoinError(null);
    audio.select();

    try {
      // 1. Register this player in Supabase (enforces max 2 players and deduplication)
      const joinRes = await fetch("/api/multiplayer/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: code,
          playerName: name || "Player 2",
          playerToken: myIdRef.current,
        }),
      });

      const joinData = await joinRes.json();
      if (!joinRes.ok) {
        setJoinError(joinData.error || "Cannot join room. Verify the code.");
        audio.wrong();
        setIsJoining(false);
        return;
      }

      // 2. Fetch room details and questions
      const res = await fetch(`/api/multiplayer/room?code=${code}`);
      const data = await res.json();

      if (res.ok && data.success && data.questions?.length) {
        setQuestions(data.questions);
        setRoomCode(code);
        setIsHost(Boolean(joinData.isHost));
        setRoomSettings({
          hostName: data.hostName || "Host",
          sport: data.sport || "All Sports",
          difficulty: data.difficulty || "Mixed",
        });

        // Save session for reload resilience
        sessionStorage.setItem(
          "arena_mp_session",
          JSON.stringify({
            roomCode: code,
            playerToken: myIdRef.current,
            playerName: name || "Player 2",
            role: joinData.isHost ? "host" : "guest",
          })
        );

        setStatus("lobby");
        addEvent(`Joined room ${code}. Ready for match.`);
        trackEvent("room_joined", { code });
        audio.correct();
      } else {
        setJoinError(data.error || "Failed to load room questions.");
        audio.wrong();
      }
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join room.");
      audio.wrong();
    } finally {
      setIsJoining(false);
    }
  }, [codeInput, name, addEvent]);

  // Leave room and clean session
  const leaveRoom = useCallback(async () => {
    audio.click();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("arena_mp_session");
    }
    if (roomCode) {
      try {
        await fetch("/api/multiplayer/player", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode, playerToken: myIdRef.current, connected: false }),
        });
      } catch {}
    }
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    setStatus("idle");
    setRoomCode("");
    setCodeInput("");
    setPlayers({});
    setMyScore(0);
    setOpponentScore(0);
    setCurrentQ(0);
    setJoinError(null);
    setIsHost(false);
  }, [roomCode]);

  // Connect to Supabase Realtime channel for instant buzzers and answer feedback
  useEffect(() => {
    if (!supabase || !roomCode || status === "idle") return;

    const channel = supabase.channel(`arena:${roomCode}`, {
      config: { broadcast: { self: true } },
    });

    channelRef.current = channel;

    channel
      .on("broadcast", { event: "player_join" }, ({ payload }) => {
        if (payload.id !== myIdRef.current) {
          setPlayers((prev) => ({
            ...prev,
            [payload.id]: { name: payload.name, score: 0, ready: true, connected: true },
          }));
          addEvent(`${payload.name} joined`);
          audio.opponentJoined();
        }
      })
      .on("broadcast", { event: "game_start" }, ({ payload }) => {
        if (payload.questions) {
          setQuestions(payload.questions);
        }
        setStatus("playing");
        setCurrentQ(0);
        setBuzzWinner(null);
        setMyBuzzed(false);
        setSelectedAnswer(null);
        setShowAnswer(false);
        addEvent("Match started! Rapid buzzer active.");
        audio.click();
      })
      .on("broadcast", { event: "buzz" }, ({ payload }) => {
        if (!buzzWinner) {
          setBuzzWinner(payload.id);
          if (payload.id === myIdRef.current) {
            addEvent("You buzzed first! ✨");
          } else {
            addEvent(`${payload.name} buzzed first!`);
          }
          audio.buzzer();
        }
      })
      .on("broadcast", { event: "answer" }, ({ payload }) => {
        setShowAnswer(true);
        setSelectedAnswer(payload.answer);
        if (payload.correct) {
          if (payload.id === myIdRef.current) {
            setMyScore((s) => s + 100);
          } else {
            setOpponentScore((s) => s + 100);
          }
        }
        addEvent(
          payload.correct
            ? `${payload.name} answered correctly! +100`
            : `${payload.name} got it wrong.`
        );

        // Auto-advance after delay
        setTimeout(() => {
          setBuzzWinner(null);
          setMyBuzzed(false);
          setSelectedAnswer(null);
          setShowAnswer(false);
          setCurrentQ((prev) => {
            const nextQ = prev + 1;
            const total = questions.length || 10;
            if (nextQ >= total) {
              setStatus("finished");
              audio.roundComplete();

              // Sync score to Supabase
              fetch("/api/multiplayer/player", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  roomCode,
                  playerToken: myIdRef.current,
                  score: myScore,
                  status: "finished",
                }),
              }).catch(() => {});
            }
            return nextQ;
          });
        }, 2500);
      })
      .on("broadcast", { event: "disconnect" }, ({ payload }) => {
        setPlayers((prev) => ({
          ...prev,
          [payload.id]: { ...prev[payload.id], connected: false },
        }));
        addEvent(`${payload.name} disconnected`);
      })
      .subscribe((subStatus) => {
        if (subStatus === "SUBSCRIBED") {
          setConnected(true);
          // Announce ourselves
          channel.send({
            type: "broadcast",
            event: "player_join",
            payload: { id: myIdRef.current, name },
          });
          setPlayers((prev) => ({
            ...prev,
            [myIdRef.current]: { name, score: 0, ready: true, connected: true },
          }));
        }
      });

    return () => {
      channel.send({
        type: "broadcast",
        event: "disconnect",
        payload: { id: myIdRef.current, name },
      });
      void channel.unsubscribe();
      channelRef.current = null;
      setConnected(false);
    };
  }, [roomCode, status, name, addEvent, questions.length, myScore, buzzWinner]);

  const startGame = async () => {
    audio.click();
    // 1. Broadcast immediate start
    channelRef.current?.send({
      type: "broadcast",
      event: "game_start",
      payload: { questions },
    });
    // 2. Persist room status in Supabase
    try {
      await fetch("/api/multiplayer/player", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, status: "playing", currentRound: 0 }),
      });
    } catch {}
    setStatus("playing");
    setCurrentQ(0);
    setBuzzWinner(null);
    setMyBuzzed(false);
    setSelectedAnswer(null);
    setShowAnswer(false);
  };

  const buzz = () => {
    if (buzzWinner || myBuzzed) return;
    setMyBuzzed(true);
    channelRef.current?.send({
      type: "broadcast",
      event: "buzz",
      payload: { id: myIdRef.current, name, timestamp: Date.now() },
    });
  };

  const submitAnswer = (answer: number) => {
    const currentQuestion = questions[currentQ];
    if (!currentQuestion) return;
    const correct = answer === currentQuestion.answer;
    channelRef.current?.send({
      type: "broadcast",
      event: "answer",
      payload: { id: myIdRef.current, name, answer, correct },
    });
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(roomCode);
    audio.click();
    addEvent("Code copied!");
  };

  const playerCount = Object.keys(players).length;
  const q = questions[currentQ];
  const iAmBuzzWinner = buzzWinner === myIdRef.current;

  // ── Idle: Create/Join ───────────────────────────────────
  if (status === "idle") {
    return (
      <main className="arena-container pb-16">
        <div className="pt-10 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-arena-muted hover:text-arena-text transition-colors"
          >
            <ArrowLeft size={15} /> Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.9, 0.3, 1] }}
          >
            <div className="arena-eyebrow mt-8">1v1 Buzzer</div>
            <h1 className="font-display text-[clamp(40px,7vw,72px)] tracking-[-0.06em] leading-[0.95] mt-2 font-bold">
              Beat the person<br />
              <span className="text-arena-bad">in the room.</span>
            </h1>
            <p className="text-arena-muted max-w-[700px] mt-3 leading-relaxed">
              Create a room, share the code, and race to buzz first.
              The fastest hand gets to answer.{" "}
              {!supabase && (
                <span className="text-arena-warn">
                  Add Supabase keys to enable realtime multiplayer.
                </span>
              )}
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-4xl">
          {/* Create */}
          <motion.div
            className="lg:col-span-7 arena-card arena-card-shine space-y-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="arena-eyebrow">Host 1v1 Match</div>
                <h3 className="font-display font-bold tracking-tight text-lg mt-0.5">
                  Configure Your Arena
                </h3>
              </div>
              <span className="arena-pill px-2.5 py-1 text-[11px] text-arena-accent font-semibold">
                Saved to Supabase
              </span>
            </div>

            <label className="block">
              <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1.5">
                Your Display Name
              </span>
              <input
                className="arena-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder="Enter your name"
              />
            </label>

            {/* Sport Selection */}
            <div>
              <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1.5">
                Sport
              </span>
              <select
                className="arena-input text-sm"
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value as Sport | "All Sports")}
              >
                <option value="All Sports" className="bg-arena-panel">All Sports (Mixed Multi-Sport)</option>
                {SPORT_LIST.map((s) => (
                  <option key={s} value={s} className="bg-arena-panel">
                    {s === "Football" ? "Football (Soccer)" : s}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Selection */}
            <div>
              <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1.5">
                Difficulty Level
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {(["Easy", "Medium", "Hard", "Legendary", "Mixed"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { setSelectedDifficulty(d); audio.click(); }}
                    className={`py-2 px-1 text-xs rounded-xl font-bold transition-all border text-center ${
                      selectedDifficulty === d
                        ? "bg-arena-accent/20 border-arena-accent text-arena-accent shadow-[0_0_15px_rgba(0,212,255,0.25)]"
                        : "bg-white/[.02] border-arena-line text-arena-muted hover:text-arena-text hover:border-white/20"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions count */}
            <div>
              <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1.5">
                Rounds (Questions)
              </span>
              <div className="flex gap-2">
                {[5, 10, 15].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setSelectedCount(c); audio.click(); }}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-bold border transition-all ${
                      selectedCount === c
                        ? "bg-white/[.08] border-arena-accent text-arena-text"
                        : "bg-white/[.02] border-arena-line text-arena-muted hover:text-arena-text"
                    }`}
                  >
                    {c} Questions
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              className="arena-btn arena-btn-primary w-full justify-center py-3"
              onClick={createRoom}
              disabled={!supabase || isCreating}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {isCreating ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Generating Questions & Creating Room...
                </>
              ) : (
                <>
                  <Swords size={17} />
                  Create 1v1 Room
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Join */}
          <motion.div
            className="lg:col-span-5 arena-card arena-card-shine space-y-4 flex flex-col justify-between"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div className="space-y-4">
              <div className="arena-eyebrow">Join Existing Room</div>
              <h3 className="font-display font-bold tracking-tight text-lg mt-0.5">
                Enter Room Code
              </h3>
              <p className="text-xs text-arena-muted leading-relaxed">
                Got an invite code from a friend? Paste it below to join their custom match settings.
              </p>

              <label className="block">
                <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1.5">
                  6-Digit Code
                </span>
                <input
                  className="arena-input font-display text-2xl tracking-[0.2em] text-center uppercase"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={8}
                />
              </label>

              {joinError && (
                <div className="p-2.5 rounded-lg bg-arena-bad/10 border border-arena-bad/30 text-arena-bad text-xs">
                  {joinError}
                </div>
              )}
            </div>

            <motion.button
              className="arena-btn arena-btn-ghost w-full justify-center py-3"
              onClick={joinRoom}
              disabled={!supabase || codeInput.length < 4 || isJoining}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {isJoining ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Loading Room...
                </>
              ) : (
                <>
                  <Users size={17} />
                  Join Room
                </>
              )}
            </motion.button>
          </motion.div>
        </div>

        {!supabase && (
          <motion.div
            className="arena-notice mt-4 max-w-3xl"
            data-variant="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <AlertCircle size={14} className="inline mr-1 align-[-2px]" />
            Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            to .env.local to enable realtime multiplayer.
          </motion.div>
        )}
      </main>
    );
  }

  // ── Lobby ───────────────────────────────────────────────
  if (status === "lobby") {
    return (
      <main className="arena-container pb-16">
        <div className="pt-10 pb-6">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm text-arena-muted hover:text-arena-text transition-colors"
            onClick={leaveRoom}
          >
            <ArrowLeft size={15} /> Leave Room
          </button>
        </div>

        <div className="max-w-lg mx-auto">
          <motion.div
            className="arena-card text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="arena-eyebrow mb-3 justify-center">1v1 Room Code</div>

            {/* Glowing room code */}
            <div className="font-display text-5xl font-bold tracking-[0.16em] mb-5 arena-glow-halo inline-block">
              <span className="arena-gradient-text">{roomCode}</span>
            </div>

            <div>
              <motion.button
                className="arena-btn arena-btn-ghost mx-auto"
                onClick={copyCode}
                whileTap={{ scale: 0.95 }}
              >
                <Copy size={15} />
                Copy Code
              </motion.button>
            </div>

            {roomSettings && (
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                <span className="arena-pill px-2.5 py-1 text-xs">{roomSettings.sport}</span>
                <span className="arena-pill px-2.5 py-1 text-xs text-arena-accent font-bold">{roomSettings.difficulty}</span>
                <span className="arena-pill px-2.5 py-1 text-xs">{questions.length} Questions</span>
              </div>
            )}

            <div className="mt-6 border-t border-arena-line pt-5">
              <div className="flex items-center justify-center gap-2 mb-4">
                {connected ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Wifi size={14} className="text-arena-good" />
                  </motion.div>
                ) : (
                  <WifiOff size={14} className="text-arena-bad" />
                )}
                <span className="text-sm text-arena-muted">
                  {connected ? "Realtime Synced" : "Connecting..."}
                </span>
              </div>

              <div className="text-sm font-semibold mb-3 flex items-center justify-between">
                <span>Players in Room</span>
                <span className={playerCount >= 2 ? "text-arena-good font-bold" : "text-arena-warn"}>
                  {playerCount}/2 {playerCount >= 2 ? "(Ready!)" : "(Waiting for opponent...)"}
                </span>
              </div>

              <div className="grid gap-2">
                {Object.entries(players).map(([id, p]) => (
                  <motion.div
                    key={id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border border-arena-line bg-white/[.02]"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold"
                        style={{
                          background: id === myIdRef.current ? "rgba(0, 212, 255, 0.12)" : "rgba(168, 85, 247, 0.12)",
                          color: id === myIdRef.current ? "#00d4ff" : "#a855f7",
                        }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">
                        {p.name}
                        {id === myIdRef.current ? " (you)" : ""}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-arena-good flex items-center gap-1">
                      <Check size={13} /> Ready
                    </span>
                  </motion.div>
                ))}

                {playerCount < 2 && (
                  <div className="p-3.5 rounded-xl border border-dashed border-arena-line text-xs text-arena-muted text-center flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin text-arena-accent" />
                    Share code <span className="font-mono text-arena-accent font-bold">{roomCode}</span> with your opponent to join!
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-2">
                {playerCount >= 2 ? (
                  isHost ? (
                    <motion.button
                      className="arena-btn arena-btn-primary w-full justify-center py-3.5 text-base font-bold shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                      onClick={startGame}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Swords size={18} />
                      Start 1v1 Match Now
                    </motion.button>
                  ) : (
                    <div className="text-center py-3 px-4 rounded-xl bg-arena-accent/10 border border-arena-accent/30 text-arena-accent text-sm font-semibold">
                      <Sparkles size={16} className="inline mr-2 align-[-2px] animate-pulse" />
                      Both players connected! Waiting for Host to start match...
                    </div>
                  )
                ) : null}

                <button
                  type="button"
                  onClick={leaveRoom}
                  className="arena-btn arena-btn-ghost text-xs text-arena-muted hover:text-arena-bad w-full justify-center"
                >
                  Leave Room
                </button>
              </div>
            </div>

            {/* Event log — terminal style */}
            {events.length > 0 && (
              <div className="mt-5 text-left bg-black/20 rounded-xl p-3 border border-arena-line">
                {events.map((e, i) => (
                  <motion.div
                    key={i}
                    className="text-xs text-arena-muted py-0.5 font-mono"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="text-arena-accent/50 mr-1.5">›</span>
                    {e}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
    );
  }

  // ── Playing ─────────────────────────────────────────────
  if (status === "playing" && q) {
    return (
      <main className="arena-container pb-16">
        {/* Score bar */}
        <div className="flex justify-between items-center py-4">
          <div className="flex gap-2.5">
            <div className="px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold backdrop-blur-sm">
              You: <span className="text-arena-accent font-display">{myScore}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold backdrop-blur-sm">
              Opp: <span className="text-arena-bad font-display">{opponentScore}</span>
            </div>
          </div>
          <div className="arena-pill">
            Q{currentQ + 1}/10
          </div>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            className="arena-question-card mt-2"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.2, 0.9, 0.3, 1] }}
          >
            <div className="flex gap-2 mb-3">
              <span className="arena-pill">{q.sport}</span>
              <span className="arena-pill">{q.difficulty}</span>
            </div>
            <h2 className="font-display text-[clamp(22px,3.5vw,38px)] leading-[1.12] tracking-tight mb-6 font-bold">
              {q.question}
            </h2>

            {/* Buzzer phase */}
            {!buzzWinner && (
              <div className="flex justify-center py-10">
                <motion.button
                  className="arena-buzzer"
                  onClick={buzz}
                  disabled={myBuzzed}
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ scale: 1.06 }}
                >
                  BUZZ!
                </motion.button>
              </div>
            )}

            {/* Answer phase (buzz winner answers) */}
            {buzzWinner && !showAnswer && iAmBuzzWinner && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {q.options.map((option, i) => (
                  <motion.button
                    key={i}
                    className="arena-answer"
                    onClick={() => submitAnswer(i)}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i }}
                  >
                    <span className="arena-answer-key">
                      {["A", "B", "C", "D"][i]}
                    </span>
                    <span className="text-[15px]">{option}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Waiting for buzz winner to answer */}
            {buzzWinner && !showAnswer && !iAmBuzzWinner && (
              <div className="text-center py-10 text-arena-muted">
                <motion.div
                  className="font-display text-xl mb-2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Opponent is answering...
                </motion.div>
              </div>
            )}

            {/* Show answer result */}
            {showAnswer && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {q.options.map((option, i) => {
                  const state =
                    i === q.answer
                      ? "correct"
                      : i === selectedAnswer
                        ? "wrong"
                        : "dim";
                  return (
                    <motion.div
                      key={i}
                      className="arena-answer"
                      data-state={state}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.03 * i }}
                    >
                      <span className="arena-answer-key">
                        {["A", "B", "C", "D"][i]}
                      </span>
                      <span className="text-[15px]">{option}</span>
                      {i === q.answer && (
                        <Check size={16} className="text-arena-good flex-shrink-0" />
                      )}
                      {i === selectedAnswer && i !== q.answer && (
                        <X size={16} className="text-arena-bad flex-shrink-0" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Event log */}
        {events.length > 0 && (
          <div className="mt-4 bg-black/15 rounded-xl p-3 border border-arena-line">
            {events.slice(0, 3).map((e, i) => (
              <div key={i} className="text-xs text-arena-muted py-0.5 font-mono">
                <span className="text-arena-accent/50 mr-1.5">›</span>
                {e}
              </div>
            ))}
          </div>
        )}
      </main>
    );
  }

  // ── Finished ────────────────────────────────────────────
  if (status === "finished") {
    const won = myScore > opponentScore;
    const tied = myScore === opponentScore;

    return (
      <main className="arena-container pb-16">
        <div className="min-h-[60vh] flex items-center justify-center">
          <motion.div
            className="text-center max-w-lg"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="arena-eyebrow mb-5 justify-center">
              {won ? "Victory" : tied ? "Draw" : "Defeat"}
            </div>
            {won && (
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <Crown size={52} className="text-arena-warn mx-auto mb-5" />
              </motion.div>
            )}
            <div className="font-display text-6xl sm:text-7xl font-bold tracking-tight mb-3 arena-glow-halo inline-block">
              <span className="text-arena-accent">{myScore}</span>
              <span className="text-arena-muted/40 mx-3">–</span>
              <span className="text-arena-bad">{opponentScore}</span>
            </div>
            <p className="text-arena-muted mb-10 leading-relaxed">
              {won
                ? "You dominated the buzzer. Excellent reactions."
                : tied
                  ? "Perfectly matched. Run it back?"
                  : "Close game. The buzzer waits for no one."}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <motion.button
                className="arena-btn arena-btn-primary"
                onClick={leaveRoom}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <Swords size={16} />
                New Match
              </motion.button>
              <Link
                href="/"
                onClick={leaveRoom}
                className="arena-btn arena-btn-ghost"
              >
                Home
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  return null;
}
