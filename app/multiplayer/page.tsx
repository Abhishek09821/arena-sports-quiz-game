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

  // New customization state for 1v1 Arena
  const [selectedSport, setSelectedSport] = useState<Sport | "All Sports">("All Sports");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | "Mixed">("Mixed");
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [roomSettings, setRoomSettings] = useState<{ sport: string; difficulty: string; hostName: string } | null>(null);

  const myIdRef = useRef(Math.random().toString(36).slice(2, 10));
  const channelRef = useRef<ReturnType<typeof supabase extends null ? never : NonNullable<typeof supabase>["channel"]> | null>(null);

  const addEvent = useCallback((msg: string) => {
    setEvents((prev) => [msg, ...prev].slice(0, 8));
  }, []);

  // Create room with difficulty and sport stored in Supabase
  const createRoom = useCallback(async () => {
    setIsCreating(true);
    const code = generateRoomCode();
    setRoomCode(code);
    setCodeInput(code);

    // Generate questions for this room with the chosen sport and difficulty
    const qs = buildGame({ sport: selectedSport, difficulty: selectedDifficulty, count: selectedCount });
    setQuestions(qs);
    setRoomSettings({
      sport: selectedSport,
      difficulty: selectedDifficulty,
      hostName: name || "Host",
    });

    try {
      // Persist to Supabase game_rooms and game_players
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
    } catch (err) {
      console.warn("[Multiplayer] Supabase room persist notice:", err);
    } finally {
      setIsCreating(false);
      setStatus("lobby");
      addEvent(`Room created (${selectedDifficulty} • ${selectedSport}). Share the code.`);
      trackEvent("room_created", { code, sport: selectedSport, difficulty: selectedDifficulty });
      audio.select();
    }
  }, [name, selectedSport, selectedDifficulty, selectedCount, addEvent]);

  // Join room and load settings from Supabase
  const joinRoom = useCallback(async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setIsJoining(true);
    setJoinError(null);
    setRoomCode(code);
    addEvent("Joining room...");
    audio.select();

    try {
      // 1. Fetch room from Supabase
      const res = await fetch(`/api/multiplayer/room?code=${code}`);
      const data = await res.json();

      if (res.ok && data.success && data.questions?.length) {
        setQuestions(data.questions);
        setRoomSettings({
          hostName: data.hostName || "Host",
          sport: data.sport || "All Sports",
          difficulty: data.difficulty || "Mixed",
        });

        // 2. Register this player in Supabase
        await fetch("/api/multiplayer/player", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomCode: code,
            playerName: name || "Player 2",
            playerToken: myIdRef.current,
          }),
        });
      } else if (!res.ok) {
        setJoinError(data.error || "Room not found. Check the code.");
      }
    } catch (err) {
      console.warn("[Multiplayer] Supabase load error, falling back to Realtime sync:", err);
    } finally {
      setIsJoining(false);
      setStatus("lobby");
      trackEvent("room_joined", { code });
    }
  }, [codeInput, name, addEvent]);

  // Connect to Supabase Realtime channel
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
            [payload.id]: { name: payload.name, score: 0, ready: false, connected: true },
          }));
          addEvent(`${payload.name} joined`);
          audio.opponentJoined();
        }
      })
      .on("broadcast", { event: "player_ready" }, ({ payload }) => {
        setPlayers((prev) => ({
          ...prev,
          [payload.id]: { ...prev[payload.id], ready: true },
        }));
        addEvent(`${payload.name} is ready`);
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
        addEvent("Game started!");
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
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          // Announce ourselves
          channel.send({
            type: "broadcast",
            event: "player_join",
            payload: { id: myIdRef.current, name },
          });
          setPlayers((prev) => ({
            ...prev,
            [myIdRef.current]: { name, score: 0, ready: false, connected: true },
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
  }, [roomCode, status, name, addEvent, questions.length, myScore]);

  const sendReady = () => {
    channelRef.current?.send({
      type: "broadcast",
      event: "player_ready",
      payload: { id: myIdRef.current, name },
    });
    setPlayers((prev) => ({
      ...prev,
      [myIdRef.current]: { ...prev[myIdRef.current], ready: true },
    }));
    audio.select();
  };

  const startGame = () => {
    channelRef.current?.send({
      type: "broadcast",
      event: "game_start",
      payload: { questions },
    });
    // Mark room live in Supabase
    fetch("/api/multiplayer/player", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode, status: "live" }),
    }).catch(() => {});
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
    const q = questions[currentQ];
    if (!q) return;
    const correct = answer === q.answer;
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
  const allReady = playerCount >= 2 && Object.values(players).every((p) => p.ready);
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
          <Link
            href="/multiplayer"
            className="inline-flex items-center gap-1.5 text-sm text-arena-muted hover:text-arena-text transition-colors"
            onClick={() => setStatus("idle")}
          >
            <ArrowLeft size={15} /> Back
          </Link>
        </div>

        <div className="max-w-lg mx-auto">
          <motion.div
            className="arena-card text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="arena-eyebrow mb-3 justify-center">Room Code</div>

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
                  {connected ? "Connected" : "Connecting..."}
                </span>
              </div>

              <div className="text-sm font-semibold mb-3">
                Players ({playerCount}/2)
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
                    <span
                      className={`text-sm font-semibold ${
                        p.ready ? "text-arena-good" : "text-arena-muted"
                      }`}
                    >
                      {p.ready ? "Ready ✓" : "Waiting..."}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="flex gap-2 justify-center mt-6">
                {!players[myIdRef.current]?.ready && (
                  <motion.button
                    className="arena-btn arena-btn-primary"
                    onClick={sendReady}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    I&apos;m Ready
                  </motion.button>
                )}
                {allReady && (
                  <motion.button
                    className="arena-btn arena-btn-primary"
                    onClick={startGame}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Swords size={16} />
                    Start Game
                  </motion.button>
                )}
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
                onClick={() => {
                  setStatus("idle");
                  setMyScore(0);
                  setOpponentScore(0);
                  setPlayers({});
                  setEvents([]);
                  setCurrentQ(0);
                  setRoomCode("");
                  audio.click();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <Swords size={16} />
                New Game
              </motion.button>
              <Link href="/" className="arena-btn arena-btn-ghost">
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
