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
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { audio } from "@/lib/audio";
import { buildGame } from "@/lib/quiz";
import { type Question } from "@/data/questions";
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

  const myIdRef = useRef(Math.random().toString(36).slice(2, 10));
  const channelRef = useRef<ReturnType<typeof supabase extends null ? never : NonNullable<typeof supabase>["channel"]> | null>(null);

  const addEvent = useCallback((msg: string) => {
    setEvents((prev) => [msg, ...prev].slice(0, 8));
  }, []);

  // Create room
  const createRoom = useCallback(() => {
    const code = generateRoomCode();
    setRoomCode(code);
    setCodeInput(code);
    setStatus("lobby");

    // Generate questions for this room
    const qs = buildGame({ sport: "All Sports", difficulty: "Mixed", count: 10 });
    setQuestions(qs);

    addEvent("Room created. Share the code.");
    trackEvent("room_created", { code });
    audio.select();
  }, [addEvent]);

  // Join room
  const joinRoom = useCallback(() => {
    if (!codeInput.trim()) return;
    setRoomCode(codeInput.toUpperCase());
    setStatus("lobby");
    addEvent("Joining room...");
    trackEvent("room_joined", { code: codeInput });
    audio.select();
  }, [codeInput, addEvent]);

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
            if (nextQ >= 10) {
              setStatus("finished");
              audio.roundComplete();
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
  }, [roomCode, status, name, addEvent]);

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          {/* Create */}
          <motion.div
            className="arena-card arena-card-shine"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
          >
            <div className="arena-eyebrow">Create</div>
            <h3 className="font-display font-bold tracking-tight mt-1 mb-4 text-lg">
              Start a new room
            </h3>
            <label className="block mb-3">
              <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-2">
                Display Name
              </span>
              <input
                className="arena-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
              />
            </label>
            <motion.button
              className="arena-btn arena-btn-primary w-full justify-center"
              onClick={createRoom}
              disabled={!supabase}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <Swords size={17} />
              Create Room
            </motion.button>
          </motion.div>

          {/* Join */}
          <motion.div
            className="arena-card arena-card-shine"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div className="arena-eyebrow">Join</div>
            <h3 className="font-display font-bold tracking-tight mt-1 mb-4 text-lg">
              Enter a room code
            </h3>
            <label className="block mb-3">
              <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-2">
                Room Code
              </span>
              <input
                className="arena-input font-display text-xl tracking-[0.2em] text-center uppercase"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={8}
              />
            </label>
            <motion.button
              className="arena-btn arena-btn-ghost w-full justify-center"
              onClick={joinRoom}
              disabled={!supabase || codeInput.length < 4}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <Users size={17} />
              Join Room
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
