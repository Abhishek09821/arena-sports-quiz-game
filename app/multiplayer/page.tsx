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
  Check,
  X,
  Loader2,
  Sparkles,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { audio } from "@/lib/audio";
import { buildGame, getPersistentSeenIds, markQuestionsSeen } from "@/lib/quiz";
import { SPORT_LIST, TOURNAMENTS_BY_SPORT, type Question, type Sport, type Difficulty } from "@/data/questions";
import { trackEvent } from "@/lib/analytics";

type RoomStatus = "idle" | "lobby" | "playing" | "finished";
type GamePhase = "buzzer" | "answering" | "revealed";

interface PlayerState {
  name: string;
  score: number;
  ready: boolean;
  connected: boolean;
}

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
  role: "host" | "guest";
  playerName: string;
}

export default function MultiplayerPage() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [status, setStatus] = useState<RoomStatus>("idle");
  const [players, setPlayers] = useState<Record<string, PlayerState>>({});
  const [isHost, setIsHost] = useState(false);
  const [connected, setConnected] = useState(false);

  // Game state
  const [currentQ, setCurrentQ] = useState(0);
  const [totalQ, setTotalQ] = useState(10);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question> | null>(null);
  const [phase, setPhase] = useState<GamePhase>("buzzer");
  const [buzzWinner, setBuzzWinner] = useState<string | null>(null);
  const [myBuzzed, setMyBuzzed] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [revealedAnswer, setRevealedAnswer] = useState<number | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(15);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [events, setEvents] = useState<string[]>([]);

  // Room customization state
  const [selectedSport, setSelectedSport] = useState<Sport | "All Sports">("All Sports");
  const [selectedTournament, setSelectedTournament] = useState<string>("All Tournaments");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | "Mixed">("Mixed");
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [roomSettings, setRoomSettings] = useState<{
    sport: string;
    difficulty: string;
    hostName: string;
    tournament?: string;
    count?: number;
  } | null>(null);

  // Synchronized refs
  const socketRef = useRef<Socket | null>(null);
  const myIdRef = useRef<string>("usr_init");
  const buzzWinnerRef = useRef<string | null>(buzzWinner);
  buzzWinnerRef.current = buzzWinner;
  const phaseRef = useRef<GamePhase>(phase);
  phaseRef.current = phase;

  const addEvent = useCallback((msg: string) => {
    setEvents((prev) => [msg, ...prev].slice(0, 8));
  }, []);

  const updateScoresFromMap = useCallback((scoresMap: Record<string, number>) => {
    const meId = myIdRef.current;
    if (typeof scoresMap[meId] === "number") {
      setMyScore(scoresMap[meId]);
    }
    const oppEntry = Object.entries(scoresMap).find(([id]) => id !== meId);
    if (oppEntry) {
      setOpponentScore(oppEntry[1]);
    }
  }, []);

  // ── Initialize Socket.IO connection ──────────────────────
  const initSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      return socketRef.current;
    }

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

    const s = io(socketUrl, {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = s;

    s.on("connect", () => {
      setConnected(true);
      setJoinError(null);
    });

    s.on("disconnect", () => {
      setConnected(false);
    });

    s.on("connect_error", (err) => {
      console.warn("[Socket.IO] Connection notice:", err.message);
      setConnected(false);
    });

    // ── Authoritative Server Events ──────────────────────────
    s.on("room_created", (data) => {
      setStatus("lobby");
      setRoomCode(data.roomCode);
      setIsHost(true);
      if (data.players) setPlayers(data.players);
      if (data.settings) {
        setRoomSettings(data.settings);
      }
      addEvent(`Room created (${data.settings?.difficulty || "Mixed"} • ${data.settings?.sport || "All Sports"}). Code: ${data.roomCode}`);
    });

    s.on("room_joined", (data) => {
      setRoomCode(data.roomCode);
      setIsHost(Boolean(data.isHost));
      if (data.players) setPlayers(data.players);
      if (data.settings) setRoomSettings(data.settings);

      if (data.status === "playing" && data.currentQuestion) {
        setStatus("playing");
        setCurrentQuestion(data.currentQuestion);
        setCurrentQ(data.currentQ || 0);
        setTotalQ(data.totalQ || 10);
        setPhase(data.phase || "buzzer");
        setBuzzWinner(data.buzzWinner || null);
        setTimeRemaining(data.timeRemaining || 15);
      } else {
        setStatus("lobby");
      }

      if (data.scores) updateScoresFromMap(data.scores);
      addEvent(`Connected to room ${data.roomCode}`);
    });

    s.on("room_state", (data) => {
      if (data.players) setPlayers(data.players);
      if (data.scores) updateScoresFromMap(data.scores);
      if (data.message) addEvent(data.message);
    });

    s.on("game_started", (data) => {
      setStatus("playing");
      setPhase("buzzer");
      setBuzzWinner(null);
      setMyBuzzed(false);
      setSelectedAnswer(null);
      setRevealedAnswer(null);
      setIsTimedOut(false);
      if (data.totalQuestions) setTotalQ(data.totalQuestions);
      if (data.players) setPlayers(data.players);
      addEvent("Match started! Rapid buzzer active.");
      audio.click();
    });

    s.on("question_start", (data) => {
      setStatus("playing");
      setCurrentQ(data.currentQ);
      setTotalQ(data.totalQ);
      setCurrentQuestion(data.question);
      setPhase("buzzer");
      setBuzzWinner(null);
      setMyBuzzed(false);
      setSelectedAnswer(null);
      setRevealedAnswer(null);
      setIsTimedOut(false);
      setTimeRemaining(data.timeRemaining ?? 15);
      if (data.scores) updateScoresFromMap(data.scores);
    });

    s.on("timer_tick", (data) => {
      setTimeRemaining(data.timeRemaining);
      setPhase(data.phase);
      if (data.buzzWinner) setBuzzWinner(data.buzzWinner);

      if (data.phase === "buzzer") {
        if (data.timeRemaining <= 5 && data.timeRemaining > 2) {
          audio.tick();
        } else if (data.timeRemaining === 2) {
          audio.urgentTick();
        }
      } else if (data.phase === "answering") {
        if (buzzWinnerRef.current === myIdRef.current) {
          if (data.timeRemaining <= 3 && data.timeRemaining > 0) {
            audio.urgentTick();
          } else if (data.timeRemaining > 0) {
            audio.tick();
          }
        }
      }
    });

    s.on("buzz_winner", (data) => {
      setBuzzWinner(data.winnerId);
      setPhase("answering");
      setTimeRemaining(data.answerTime ?? 8);
      audio.buzzer();
      if (data.winnerId === myIdRef.current) {
        addEvent("You buzzed first! ✨ Select your answer");
      } else {
        addEvent(`${data.winnerName} buzzed first!`);
      }
    });

    s.on("round_result", (data) => {
      setPhase("revealed");
      setRevealedAnswer(data.correctAnswer);
      setSelectedAnswer(data.answer);
      if (data.scores) updateScoresFromMap(data.scores);

      if (data.timedOut) {
        setIsTimedOut(true);
        audio.timeout();
        addEvent(`${data.winnerName} ran out of time! ⌛`);
      } else if (data.correct) {
        audio.correct();
        addEvent(
          data.winnerId === myIdRef.current
            ? "You answered correctly! +100"
            : `${data.winnerName} answered correctly! +100`
        );
      } else {
        audio.wrong();
        addEvent(
          data.winnerId === myIdRef.current
            ? "You got it wrong."
            : `${data.winnerName} got it wrong.`
        );
      }
    });

    s.on("round_timeout", (data) => {
      setPhase("revealed");
      setIsTimedOut(true);
      setRevealedAnswer(data.correctAnswer);
      if (data.scores) updateScoresFromMap(data.scores);
      audio.timeout();
      addEvent("Time expired — no one buzzed!");
    });

    s.on("game_finished", (data) => {
      setStatus("finished");
      if (data.scores) updateScoresFromMap(data.scores);
      audio.roundComplete();
      addEvent("Match finished!");

      // Update Supabase record in background
      if (roomCode) {
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
    });

    s.on("player_left", (data) => {
      addEvent(data.message || "Opponent left the match.");
    });

    s.on("player_disconnected", (data) => {
      addEvent(`${data.name} disconnected.`);
    });

    s.on("room_closed", (data) => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("arena_mp_session");
      }
      setStatus("idle");
      setRoomCode("");
      setCodeInput("");
      setPlayers({});
      setJoinError(data.message || "The room was closed by the host.");
      audio.wrong();
    });

    return s;
  }, [addEvent, updateScoresFromMap, roomCode, myScore]);

  // ── Auto-restore session & initialize on mount ───────────
  useEffect(() => {
    myIdRef.current = getPlayerToken();
    const s = initSocket();

    const saved = typeof window !== "undefined" ? sessionStorage.getItem("arena_mp_session") : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StoredMPSession;
        if (parsed.roomCode && parsed.playerToken) {
          myIdRef.current = parsed.playerToken;
          if (parsed.playerName) setName(parsed.playerName);
          setRoomCode(parsed.roomCode);
          setCodeInput(parsed.roomCode);
          setIsHost(parsed.role === "host");

          // Rejoin socket room
          s.emit(
            "join_room",
            {
              roomCode: parsed.roomCode,
              playerName: parsed.playerName || "Player",
              playerToken: parsed.playerToken,
            },
            (res: { error?: string }) => {
              if (res?.error) {
                sessionStorage.removeItem("arena_mp_session");
                setStatus("idle");
                setRoomCode("");
              }
            }
          );
        }
      } catch {
        sessionStorage.removeItem("arena_mp_session");
      }
    }
  }, [initSocket]);

  // ── Create Room ──────────────────────────────────────────
  const createRoom = useCallback(async () => {
    setIsCreating(true);
    setJoinError(null);
    audio.click();
    const code = generateRoomCode();
    setRoomCode(code);
    setCodeInput(code);
    setIsHost(true);

    let qs: Question[] = [];
    try {
      const seenIds = Array.from(getPersistentSeenIds()).slice(-30);
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: selectedSport,
          difficulty: selectedDifficulty,
          count: selectedCount,
          category:
            selectedTournament !== "All Tournaments" &&
            selectedTournament !== "All Events" &&
            selectedTournament !== "All Grand Prix"
              ? selectedTournament
              : undefined,
          mode: "multiplayer",
          excludeStems: seenIds,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        qs = data.questions;
        markQuestionsSeen(qs.map((q) => q.question.slice(0, 45)));
      } else {
        qs = buildGame({ sport: selectedSport, difficulty: selectedDifficulty, count: selectedCount });
      }
    } catch {
      qs = buildGame({ sport: selectedSport, difficulty: selectedDifficulty, count: selectedCount });
    }

    setRoomSettings({
      sport: selectedSport,
      difficulty: selectedDifficulty,
      tournament: selectedTournament,
      hostName: name || "Host",
    });

    const s = initSocket();

    // 1. Authoritative create on Socket.IO server
    s.emit(
      "create_room",
      {
        roomCode: code,
        hostName: name || "Host",
        playerToken: myIdRef.current,
        sport: selectedSport,
        difficulty: selectedDifficulty,
        tournament: selectedTournament,
        count: selectedCount,
        questions: qs,
      },
      (res: { error?: string }) => {
        setIsCreating(false);
        if (res?.error) {
          setJoinError(res.error);
          audio.wrong();
        } else {
          sessionStorage.setItem(
            "arena_mp_session",
            JSON.stringify({
              roomCode: code,
              playerToken: myIdRef.current,
              playerName: name || "Host",
              role: "host",
            })
          );
          setStatus("lobby");
          audio.select();
        }
      }
    );

    // 2. Non-blocking Supabase sync for persistence/records
    fetch("/api/multiplayer/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        hostName: name || "Host",
        sport: selectedSport,
        difficulty: selectedDifficulty,
        tournament: selectedTournament,
        count: selectedCount,
        questions: qs,
        playerToken: myIdRef.current,
      }),
    }).catch(() => {});

    trackEvent("room_created", { code, sport: selectedSport, difficulty: selectedDifficulty });
  }, [name, selectedSport, selectedDifficulty, selectedTournament, selectedCount, initSocket]);

  // ── Join Room ────────────────────────────────────────────
  const joinRoom = useCallback(async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setIsJoining(true);
    setJoinError(null);
    audio.select();

    const s = initSocket();

    s.emit(
      "join_room",
      {
        roomCode: code,
        playerName: name || "Player 2",
        playerToken: myIdRef.current,
      },
      (res: { error?: string; roomCode?: string; isHost?: boolean }) => {
        setIsJoining(false);
        if (res?.error) {
          setJoinError(res.error);
          audio.wrong();
        } else {
          setRoomCode(code);
          setIsHost(Boolean(res?.isHost));
          sessionStorage.setItem(
            "arena_mp_session",
            JSON.stringify({
              roomCode: code,
              playerToken: myIdRef.current,
              playerName: name || "Player 2",
              role: res?.isHost ? "host" : "guest",
            })
          );
          setStatus("lobby");
          audio.correct();
          trackEvent("room_joined", { code });
        }
      }
    );

    // Non-blocking Supabase join record
    fetch("/api/multiplayer/player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode: code,
        playerName: name || "Player 2",
        playerToken: myIdRef.current,
      }),
    }).catch(() => {});
  }, [codeInput, name, initSocket]);

  // ── Start Match (Host only) ──────────────────────────────
  const startGame = useCallback(() => {
    audio.click();
    socketRef.current?.emit("start_game", {
      roomCode,
      playerToken: myIdRef.current,
    });
  }, [roomCode]);

  // ── Buzz (Atomic on Server) ──────────────────────────────
  const buzz = useCallback(() => {
    if (phase !== "buzzer" || buzzWinner || myBuzzed || timeRemaining <= 0) return;
    setMyBuzzed(true);
    socketRef.current?.emit("buzz", {
      roomCode,
      playerToken: myIdRef.current,
    });
  }, [phase, buzzWinner, myBuzzed, timeRemaining, roomCode]);

  // ── Submit Answer ────────────────────────────────────────
  const submitAnswer = useCallback(
    (answerIndex: number) => {
      if (phase !== "answering" || buzzWinner !== myIdRef.current) return;
      setSelectedAnswer(answerIndex);
      socketRef.current?.emit("submit_answer", {
        roomCode,
        playerToken: myIdRef.current,
        answer: answerIndex,
      });
    },
    [phase, buzzWinner, roomCode]
  );

  // ── Leave Room ───────────────────────────────────────────
  const leaveRoom = useCallback(() => {
    audio.click();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("arena_mp_session");
    }
    if (roomCode) {
      socketRef.current?.emit("leave_room", {
        roomCode,
        playerToken: myIdRef.current,
      });

      // Best effort cleanup in DB
      fetch(`/api/multiplayer/player?code=${roomCode}&token=${myIdRef.current}`, {
        method: "DELETE",
      }).catch(() => {});
    }

    setStatus("idle");
    setRoomCode("");
    setCodeInput("");
    setPlayers({});
    setMyScore(0);
    setOpponentScore(0);
    setCurrentQ(0);
    setJoinError(null);
    setIsHost(false);
    setBuzzWinner(null);
    setMyBuzzed(false);
    setSelectedAnswer(null);
    setRevealedAnswer(null);
    setIsTimedOut(false);
    setCurrentQuestion(null);
  }, [roomCode]);

  // ── Keyboard Spacebar to Buzz ────────────────────────────
  useEffect(() => {
    if (status !== "playing" || phase !== "buzzer" || buzzWinner || myBuzzed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        buzz();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, phase, buzzWinner, myBuzzed, buzz]);

  const copyCode = () => {
    navigator.clipboard?.writeText(roomCode);
    audio.click();
    addEvent("Code copied!");
  };

  const playerCount = Object.keys(players).length;
  const iAmBuzzWinner = buzzWinner === myIdRef.current;
  const q = currentQuestion;

  // ── Idle View: Create or Join ────────────────────────────
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
            <div className="arena-eyebrow mt-8">1v1 Realtime Arena</div>
            <h1 className="font-display text-[clamp(40px,7vw,72px)] tracking-[-0.06em] leading-[0.95] mt-2 font-bold">
              Beat the person<br />
              <span className="text-arena-bad">in the room.</span>
            </h1>
            <p className="text-arena-muted max-w-[700px] mt-3 leading-relaxed">
              Create a room, share the 6-digit code, and battle head-to-head on the synchronized buzzer. Powered by authoritative Socket.IO for zero latency drift.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-4xl">
          {/* Create Room Card */}
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
              <span className="arena-pill px-2.5 py-1 text-[11px] text-arena-accent font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-arena-accent animate-pulse" />
                Socket.IO Synced
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

            {/* Sport Selection (Strictly 6 sports + All Sports) */}
            <div>
              <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1.5">
                Sport
              </span>
              <select
                className="arena-input text-sm cursor-pointer"
                value={selectedSport}
                onChange={(e) => {
                  setSelectedSport(e.target.value as Sport | "All Sports");
                  setSelectedTournament("All Tournaments");
                  audio.tap();
                }}
              >
                <option value="All Sports" className="bg-arena-panel">All Sports (Mixed Multi-Sport)</option>
                {SPORT_LIST.map((s) => (
                  <option key={s} value={s} className="bg-arena-panel">
                    {s === "Football" ? "Football (Soccer)" : s}
                  </option>
                ))}
              </select>
            </div>

            {/* Tournament Selection */}
            {selectedSport !== "All Sports" && TOURNAMENTS_BY_SPORT[selectedSport] && (
              <div>
                <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1.5">
                  Tournament / League
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {TOURNAMENTS_BY_SPORT[selectedSport].map((t) => {
                    const active = selectedTournament === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setSelectedTournament(t);
                          audio.tap();
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all border cursor-pointer ${
                          active
                            ? "bg-arena-accent/20 border-arena-accent text-arena-accent font-semibold shadow-[0_0_10px_rgba(0,212,255,0.2)]"
                            : "bg-white/[.02] border-arena-line text-arena-muted hover:text-arena-text hover:bg-white/[.05]"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                    onClick={() => {
                      setSelectedDifficulty(d);
                      audio.click();
                    }}
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

            {/* Question Count */}
            <div>
              <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1.5">
                Rounds (Questions)
              </span>
              <div className="flex gap-2">
                {[5, 10, 15].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setSelectedCount(c);
                      audio.click();
                    }}
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
              disabled={isCreating}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {isCreating ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Generating AI Questions & Creating Room...
                </>
              ) : (
                <>
                  <Swords size={17} />
                  Create 1v1 Room
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Join Room Card */}
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
                Got a 6-digit code from your friend? Enter it below to jump straight into their custom room.
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
              disabled={codeInput.length < 4 || isJoining}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {isJoining ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Joining Room...
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
      </main>
    );
  }

  // ── Lobby View ───────────────────────────────────────────
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
                <span className="arena-pill px-2.5 py-1 text-xs text-arena-accent font-bold">
                  {roomSettings.difficulty}
                </span>
                {roomSettings.tournament && roomSettings.tournament !== "All Tournaments" && (
                  <span className="arena-pill px-2.5 py-1 text-xs">{roomSettings.tournament}</span>
                )}
                {roomSettings.count && (
                  <span className="arena-pill px-2.5 py-1 text-xs">{roomSettings.count} Questions</span>
                )}
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
                  {connected ? "Socket.IO Live & Synced" : "Connecting to Socket.IO..."}
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
                          background:
                            id === myIdRef.current ? "rgba(0, 212, 255, 0.12)" : "rgba(168, 85, 247, 0.12)",
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

            {/* Live event log */}
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

  // ── Playing View ─────────────────────────────────────────
  if (status === "playing" && q) {
    const isRevealed = phase === "revealed";

    return (
      <main className="arena-container pb-16">
        {/* Score & Synchronized Status Bar */}
        <div className="flex justify-between items-center py-4 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold backdrop-blur-sm">
              You: <span className="text-arena-accent font-display">{myScore}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold backdrop-blur-sm">
              Opp: <span className="text-arena-bad font-display">{opponentScore}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!buzzWinner && !isRevealed && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                  timeRemaining <= 5
                    ? "bg-arena-bad/20 border-arena-bad text-arena-bad shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse"
                    : timeRemaining <= 8
                    ? "bg-arena-warn/20 border-arena-warn text-arena-warn"
                    : "bg-white/[.04] border-arena-line text-arena-accent"
                }`}
              >
                <Clock size={14} className={timeRemaining <= 5 ? "animate-spin" : ""} />
                <span>Buzzer: {timeRemaining}s</span>
              </div>
            )}

            {buzzWinner && !isRevealed && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-arena-warn/50 bg-arena-warn/15 text-arena-warn text-xs font-mono font-bold animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                <Clock size={14} />
                <span>{iAmBuzzWinner ? `Answer: ${timeRemaining}s` : `Opponent: ${timeRemaining}s`}</span>
              </div>
            )}

            <div className="arena-pill font-mono font-semibold">
              Q{currentQ + 1}/{totalQ}
            </div>

            <button
              type="button"
              onClick={leaveRoom}
              className="text-xs text-arena-muted hover:text-arena-bad transition-colors px-2 py-1 rounded-lg hover:bg-white/[.04]"
              title="Leave Room"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            className="arena-question-card mt-2 relative overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.2, 0.9, 0.3, 1] }}
          >
            {/* Top Timer Progress Bar (Authoritative server clock) */}
            {!isRevealed && (
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/[.05] overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    buzzWinner
                      ? "bg-arena-warn"
                      : timeRemaining <= 5
                      ? "bg-arena-bad"
                      : timeRemaining <= 8
                      ? "bg-arena-warn"
                      : "bg-arena-accent"
                  }`}
                  style={{
                    width: buzzWinner
                      ? `${Math.max(0, (timeRemaining / 8) * 100)}%`
                      : `${Math.max(0, (timeRemaining / 15) * 100)}%`,
                  }}
                />
              </div>
            )}

            <div className="flex gap-2 mb-3 pt-1 flex-wrap">
              {q.sport && <span className="arena-pill">{q.sport}</span>}
              {q.difficulty && <span className="arena-pill">{q.difficulty}</span>}
              {q.category && <span className="arena-pill">{q.category}</span>}
              {isTimedOut && (
                <span className="arena-pill bg-arena-bad/20 text-arena-bad border-arena-bad/40 font-bold">
                  Timed Out!
                </span>
              )}
            </div>

            <h2 className="font-display text-[clamp(22px,3.5vw,38px)] leading-[1.12] tracking-tight mb-6 font-bold">
              {q.question}
            </h2>

            {/* Buzzer Phase */}
            {!buzzWinner && !isRevealed && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <motion.button
                  className="arena-buzzer"
                  onClick={buzz}
                  disabled={myBuzzed || timeRemaining === 0}
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ scale: 1.06 }}
                >
                  BUZZ!
                </motion.button>
                <span className="text-xs text-arena-muted font-mono tracking-wide">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[11px] border border-white/20">SPACE</kbd> or click to buzz • {timeRemaining}s left
                </span>
              </div>
            )}

            {/* Answering Phase: You won the buzz */}
            {buzzWinner && !isRevealed && iAmBuzzWinner && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold px-1 text-arena-accent">
                  <span>⚡ You buzzed first! Select your answer:</span>
                  <span className="font-mono text-arena-warn font-bold">{timeRemaining}s remaining</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options?.map((option, i) => (
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
              </div>
            )}

            {/* Answering Phase: Opponent won the buzz */}
            {buzzWinner && !isRevealed && !iAmBuzzWinner && (
              <div className="text-center py-10 text-arena-muted space-y-2">
                <motion.div
                  className="font-display text-xl text-arena-text font-bold"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Opponent buzzed!
                </motion.div>
                <div className="text-xs text-arena-muted">
                  Opponent has <span className="text-arena-warn font-mono font-bold">{timeRemaining}s</span> to answer...
                </div>
              </div>
            )}

            {/* Timed Out (No buzz) */}
            {isTimedOut && !buzzWinner && (
              <div className="text-center py-4 text-arena-bad font-display text-lg font-bold">
                ⌛ Time expired — no one buzzed!
              </div>
            )}

            {/* Revealed Answer Result */}
            {isRevealed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {q.options?.map((option, i) => {
                  const state =
                    i === revealedAnswer
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
                      {i === revealedAnswer && (
                        <Check size={16} className="text-arena-good flex-shrink-0" />
                      )}
                      {i === selectedAnswer && i !== revealedAnswer && (
                        <X size={16} className="text-arena-bad flex-shrink-0" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Live event log */}
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

  // ── Finished View ────────────────────────────────────────
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
                ? "Perfect match. Every second was contested."
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
