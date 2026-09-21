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
  Mic,
  MicOff,
  UserX,
  LogOut,
  Play,
} from "lucide-react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { supabase } from "@/lib/supabase";
import { audio } from "@/lib/audio";
import { buildGame } from "@/lib/quiz";
import { getSeenStems, getSeenAnswers, recordQuestionsAsSeen } from "@/lib/seen_history";
import { SPORT_LIST, TOURNAMENTS_BY_SPORT, type Question, type Sport, type Difficulty } from "@/data/questions";
import { trackEvent } from "@/lib/analytics";
import { VoiceChatManager, requestUserAudioStream, type VoiceState, type VoiceSignaler } from "@/lib/webrtc/voice-chat";

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
  const [syncEngine, setSyncEngine] = useState<"socket" | "realtime">("realtime");

  // Game state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [totalQ, setTotalQ] = useState(10);
  const [phase, setPhase] = useState<GamePhase>("buzzer");
  const [buzzWinner, setBuzzWinner] = useState<string | null>(null);
  const [buzzWinnerTimestamp, setBuzzWinnerTimestamp] = useState<number>(0);
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

  // Voice chat state
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const voiceChatRef = useRef<VoiceChatManager | null>(null);
  const localAudioStreamRef = useRef<MediaStream | null>(null);
  const webrtcSignalHandlersRef = useRef<{
    onOffer?: (sdp: any) => void;
    onAnswer?: (sdp: any) => void;
    onCandidate?: (candidate: any) => void;
  }>({});

  // Opponent disconnected modal & Solo Mode state
  const [opponentLeftModalOpen, setOpponentLeftModalOpen] = useState(false);
  const [opponentLeftName, setOpponentLeftName] = useState("Opponent");
  const [isSoloMode, setIsSoloMode] = useState(false);
  const opponentLeftModalOpenRef = useRef(false);
  opponentLeftModalOpenRef.current = opponentLeftModalOpen;
  const statusRef = useRef<RoomStatus>(status);
  statusRef.current = status;

  // Synchronized refs
  const socketRef = useRef<Socket | null>(null);
  const supabaseChannelRef = useRef<ReturnType<typeof supabase extends null ? never : NonNullable<typeof supabase>["channel"]> | null>(null);
  const myIdRef = useRef<string>("usr_init");
  const isHostRef = useRef<boolean>(false);
  isHostRef.current = isHost;
  const questionsRef = useRef<Question[]>(questions);
  questionsRef.current = questions;
  const currentQRef = useRef<number>(currentQ);
  currentQRef.current = currentQ;
  const buzzWinnerRef = useRef<string | null>(buzzWinner);
  buzzWinnerRef.current = buzzWinner;
  const buzzWinnerTimestampRef = useRef<number>(0);
  const phaseRef = useRef<GamePhase>(phase);
  phaseRef.current = phase;
  const roundStartTimeRef = useRef<number>(0);
  const roundDurationRef = useRef<number>(15000);
  const nextQTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addEvent = useCallback((msg: string) => {
    setEvents((prev) => [msg, ...prev].slice(0, 8));
  }, []);

  const handleOpponentLeft = useCallback(
    (leftName?: string) => {
      // Teardown voice chat immediately
      if (voiceChatRef.current) {
        voiceChatRef.current.destroy();
        voiceChatRef.current = null;
        setVoiceState("idle");
        setIsMicMuted(true);
      }

      const displayName = leftName || "Opponent";
      setOpponentLeftName(displayName);
      addEvent(`⚠️ ${displayName} disconnected from the room.`);

      if (statusRef.current === "finished" || statusRef.current === "idle") {
        return;
      }

      setOpponentLeftModalOpen(true);
    },
    [addEvent]
  );

  const continuePlayingSolo = useCallback(() => {
    audio.click();
    setOpponentLeftModalOpen(false);
    setIsSoloMode(true);
    setIsHost(true);
    isHostRef.current = true;
    addEvent("🎮 Playing in Solo Mode — finish remaining questions!");

    // Resume buzzer/answering round with a fresh countdown
    if (phaseRef.current === "buzzer") {
      roundStartTimeRef.current = Date.now();
      roundDurationRef.current = 15000;
      setTimeRemaining(15);
    } else if (phaseRef.current === "answering") {
      roundStartTimeRef.current = Date.now();
      roundDurationRef.current = 8000;
      setTimeRemaining(8);
    }
  }, [addEvent]);

  const keepWaitingInLobby = useCallback(() => {
    audio.click();
    setOpponentLeftModalOpen(false);
    addEvent("Room is open — share your 6-digit code with another friend!");
  }, [addEvent]);

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

  // ── Determine network transport (Socket.IO vs Supabase Realtime) ──
  useEffect(() => {
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const hasExternalSocket = Boolean(process.env.NEXT_PUBLIC_SOCKET_URL);

    // On Vercel (or any deployed cloud host without NEXT_PUBLIC_SOCKET_URL),
    // Next.js runs in serverless functions without persistent WebSockets.
    // Use Supabase Realtime with timestamp-accurate synchronization to prevent 308 WebSocket errors.
    if (!isLocalhost && !hasExternalSocket) {
      setSyncEngine("realtime");
      if (supabase) {
        setConnected(true);
      }
      return;
    }

    // On local Node server (server.mjs) or if NEXT_PUBLIC_SOCKET_URL is provided, initialize Socket.io
    try {
      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL ||
        (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

      const s = io(socketUrl, {
        path: "/api/socketio",
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 4,
        reconnectionDelay: 1000,
        timeout: 4000,
      });

      socketRef.current = s;

      s.on("connect", () => {
        setConnected(true);
        setSyncEngine("socket");
        setJoinError(null);
      });

      s.on("disconnect", () => {
        setConnected(false);
      });

      s.on("connect_error", () => {
        // Gracefully fall back to Supabase Realtime if Socket.io server is unreachable
        setSyncEngine("realtime");
        if (supabase) {
          setConnected(true);
        }
      });

      // Bind Socket.IO authoritative events
      s.on("room_created", (data) => {
        setStatus("lobby");
        setRoomCode(data.roomCode);
        setIsHost(true);
        if (data.players) setPlayers(data.players);
        if (data.settings) setRoomSettings(data.settings);
        addEvent(`Room created (${data.settings?.difficulty || "Mixed"} • ${data.settings?.sport || "All Sports"}). Code: ${data.roomCode}`);
      });

      s.on("room_joined", (data) => {
        setRoomCode(data.roomCode);
        setIsHost(Boolean(data.isHost));
        if (data.players) setPlayers(data.players);
        if (data.settings) setRoomSettings(data.settings);
        setStatus(data.status === "playing" ? "playing" : "lobby");
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
        if (data.question) {
          setQuestions((prev) => {
            const copy = [...prev];
            copy[data.currentQ] = data.question;
            return copy;
          });
        }
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
      });

      s.on("player_left", (data) => {
        handleOpponentLeft(data?.playerName || data?.name || "Opponent");
      });

      s.on("room_closed", (data) => {
        if (statusRef.current === "playing") {
          handleOpponentLeft("Host");
        } else {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("arena_mp_session");
          }
          setStatus("idle");
          setRoomCode("");
          setCodeInput("");
          setPlayers({});
          setJoinError(data?.message || "The room was closed by the host.");
          audio.wrong();
        }
      });

      return () => {
        s.disconnect();
      };
    } catch {
      setSyncEngine("realtime");
      if (supabase) setConnected(true);
    }
  }, [addEvent, updateScoresFromMap, handleOpponentLeft]);

  // ── Timestamp-based authoritative clock loop (0ms client drift) ──
  useEffect(() => {
    if (status !== "playing" || syncEngine !== "realtime") return;

    const interval = setInterval(() => {
      if (opponentLeftModalOpenRef.current) return;

      const currentPhase = phaseRef.current;
      if (currentPhase === "revealed") return;

      const startTime = roundStartTimeRef.current;
      const duration = roundDurationRef.current;
      if (!startTime) return;

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setTimeRemaining(remaining);

      // Sound ticks
      if (currentPhase === "buzzer") {
        if (remaining <= 5 && remaining > 2) {
          audio.tick();
        } else if (remaining === 2) {
          audio.urgentTick();
        }

        // Host authoritatively handles 15s buzzer timeout
        if (remaining <= 0 && isHostRef.current && !buzzWinnerRef.current) {
          const q = questionsRef.current[currentQRef.current];
          if (q) {
            supabaseChannelRef.current?.send({
              type: "broadcast",
              event: "question_timeout",
              payload: { correctAnswer: q.answer },
            });
            handleRoundTimeout(q.answer);
          }
        }
      } else if (currentPhase === "answering") {
        if (buzzWinnerRef.current === myIdRef.current) {
          if (remaining <= 3 && remaining > 0) {
            audio.urgentTick();
          } else if (remaining > 0) {
            audio.tick();
          }
        }

        // Host authoritatively handles 8s answer timeout
        if (remaining <= 0 && isHostRef.current && buzzWinnerRef.current) {
          const q = questionsRef.current[currentQRef.current];
          if (q) {
            supabaseChannelRef.current?.send({
              type: "broadcast",
              event: "answer",
              payload: {
                id: buzzWinnerRef.current,
                name: players[buzzWinnerRef.current]?.name || "Player",
                answer: -1,
                correct: false,
                correctAnswer: q.answer,
                timedOut: true,
              },
            });
            handleAnswerReveal({
              id: buzzWinnerRef.current,
              name: players[buzzWinnerRef.current]?.name || "Player",
              answer: -1,
              correct: false,
              correctAnswer: q.answer,
              timedOut: true,
            });
          }
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [status, syncEngine, players]);

  // ── Handle Answer Reveal (Shared by both players) ────────
  const handleAnswerReveal = useCallback(
    (payload: { id: string; name: string; answer: number; correct: boolean; correctAnswer: number; timedOut?: boolean }) => {
      setPhase("revealed");
      setSelectedAnswer(payload.answer);
      setRevealedAnswer(payload.correctAnswer);

      if (payload.timedOut) {
        setIsTimedOut(true);
        audio.timeout();
        addEvent(`${payload.name} ran out of time! ⌛`);
      } else if (payload.correct) {
        audio.correct();
        if (payload.id === myIdRef.current) {
          setMyScore((s) => s + 100);
          addEvent("You answered correctly! +100");
        } else {
          setOpponentScore((s) => s + 100);
          addEvent(`${payload.name} answered correctly! +100`);
        }
      } else {
        audio.wrong();
        addEvent(payload.id === myIdRef.current ? "You got it wrong." : `${payload.name} got it wrong.`);
      }

      // ONLY the Host orchestrates the 2.5s round advance
      if (isHostRef.current) {
        if (nextQTimeoutRef.current) clearTimeout(nextQTimeoutRef.current);
        nextQTimeoutRef.current = setTimeout(() => {
          const nextQ = currentQRef.current + 1;
          const total = questionsRef.current.length || 10;
          if (nextQ >= total) {
            supabaseChannelRef.current?.send({
              type: "broadcast",
              event: "match_finished",
            });
            setStatus("finished");
            audio.roundComplete();
          } else {
            const startNow = Date.now();
            supabaseChannelRef.current?.send({
              type: "broadcast",
              event: "next_question",
              payload: { nextQ, roundStartTime: startNow, roundDuration: 15000 },
            });
            startNextQuestionRound(nextQ, startNow, 15000);
          }
        }, 2500);
      }
    },
    [addEvent]
  );

  // ── Handle Round Timeout (No buzz) ───────────────────────
  const handleRoundTimeout = useCallback(
    (correctAnswer: number) => {
      setPhase("revealed");
      setIsTimedOut(true);
      setRevealedAnswer(correctAnswer);
      audio.timeout();
      addEvent("Time expired — no one buzzed!");

      if (isHostRef.current) {
        if (nextQTimeoutRef.current) clearTimeout(nextQTimeoutRef.current);
        nextQTimeoutRef.current = setTimeout(() => {
          const nextQ = currentQRef.current + 1;
          const total = questionsRef.current.length || 10;
          if (nextQ >= total) {
            supabaseChannelRef.current?.send({
              type: "broadcast",
              event: "match_finished",
            });
            setStatus("finished");
            audio.roundComplete();
          } else {
            const startNow = Date.now();
            supabaseChannelRef.current?.send({
              type: "broadcast",
              event: "next_question",
              payload: { nextQ, roundStartTime: startNow, roundDuration: 15000 },
            });
            startNextQuestionRound(nextQ, startNow, 15000);
          }
        }, 2500);
      }
    },
    [addEvent]
  );

  // ── Start Question Round ─────────────────────────────────
  const startNextQuestionRound = (qIdx: number, startTime: number, duration: number) => {
    setCurrentQ(qIdx);
    setPhase("buzzer");
    setBuzzWinner(null);
    setBuzzWinnerTimestamp(0);
    buzzWinnerTimestampRef.current = 0;
    setMyBuzzed(false);
    setSelectedAnswer(null);
    setRevealedAnswer(null);
    setIsTimedOut(false);
    setTimeRemaining(Math.ceil(duration / 1000));
    roundStartTimeRef.current = startTime;
    roundDurationRef.current = duration;
  };

  // ── Subscribe to Supabase Realtime Channel ────────────────
  const connectSupabaseRealtime = useCallback(
    (code: string) => {
      if (!supabase || !code) return;

      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.unsubscribe();
        supabaseChannelRef.current = null;
      }

      const channel = supabase.channel(`arena:${code}`, {
        config: { broadcast: { self: true } },
      });

      supabaseChannelRef.current = channel;

      channel
        .on("broadcast", { event: "player_join" }, ({ payload }) => {
          if (payload.id !== myIdRef.current) {
            setPlayers((prev) => ({
              ...prev,
              [payload.id]: { name: payload.name, score: 0, ready: true, connected: true },
            }));
            addEvent(`${payload.name} joined`);
            audio.opponentJoined();

            // Host announces presence back to guest
            if (isHostRef.current) {
              channel.send({
                type: "broadcast",
                event: "player_presence",
                payload: { id: myIdRef.current, name: name || "Host" },
              });
            }
          }
        })
        .on("broadcast", { event: "player_presence" }, ({ payload }) => {
          if (payload.id !== myIdRef.current) {
            setPlayers((prev) => ({
              ...prev,
              [payload.id]: { name: payload.name, score: 0, ready: true, connected: true },
            }));
          }
        })
        .on("broadcast", { event: "game_start" }, ({ payload }) => {
          if (!isHostRef.current) {
            if (payload.questions && payload.questions.length > 0) {
              setQuestions(payload.questions);
              setTotalQ(payload.questions.length);
            }
            setStatus("playing");
            startNextQuestionRound(0, payload.roundStartTime || Date.now(), 15000);
            addEvent("Match started! Rapid buzzer active.");
            audio.click();
          }
        })
        .on("broadcast", { event: "buzz" }, ({ payload }) => {
          const currentTimestamp = buzzWinnerTimestampRef.current;
          // First timestamp wins atomic lock
          if (!buzzWinnerRef.current || (payload.timestamp && payload.timestamp < currentTimestamp)) {
            buzzWinnerTimestampRef.current = payload.timestamp || Date.now();
            setBuzzWinnerTimestamp(buzzWinnerTimestampRef.current);
            setBuzzWinner(payload.id);
            setPhase("answering");
            roundStartTimeRef.current = payload.timestamp || Date.now();
            roundDurationRef.current = 8000;
            setTimeRemaining(8);
            audio.buzzer();

            if (payload.id === myIdRef.current) {
              addEvent("You buzzed first! ✨ Select your answer");
            } else {
              addEvent(`${payload.name} buzzed first!`);
            }
          }
        })
        .on("broadcast", { event: "answer" }, ({ payload }) => {
          // If broadcast bounced back to sender, skip since sender executed locally
          if (payload.id !== myIdRef.current) {
            handleAnswerReveal(payload);
          }
        })
        .on("broadcast", { event: "question_timeout" }, ({ payload }) => {
          if (!isHostRef.current) {
            handleRoundTimeout(payload.correctAnswer);
          }
        })
        .on("broadcast", { event: "next_question" }, ({ payload }) => {
          if (!isHostRef.current) {
            startNextQuestionRound(payload.nextQ, payload.roundStartTime, payload.roundDuration || 15000);
          }
        })
        .on("broadcast", { event: "match_finished" }, () => {
          setStatus("finished");
          audio.roundComplete();
          addEvent("Match finished!");
        })
        .on("broadcast", { event: "room_closed" }, ({ payload }) => {
          if (statusRef.current === "playing") {
            handleOpponentLeft(payload?.name || "Host");
          } else {
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("arena_mp_session");
            }
            setStatus("idle");
            setRoomCode("");
            setCodeInput("");
            setPlayers({});
            setJoinError(payload?.message || "The room was closed by the host.");
            audio.wrong();
          }
        })
        .on("broadcast", { event: "player_left" }, ({ payload }) => {
          setPlayers((prev) => {
            const updated = { ...prev };
            delete updated[payload.id];
            return updated;
          });
          handleOpponentLeft(payload?.name || "Opponent");
        })
        .on("presence", { event: "leave" }, ({ leftPresences }) => {
          const left = (leftPresences as any[])?.find((p) => p.id && p.id !== myIdRef.current);
          if (left) {
            setPlayers((prev) => {
              const updated = { ...prev };
              delete updated[left.id];
              return updated;
            });
            handleOpponentLeft(left.name || "Opponent");
          }
        })
        .on("broadcast", { event: "webrtc_offer" }, ({ payload }) => {
          if (payload?.from !== myIdRef.current) {
            webrtcSignalHandlersRef.current.onOffer?.(payload);
          }
        })
        .on("broadcast", { event: "webrtc_answer" }, ({ payload }) => {
          if (payload?.from !== myIdRef.current) {
            webrtcSignalHandlersRef.current.onAnswer?.(payload);
          }
        })
        .on("broadcast", { event: "webrtc_ice_candidate" }, ({ payload }) => {
          if (payload?.from !== myIdRef.current) {
            webrtcSignalHandlersRef.current.onCandidate?.(payload);
          }
        })
        .subscribe((subStatus) => {
          if (subStatus === "SUBSCRIBED") {
            setConnected(true);
            const myPayload = { id: myIdRef.current, name: name || (isHostRef.current ? "Host" : "Player") };
            channel.track(myPayload).catch(() => {});
            channel.send({
              type: "broadcast",
              event: "player_join",
              payload: myPayload,
            });
            setPlayers((prev) => ({
              ...prev,
              [myIdRef.current]: { name: name || (isHostRef.current ? "Host" : "Player"), score: 0, ready: true, connected: true },
            }));
          }
        });
    },
    [addEvent, handleAnswerReveal, handleRoundTimeout, handleOpponentLeft, name]
  );

  // ── Auto-restore session from storage on mount ───────────
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

        // Restore via API
        fetch(`/api/multiplayer/room?code=${parsed.roomCode}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.questions) {
              setQuestions(data.questions);
              setTotalQ(data.questions.length);
              setStatus("lobby");
              if (data.settings) setRoomSettings(data.settings);
              connectSupabaseRealtime(parsed.roomCode);
            }
          })
          .catch(() => {});
      }
    } catch {
      sessionStorage.removeItem("arena_mp_session");
    }
  }, [connectSupabaseRealtime]);

  // ── Create Room ──────────────────────────────────────────
  const createRoom = useCallback(async () => {
    setIsCreating(true);
    setJoinError(null);
    audio.click();

    // 🎙️ Request microphone permission immediately on user tap gesture
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices) {
        const stream = await requestUserAudioStream();
        localAudioStreamRef.current = stream;
        setIsMicMuted(false);
      }
    } catch (err: any) {
      console.warn("[Multiplayer] Mic permission on createRoom:", err);
    }

    const code = generateRoomCode();
    setRoomCode(code);
    setCodeInput(code);
    setIsHost(true);

    const activeTournament =
      selectedTournament !== "All Tournaments" &&
      selectedTournament !== "All Events" &&
      selectedTournament !== "All Grand Prix" &&
      !selectedTournament.startsWith("All")
        ? selectedTournament
        : undefined;

    let qs: Question[] = [];
    try {
      const excludeStems = getSeenStems(150);
      const excludeAnswers = getSeenAnswers(80);
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          sport: selectedSport,
          difficulty: selectedDifficulty,
          count: selectedCount,
          category: activeTournament,
          mode: "multiplayer",
          excludeStems,
          excludeAnswers,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        qs = data.questions;
        recordQuestionsAsSeen(qs);
      } else {
        qs = buildGame({ sport: selectedSport, difficulty: selectedDifficulty, count: selectedCount, category: activeTournament });
      }
    } catch {
      qs = buildGame({ sport: selectedSport, difficulty: selectedDifficulty, count: selectedCount, category: activeTournament });
    }

    setQuestions(qs);
    setTotalQ(qs.length);
    setRoomSettings({
      sport: selectedSport,
      difficulty: selectedDifficulty,
      tournament: selectedTournament,
      count: selectedCount,
      hostName: name || "Host",
    });

    try {
      // 1. Always persist room via HTTP endpoint (works seamlessly on Vercel & Node)
      await fetch("/api/multiplayer/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
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
      });

      // 2. If Socket.io is connected, emit room creation
      if (socketRef.current?.connected) {
        socketRef.current.emit("create_room", {
          roomCode: code,
          hostName: name || "Host",
          playerToken: myIdRef.current,
          sport: selectedSport,
          difficulty: selectedDifficulty,
          tournament: selectedTournament,
          count: selectedCount,
          questions: qs,
        });
      }

      // 3. Connect Supabase Realtime channel
      connectSupabaseRealtime(code);

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
      addEvent(`Room created (${selectedDifficulty} • ${selectedSport}). Code: ${code}`);
      audio.select();
      trackEvent("room_created", { code, sport: selectedSport, difficulty: selectedDifficulty });
    } catch (err) {
      console.error("[Multiplayer] Create room error:", err);
      setJoinError("Failed to create room. Please try again.");
      audio.wrong();
    } finally {
      setIsCreating(false);
    }
  }, [name, selectedSport, selectedDifficulty, selectedTournament, selectedCount, connectSupabaseRealtime, addEvent]);

  // ── Join Room ────────────────────────────────────────────
  const joinRoom = useCallback(async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setIsJoining(true);
    setJoinError(null);
    audio.select();

    // 🎙️ Request microphone permission immediately on user tap gesture
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices) {
        const stream = await requestUserAudioStream();
        localAudioStreamRef.current = stream;
        setIsMicMuted(false);
      }
    } catch (err: any) {
      console.warn("[Multiplayer] Mic permission on joinRoom:", err);
    }

    try {
      // 1. Register player in room
      const joinRes = await fetch("/api/multiplayer/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          roomCode: code,
          playerName: name || "Player 2",
          playerToken: myIdRef.current,
        }),
      });

      const joinData = await joinRes.json();
      if (!joinRes.ok) {
        setJoinError(joinData.error || "Cannot join room. Verify code.");
        audio.wrong();
        return;
      }

      // 2. Fetch room details
      const res = await fetch(`/api/multiplayer/room?code=${code}`, {
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();

      if (res.ok && data.success && data.questions?.length) {
        setQuestions(data.questions);
        setTotalQ(data.questions.length);
        setRoomCode(code);
        setIsHost(Boolean(joinData.isHost));
        setRoomSettings({
          hostName: data.hostName || "Host",
          sport: data.sport || "All Sports",
          difficulty: data.difficulty || "Mixed",
        });

        if (Array.isArray(data.players) && data.players.length > 0) {
          const playerMap: Record<string, PlayerState> = {};
          data.players.forEach(
            (p: { player_token: string; display_name: string; score?: number; connected?: boolean }) => {
              if (p.player_token) {
                playerMap[p.player_token] = {
                  name: p.display_name,
                  score: p.score ?? 0,
                  ready: true,
                  connected: p.connected ?? true,
                };
              }
            }
          );
          setPlayers(playerMap);
        }

        // 3. If Socket.io is connected, emit join
        if (socketRef.current?.connected) {
          socketRef.current.emit("join_room", {
            roomCode: code,
            playerName: name || "Player 2",
            playerToken: myIdRef.current,
          });
        }

        // 4. Connect Supabase Realtime channel
        connectSupabaseRealtime(code);

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
        audio.correct();
        trackEvent("room_joined", { code });
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
  }, [codeInput, name, connectSupabaseRealtime, addEvent]);

  // ── Start Match (Host only) ──────────────────────────────
  const startGame = useCallback(() => {
    audio.click();
    const startNow = Date.now();

    if (socketRef.current?.connected) {
      socketRef.current.emit("start_game", {
        roomCode,
        playerToken: myIdRef.current,
      });
    }

    // Broadcast via Supabase Realtime
    supabaseChannelRef.current?.send({
      type: "broadcast",
      event: "game_start",
      payload: {
        questions,
        roundStartTime: startNow,
        roundDuration: 15000,
      },
    });

    setStatus("playing");
    startNextQuestionRound(0, startNow, 15000);
  }, [roomCode, questions]);

  // ── Buzz (Atomic Lock) ───────────────────────────────────
  const buzz = useCallback(() => {
    if (phase !== "buzzer" || buzzWinner || myBuzzed || timeRemaining <= 0) return;
    setMyBuzzed(true);
    const now = Date.now();

    if (socketRef.current?.connected) {
      socketRef.current.emit("buzz", {
        roomCode,
        playerToken: myIdRef.current,
      });
    }

    supabaseChannelRef.current?.send({
      type: "broadcast",
      event: "buzz",
      payload: {
        id: myIdRef.current,
        name: name || (isHost ? "Host" : "Player"),
        timestamp: now,
      },
    });
  }, [phase, buzzWinner, myBuzzed, timeRemaining, roomCode, name, isHost]);

  // ── Submit Answer ────────────────────────────────────────
  const submitAnswer = useCallback(
    (answerIndex: number) => {
      if (phase !== "answering" || buzzWinner !== myIdRef.current) return;
      setSelectedAnswer(answerIndex);
      const q = questions[currentQ];
      if (!q) return;

      const isCorrect = answerIndex === q.answer;

      if (socketRef.current?.connected) {
        socketRef.current.emit("submit_answer", {
          roomCode,
          playerToken: myIdRef.current,
          answer: answerIndex,
        });
      }

      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "answer",
        payload: {
          id: myIdRef.current,
          name: name || (isHost ? "Host" : "Player"),
          answer: answerIndex,
          correct: isCorrect,
          correctAnswer: q.answer,
        },
      });

      handleAnswerReveal({
        id: myIdRef.current,
        name: name || (isHost ? "Host" : "Player"),
        answer: answerIndex,
        correct: isCorrect,
        correctAnswer: q.answer,
      });
    },
    [phase, buzzWinner, questions, currentQ, roomCode, name, isHost, handleAnswerReveal]
  );

  // ── Leave Room ───────────────────────────────────────────
  // ── Voice Chat Universal Signaler & Initialization ─────────────
  const getVoiceSignaler = useCallback((): VoiceSignaler | null => {
    if (socketRef.current?.connected) {
      return socketRef.current as unknown as VoiceSignaler;
    }
    if (supabaseChannelRef.current) {
      const channel = supabaseChannelRef.current;
      return {
        emit: (event: string, data: any) => {
          channel.send({
            type: "broadcast",
            event,
            payload: { ...data, from: myIdRef.current },
          });
        },
        on: (event: string, handler: (data: any) => void) => {
          if (event === "webrtc_offer") {
            webrtcSignalHandlersRef.current.onOffer = handler;
          } else if (event === "webrtc_answer") {
            webrtcSignalHandlersRef.current.onAnswer = handler;
          } else if (event === "webrtc_ice_candidate") {
            webrtcSignalHandlersRef.current.onCandidate = handler;
          }
        },
        off: (event: string) => {
          if (event === "webrtc_offer") delete webrtcSignalHandlersRef.current.onOffer;
          if (event === "webrtc_answer") delete webrtcSignalHandlersRef.current.onAnswer;
          if (event === "webrtc_ice_candidate") delete webrtcSignalHandlersRef.current.onCandidate;
        },
      };
    }
    return null;
  }, []);

  const initVoiceChat = useCallback(
    () => {
      if (voiceChatRef.current || !roomCode) return;
      const signaler = getVoiceSignaler();
      if (!signaler) return;

      const manager = new VoiceChatManager(
        signaler,
        roomCode,
        myIdRef.current,
        isHost,
        {
          onStateChange: (state) => setVoiceState(state),
          onMuteChange: (muted) => setIsMicMuted(muted),
          onRemoteAudioStart: () => {
            addEvent("🎙️ Voice chat connected! Both players can speak.");
          },
          onError: (msg) => {
            setVoiceError(msg);
            setTimeout(() => setVoiceError(null), 8000);
          },
        },
        localAudioStreamRef.current
      );

      voiceChatRef.current = manager;
      manager.initialize().catch(console.warn);
    },
    [roomCode, isHost, getVoiceSignaler, addEvent]
  );

  // Auto-initialize voice chat when both players are present
  useEffect(() => {
    const playerCount = Object.keys(players).length;
    if (playerCount >= 2 && status !== "idle" && !voiceChatRef.current) {
      initVoiceChat();
    }
  }, [players, status, initVoiceChat]);

  const toggleMic = useCallback(async () => {
    audio.click();

    // Check secure context for mobile feedback
    if (typeof window !== "undefined" && !window.isSecureContext) {
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "[::1]";
      if (!isLocal) {
        setVoiceError(
          "⚠️ Mobile browser blocks mic on plain HTTP. Please test via HTTPS (e.g. your Vercel link) to enable voice!"
        );
        setTimeout(() => setVoiceError(null), 8000);
        return;
      }
    }

    let manager = voiceChatRef.current;
    if (!manager) {
      if (!roomCode) return;
      const signaler = getVoiceSignaler();
      if (!signaler) return;

      manager = new VoiceChatManager(
        signaler,
        roomCode,
        myIdRef.current,
        isHost,
        {
          onStateChange: (state) => setVoiceState(state),
          onMuteChange: (muted) => setIsMicMuted(muted),
          onRemoteAudioStart: () => {
            addEvent("🎙️ Voice chat connected! Both players can speak.");
          },
          onError: (msg) => {
            setVoiceError(msg);
            setTimeout(() => setVoiceError(null), 8000);
          },
        },
        localAudioStreamRef.current
      );
      voiceChatRef.current = manager;
      manager.initialize().catch(console.warn);
    }

    // If local stream isn't acquired yet, acquire it directly on user tap
    if (!localAudioStreamRef.current) {
      try {
        const stream = await requestUserAudioStream();
        localAudioStreamRef.current = stream;
        await manager.attachLocalStream(stream);
        setIsMicMuted(false);
        return;
      } catch (err: any) {
        console.warn("[Multiplayer] toggleMic acquire error:", err);
        const msg =
          err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
            ? "Microphone access blocked. Please allow microphone in your browser settings (address bar icon) and tap Unmute again."
            : `Could not access mic: ${err?.message || "Permission error"}`;
        setVoiceError(msg);
        setTimeout(() => setVoiceError(null), 8000);
        return;
      }
    }

    // Call toggleMute directly in the synchronous user gesture stack
    try {
      const muted = await manager.toggleMute();
      setIsMicMuted(muted);
    } catch (err: any) {
      console.warn("[Multiplayer] toggleMic error:", err);
    }
  }, [audio, roomCode, isHost, getVoiceSignaler, addEvent]);

  const leaveRoom = useCallback(
    (forceDisband?: boolean | React.MouseEvent | React.SyntheticEvent) => {
      audio.click();

      // Destroy voice chat and release local microphone hardware
      if (voiceChatRef.current) {
        voiceChatRef.current.destroy();
        voiceChatRef.current = null;
        setVoiceState("idle");
        setIsMicMuted(true);
        setVoiceError(null);
      }

      if (localAudioStreamRef.current) {
        localAudioStreamRef.current.getTracks().forEach((track) => track.stop());
        localAudioStreamRef.current = null;
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("arena_mp_session");
      }

      const shouldDisband = (typeof forceDisband === "boolean" ? forceDisband : false) || isHost;

      if (roomCode) {
        if (socketRef.current?.connected) {
          socketRef.current.emit("leave_room", {
            roomCode,
            playerToken: myIdRef.current,
            disband: shouldDisband,
          });
        }

        supabaseChannelRef.current?.send({
          type: "broadcast",
          event: shouldDisband ? "room_closed" : "player_left",
          payload: { id: myIdRef.current, name },
        });

        fetch(
          `/api/multiplayer/player?code=${roomCode}&token=${myIdRef.current}${
            shouldDisband ? "&disband=true" : ""
          }`,
          {
            method: "DELETE",
          }
        ).catch(() => {});
      }

      supabaseChannelRef.current?.unsubscribe();
      supabaseChannelRef.current = null;
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
      setIsSoloMode(false);
      setOpponentLeftModalOpen(false);
    },
    [roomCode, isHost, name]
  );

  const disbandAndLeave = useCallback(() => {
    audio.click();
    setOpponentLeftModalOpen(false);
    leaveRoom(true);
  }, [leaveRoom]);

  // Clean disconnect on tab close / browser navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (roomCode && myIdRef.current) {
        const shouldDisband = isHostRef.current;
        supabaseChannelRef.current?.send({
          type: "broadcast",
          event: shouldDisband ? "room_closed" : "player_left",
          payload: { id: myIdRef.current, name },
        });
        navigator.sendBeacon?.(
          `/api/multiplayer/player?code=${roomCode}&token=${myIdRef.current}${
            shouldDisband ? "&disband=true" : ""
          }`
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [roomCode, name]);

  const renderOpponentLeftModal = () => {
    if (!opponentLeftModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-md rounded-3xl border border-arena-line/80 bg-gradient-to-b from-[#13151D] to-[#0A0C11] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center"
        >
          {/* Subtle glow highlight */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-24 bg-red-500/10 blur-3xl pointer-events-none rounded-full" />

          {/* Icon Badge */}
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <UserX size={28} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-3">
            <span>Opponent Disconnected</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide mb-2">
            {status === "playing" ? "Opponent Left Match" : "Opponent Left Room"}
          </h3>

          <p className="text-sm text-arena-muted mb-6 leading-relaxed">
            {status === "playing" ? (
              <>
                <span className="text-white font-semibold">{opponentLeftName}</span> left the room. You can continue playing solo to finish the quiz, or disband the match.
              </>
            ) : (
              <>
                <span className="text-white font-semibold">{opponentLeftName}</span> left the lobby. You can keep the room open to wait for another player or disband.
              </>
            )}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={disbandAndLeave}
              className="flex-1 px-4 py-3.5 rounded-2xl font-bold bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm shadow-[0_0_15px_rgba(239,68,68,0.15)]"
            >
              <LogOut size={16} />
              Disband & Exit
            </button>

            {status === "playing" ? (
              <button
                type="button"
                onClick={continuePlayingSolo}
                className="flex-1 px-4 py-3.5 rounded-2xl font-bold bg-gradient-to-r from-arena-accent to-cyan-400 text-black hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm shadow-[0_0_20px_rgba(0,229,255,0.3)]"
              >
                <Play size={16} />
                Continue Solo
              </button>
            ) : (
              <button
                type="button"
                onClick={keepWaitingInLobby}
                className="flex-1 px-4 py-3.5 rounded-2xl font-bold bg-arena-accent/15 border border-arena-accent/40 text-arena-accent hover:bg-arena-accent/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Users size={16} />
                Keep Room Open
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

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
  const q = questions[currentQ];

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
              Create a room, share the 6-digit code, and battle head-to-head on the synchronized buzzer with 0ms timing drift.
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
                {syncEngine === "socket" ? "Socket.IO Live" : "Realtime Synced"}
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
                className="arena-input text-sm cursor-pointer"
                value={selectedSport}
                onChange={(e) => {
                  const newSport = e.target.value as Sport | "All Sports";
                  setSelectedSport(newSport);
                  const defaultT = newSport === "All Sports" ? "All Tournaments" : (TOURNAMENTS_BY_SPORT[newSport]?.[0] || "All Tournaments");
                  setSelectedTournament(defaultT);
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
                Got a 6-digit code from your friend? Enter it below to jump straight into their custom match.
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
                  {connected
                    ? syncEngine === "socket"
                      ? "Socket.IO Live & Synced"
                      : "Realtime Synced"
                    : "Connecting to Arena..."}
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

              {/* Voice Chat & Mic Controls in Lobby - Always Visible */}
              <div className="mt-4 p-4 rounded-xl border border-arena-line bg-gradient-to-r from-white/[.03] via-white/[.01] to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl grid place-items-center flex-shrink-0 transition-colors ${
                        voiceState === "connected" && !isMicMuted
                          ? "bg-green-500/20 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                          : voiceState === "connecting"
                          ? "bg-arena-accent/20 text-arena-accent"
                          : "bg-white/[.05] text-arena-muted"
                      }`}
                    >
                      {voiceState === "connected" && !isMicMuted ? (
                        <Mic size={18} className="animate-pulse" />
                      ) : (
                        <MicOff size={18} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-arena-text">1v1 Voice Chat</span>
                        {voiceState === "connected" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Connected
                          </span>
                        )}
                        {voiceState === "connecting" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-arena-accent bg-arena-accent/10 px-2 py-0.5 rounded-full border border-arena-accent/20">
                            <Loader2 size={10} className="animate-spin" />
                            Connecting...
                          </span>
                        )}
                        {voiceState === "idle" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-arena-muted bg-white/[.04] px-2 py-0.5 rounded-full border border-arena-line">
                            WebRTC Ready
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-arena-muted mt-0.5">
                        {voiceState === "connected"
                          ? !isMicMuted
                            ? "Mic is LIVE — opponent can hear you clearly"
                            : "Mic is muted. Tap button to unmute."
                          : voiceState === "connecting"
                          ? "Connecting audio stream with peer..."
                          : voiceState === "no-mic"
                          ? "Microphone access blocked. Game continues without voice."
                          : voiceState === "failed"
                          ? "Voice connection error. Retrying or continue without voice."
                          : playerCount < 2
                          ? "Mic ready. Will connect automatically when opponent enters."
                          : "Tap button to unmute and test your mic."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleMic}
                    className={`arena-btn text-xs px-3.5 py-2 font-semibold whitespace-nowrap cursor-pointer transition-all ${
                      voiceState === "connected" && !isMicMuted
                        ? "bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30"
                        : "arena-btn-primary"
                    }`}
                  >
                    {voiceState === "connected" && !isMicMuted ? (
                      <>
                        <MicOff size={14} />
                        Mute Mic
                      </>
                    ) : (
                      <>
                        <Mic size={14} />
                        {!isMicMuted ? "Enable Mic" : "Unmute Mic"}
                      </>
                    )}
                  </button>
                </div>

                {voiceError && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-start justify-between gap-2 shadow-[0_4px_16px_rgba(245,158,11,0.2)] animate-in fade-in">
                    <div className="flex items-start gap-2">
                      <MicOff size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{voiceError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVoiceError(null)}
                      className="text-amber-400/80 hover:text-amber-200 text-sm font-bold shrink-0 px-1"
                    >
                      ✕
                    </button>
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
        {renderOpponentLeftModal()}
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
            {isSoloMode ? (
              <div className="px-3 py-1.5 rounded-xl border border-arena-warn/40 bg-arena-warn/10 text-arena-warn text-xs font-semibold backdrop-blur-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-arena-warn animate-pulse" />
                Solo Play
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-xl border border-arena-line bg-white/[.03] text-sm font-semibold backdrop-blur-sm">
                Opp: <span className="text-arena-bad font-display">{opponentScore}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Voice Chat Mic Toggle - Always visible in-game */}
            <button
              type="button"
              onClick={toggleMic}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                voiceState === "connected" && !isMicMuted
                  ? "bg-green-500/20 border-green-500/50 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                  : isMicMuted
                  ? "bg-white/[.04] border-arena-line text-arena-muted hover:text-arena-text hover:border-white/20"
                  : "bg-arena-accent/15 border-arena-accent/40 text-arena-accent"
              }`}
              title={
                voiceState === "connected" && !isMicMuted
                  ? "Mic live — click to mute"
                  : "Mic muted — click to unmute"
              }
            >
              {voiceState === "connected" && !isMicMuted ? (
                <>
                  <Mic size={14} className="animate-pulse" />
                  <span>Mic Live</span>
                </>
              ) : (
                <>
                  <MicOff size={14} />
                  <span>Mic Muted</span>
                </>
              )}
            </button>
            {voiceState === "connecting" && (
              <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl border border-arena-line bg-white/[.02] text-arena-muted text-xs">
                <Loader2 size={12} className="animate-spin text-arena-accent" />
                <span>Voice connecting...</span>
              </div>
            )}

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

        {/* Voice Chat In-Game Notice */}
        {voiceError && (
          <div className="w-full max-w-xl mx-auto mb-3 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-3 shadow-[0_4px_20px_rgba(245,158,11,0.2)] animate-in fade-in">
            <div className="flex items-center gap-2">
              <MicOff size={15} className="text-amber-400 shrink-0" />
              <span>{voiceError}</span>
            </div>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="text-amber-400/80 hover:text-amber-200 text-sm font-bold shrink-0 px-1"
            >
              ✕
            </button>
          </div>
        )}

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
            {/* Top Timer Progress Bar */}
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

        {renderOpponentLeftModal()}
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
