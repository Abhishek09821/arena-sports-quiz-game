"use client";

import { useSportTheme } from "@/components/ThemeProvider";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Sparkles,
  Edit3,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Play,
  Share2,
  Copy,
  FileJson,
  FileText,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  X,
  Loader2,
  KeyRound,
  CheckCircle2,
  Bookmark,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useQuizStore } from "@/lib/store";
import {
  SPORT_LIST,
  DIFFICULTY_LIST,
  TOURNAMENTS_BY_SPORT,
  DECADE_OPTIONS,
  type DecadeOption,
  type Question,
  type Sport,
  type Difficulty,
} from "@/data/questions";
import QuizGame from "@/components/QuizGame";
import { audio } from "@/lib/audio";
import { validateQuestions, parseCSV } from "@/lib/validation";
import { useAuth } from "@/components/AuthContext";
import { getSeenStems, getSeenAnswers, recordQuestionsAsSeen } from "@/lib/seen_history";

type BuilderTab = "ai" | "play_code" | "saved" | "manual" | "file";

export interface SavedChallenge {
  id: string;
  code: string;
  title: string;
  creator_name: string;
  sport: string;
  tournament?: string;
  difficulty: string;
  created_at: string;
  question_count: number;
  questions: Question[];
}

const SAVED_CHALLENGES_STORAGE_KEY = "arena_saved_challenges_v1";

function ChallengeContent() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();

  // Builder State
  const [activeTab, setActiveTab] = useState<BuilderTab>("ai");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [started, setStarted] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState("Ultimate Sports Challenge");
  const [challengeCode, setChallengeCode] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Saved Challenges State (Persisted in localStorage across reloads and logouts)
  const [savedChallenges, setSavedChallenges] = useState<SavedChallenge[]>([]);

  // Play By Code State
  const [inputCode, setInputCode] = useState("");
  const [isLoadingChallenge, setIsLoadingChallenge] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedChallenge, setLoadedChallenge] = useState<{
    id: string;
    code: string;
    title: string;
    creator_name: string;
    sport: string;
    difficulty: string;
    question_count: number;
    play_count?: number;
  } | null>(null);
  const [loadedQuestions, setLoadedQuestions] = useState<Question[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Tournament dropdown state
  const [selectedTournament, setSelectedTournament] = useState("All");

  // AI Generation State
  const [aiSport, setAiSport] = useState<Sport>("Cricket");
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>("Medium");
  const [aiCategory, setAiCategory] = useState("");
  const [aiDecade, setAiDecade] = useState<DecadeOption>("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerating10, setIsGenerating10] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Manual Question State
  const [manualQ, setManualQ] = useState("");
  const [manualOpts, setManualOpts] = useState(["", "", "", ""]);
  const [manualAnswer, setManualAnswer] = useState(0);
  const [manualExp, setManualExp] = useState("");
  const [manualSport, setManualSport] = useState<Sport>("Cricket");
  useSportTheme(activeTab === "manual" ? manualSport : aiSport);
  const [manualDiff, setManualDiff] = useState<Difficulty>("Medium");

  // Edit Modal State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Question | null>(null);

  // File Import State
  const [fileText, setFileText] = useState("");
  const [fileFormat, setFileFormat] = useState<"json" | "csv">("json");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // ── Load Saved Challenges from LocalStorage on mount ─────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_CHALLENGES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedChallenges(parsed);
        }
      }
    } catch (err) {
      console.error("[Challenge] Error loading saved challenges from localStorage:", err);
    }
  }, []);

  const persistSavedChallenges = (updated: SavedChallenge[]) => {
    setSavedChallenges(updated);
    try {
      localStorage.setItem(SAVED_CHALLENGES_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("[Challenge] Error saving challenges to localStorage:", err);
    }
  };

  const deleteSavedChallenge = (codeToDelete: string) => {
    if (!confirm(`Are you sure you want to delete challenge ${codeToDelete}? It will be removed from your saved challenges.`)) {
      return;
    }
    audio.click();
    const next = savedChallenges.filter((c) => c.code !== codeToDelete);
    persistSavedChallenges(next);
  };

  // ── 0. Load & Play Challenge by Code ────────────────────────
  const loadChallenge = async (codeToLoad: string) => {
    const code = codeToLoad.trim().toUpperCase();
    if (!code) return;
    setIsLoadingChallenge(true);
    setLoadError(null);
    audio.click();

    // Check local storage first
    const localMatch = savedChallenges.find((c) => c.code === code);
    if (localMatch && localMatch.questions.length > 0) {
      setLoadedChallenge({
        id: localMatch.id,
        code: localMatch.code,
        title: localMatch.title,
        creator_name: localMatch.creator_name,
        sport: localMatch.sport,
        difficulty: localMatch.difficulty,
        question_count: localMatch.question_count,
        play_count: 1,
      });
      setLoadedQuestions(localMatch.questions);
      setIsLoadingChallenge(false);
      audio.correct();
      return;
    }

    try {
      const res = await fetch(`/api/challenge/${code}`);
      const data = await res.json();

      if (!res.ok || !data.challenge) {
        throw new Error(data.error || "Challenge not found. Please check the code.");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qList: Question[] = (data.questions || []).map((q: any, i: number) => {
        const rawOpts = Array.isArray(q.options)
          ? q.options
          : [q.option_a, q.option_b, q.option_c, q.option_d];
        const options: [string, string, string, string] = [
          rawOpts[0] || "",
          rawOpts[1] || "",
          rawOpts[2] || "",
          rawOpts[3] || "",
        ];

        let answer = typeof q.correct_option === "number" ? q.correct_option : (typeof q.answer === "number" ? q.answer : 0);
        // Resiliently resolve correct answer index by matching against correct_answer / correctAnswerText
        const correctText = (q.correct_answer || q.correctAnswerText || "").trim().toLowerCase();
        if (correctText) {
          const match = options.findIndex((opt) => (opt || "").trim().toLowerCase() === correctText);
          if (match !== -1) {
            answer = match;
          }
        }

        return {
          id: q.id || `chal-q-${i}`,
          sport: q.sport || data.challenge.sport || "All Sports",
          difficulty: q.difficulty || data.challenge.difficulty || "Mixed",
          year: q.year,
          category: q.category,
          question: q.question_text || q.question,
          options,
          answer,
          explanation: q.explanation || "",
        };
      });

      setLoadedChallenge(data.challenge);
      setLoadedQuestions(qList);
      audio.correct();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load challenge");
      audio.wrong();
    } finally {
      setIsLoadingChallenge(false);
    }
  };

  const [isReviewing, setIsReviewing] = useState(false);
  const playReviewedChallenge = async (candidates: Question[], sport: string, difficulty: string, sessionId?: string) => {
    if (isReviewing) return;
    setIsReviewing(true);
    try {
      const response = await fetch("/api/quiz/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ questions: candidates, sport, difficulty, excludeStems: getSeenStems() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to review this challenge.");
      if (sessionId) {
        const tracked = await fetch("/api/challenge/activity", { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}, body:JSON.stringify({challengeId:sessionId}) });
        if (!tracked.ok) throw new Error("Could not register this play. Please retry.");
      }
      recordQuestionsAsSeen(result.questions);
      audio.unlock();
      useQuizStore.getState().start(result.questions, { sport: sport as Sport, difficulty: difficulty as Difficulty, mode: "challenge", sessionId });
      setStarted(true);
    } catch (error) { alert(error instanceof Error ? error.message : "Unable to prepare challenge."); }
    finally { setIsReviewing(false); }
  };
  const playLoadedChallenge = () => {
    if (loadedChallenge) void playReviewedChallenge(loadedQuestions, loadedChallenge.sport, loadedChallenge.difficulty, loadedChallenge.id);
  };
  const playSavedChallengeDirectly = (item: SavedChallenge) => {
    void playReviewedChallenge(item.questions, item.sport, item.difficulty, item.id);
  };

  // Auto-load if code is in URL parameters (?code=XYZ123)
  useEffect(() => {
    if (searchParams.get("join") === "1") setActiveTab("play_code");
    const requestedSport = searchParams.get("sport");
    if (SPORT_LIST.some(s => s === requestedSport)) setAiSport(requestedSport as Sport);
    const queryCode = searchParams.get("code");
    if (queryCode) {
      const clean = queryCode.trim().toUpperCase();
      setInputCode(clean);
      setActiveTab("play_code");
      loadChallenge(clean);
    }
  }, [searchParams]);

  // ── 1. 1-Click "Generate Full 10 Questions with Gemini" ─────
  const generate10WithGemini = async () => {
    setIsGenerating10(true);
    audio.click();

    try {
      const activeTournament = selectedTournament === "Custom" ? aiCategory.trim() || undefined : selectedTournament.startsWith("All") ? undefined : selectedTournament;
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          mode: "challenge",
          sport: aiSport,
          difficulty: aiDifficulty,
          decade: aiDecade,
          category: activeTournament,
          count: 10,
          excludeStems: getSeenStems(),
          excludeAnswers: getSeenAnswers(80),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.questions || data.questions.length !== 10) {
        throw new Error(data.message || data.error || "Unable to prepare a complete round.");
      }

      const final10 = (data.questions as Question[]).slice(0, 10);
      setQuestions(final10);
      setChallengeTitle(`${aiSport} ${activeTournament ? activeTournament : "Arena"} Challenge`);

      audio.correct();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate 10 questions with Gemini");
      audio.wrong();
    } finally {
      setIsGenerating10(false);
    }
  };

  // ── 2. AI Single Question Generation ────────────────────────
  const generateOneWithAI = async () => {
    if (questions.length >= 10) {
      alert("A challenge set has a maximum of 10 questions. Delete or edit an existing question to replace it.");
      return;
    }

    setIsGenerating(true);
    audio.click();

    try {
      const activeTournament = selectedTournament === "Custom" ? aiCategory.trim() || undefined : selectedTournament.startsWith("All") ? undefined : selectedTournament;
      const res = await fetch("/api/challenge/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          sport: aiSport,
          difficulty: aiDifficulty,
          decade: aiDecade,
          category: activeTournament,
          excludeStems: [
            ...getSeenStems(),
            ...questions.map((q) => q.question),
          ],
          excludeAnswers: [
            ...getSeenAnswers(80),
            ...questions.map((q) => q.options[q.answer]),
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.question) {
        throw new Error(data.error || "Failed to generate question");
      }

      const newQ: Question = {
        id: data.question.id || `chal-ai-${Date.now()}`,
        sport: data.question.sport,
        difficulty: data.question.difficulty,
        question: data.question.question,
        options: data.question.options,
        answer: data.question.answer,
        explanation: data.question.explanation,
        year: data.question.year || new Date().getFullYear(),
        category: data.question.category,
      };

      setQuestions((prev) => [...prev, newQ]);

      audio.correct();
    } catch (err) {
      console.error("[Challenge Single Generation] Error:", err);
      audio.wrong();
    } finally {
      setIsGenerating(false);
    }
  };

  // ── 3. AI Regenerate Specific Question ──────────────────────
  const regenerateSingleQuestion = async (index: number) => {
    setRegeneratingIndex(index);
    audio.click();

    try {
      const target = questions[index];
      const res = await fetch("/api/challenge/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          sport: target.sport,
          difficulty: target.difficulty,
          category: target.category || (selectedTournament.startsWith("All") ? undefined : selectedTournament === "Custom" ? aiCategory : selectedTournament),
          decade: aiDecade,
          excludeStems: [
            ...getSeenStems(),
            ...questions.filter((_, i) => i !== index).map((q) => q.question),
          ],
          excludeAnswers: [
            ...getSeenAnswers(80),
            ...questions.filter((_, i) => i !== index).map((q) => q.options[q.answer]),
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.question) {
        throw new Error(data.error || "Regeneration failed");
      }

      const updated: Question = {
        ...questions[index],
        question: data.question.question,
        options: data.question.options,
        answer: data.question.answer,
        explanation: data.question.explanation,
        year: data.question.year || target.year,
      };

      setQuestions((prev) => {
        const next = [...prev];
        next[index] = updated;
        return next;
      });

      audio.correct();
    } catch (err) {
      console.error("[Challenge Regenerate] Error:", err);
      audio.wrong();
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // ── 4. Manual Question Entry ────────────────────────────────
  const addManualQuestion = () => {
    if (!manualQ.trim()) {
      alert("Please enter a question.");
      return;
    }
    if (manualOpts.some((o) => !o.trim())) {
      alert("All 4 options must be filled out.");
      return;
    }
    if (questions.length >= 10) {
      alert("A challenge set must have exactly 10 questions. Remove an existing question or edit it to make changes.");
      return;
    }

    const normNew = manualQ.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
    if (questions.some((q) => q.question.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30) === normNew)) {
      alert("This question or a very similar one already exists in the deck. Duplicate questions are not allowed.");
      return;
    }

    const newQ: Question = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sport: manualSport,
      difficulty: manualDiff,
      question: manualQ.trim(),
      options: [manualOpts[0].trim(), manualOpts[1].trim(), manualOpts[2].trim(), manualOpts[3].trim()],
      answer: manualAnswer,
      explanation: manualExp.trim() || `${manualOpts[manualAnswer]} is the correct answer.`,
      year: new Date().getFullYear(),
    };

    setQuestions((prev) => [...prev, newQ]);
    audio.click();

    // Reset form
    setManualQ("");
    setManualOpts(["", "", "", ""]);
    setManualAnswer(0);
    setManualExp("");
  };

  // ── 5. Reorder & Delete ─────────────────────────────────────
  const moveQuestion = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    audio.click();
    setQuestions((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const deleteQuestion = (index: number) => {
    audio.click();
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // ── 6. Edit Modal ───────────────────────────────────────────
  const openEditModal = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...questions[index] });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editForm) return;
    setQuestions((prev) => {
      const next = [...prev];
      next[editingIndex] = editForm;
      return next;
    });
    setEditingIndex(null);
    setEditForm(null);
    audio.click();
  };

  // ── 7. File Import & Export ─────────────────────────────────
  const parseFileInput = () => {
    setValidationErrors([]);
    try {
      let rawData: unknown[];
      if (fileFormat === "json") {
        const parsed = JSON.parse(fileText);
        if (!Array.isArray(parsed)) {
          setValidationErrors(["Input must be a JSON array of question objects."]);
          return;
        }
        rawData = parsed;
      } else {
        rawData = parseCSV(fileText);
        if (rawData.length === 0) {
          setValidationErrors(["No valid rows found. Check CSV header structure."]);
          return;
        }
      }

      const result = validateQuestions(rawData);
      if (!result.valid) {
        setValidationErrors(result.errors.map((e) => `Q${e.index + 1}: ${e.message}`));
        if (result.questions.length > 0) {
          setQuestions((prev) => [...prev, ...result.questions].slice(0, 10));
        }
        return;
      }

      const combined = [...questions, ...result.questions].slice(0, 10);
      setQuestions(combined);
      setFileText("");
      audio.challengeCreated();
    } catch (e) {
      setValidationErrors([e instanceof Error ? e.message : "Parse error"]);
    }
  };

  const exportAsJSON = () => {
    if (questions.length === 0) return;
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${challengeTitle.toLowerCase().replace(/\s+/g, "_")}_questions.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    if (questions.length === 0) return;
    const header = "question,option_a,option_b,option_c,option_d,answer,sport,difficulty,year,explanation\n";
    const rows = questions.map((q) => {
      const escape = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
      return [
        escape(q.question),
        escape(q.options[0]),
        escape(q.options[1]),
        escape(q.options[2]),
        escape(q.options[3]),
        q.answer,
        escape(q.sport),
        escape(q.difficulty),
        q.year || 2024,
        escape(q.explanation),
      ].join(",");
    });

    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${challengeTitle.toLowerCase().replace(/\s+/g, "_")}_questions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── 8. Save & Persist Challenge (Local + Supabase) ───────────
  const saveAndShare = async () => {
    if (questions.length !== 10) {
      alert(`A challenge requires exactly 10 questions. Currently you have ${questions.length}/10. Click 'Generate 10 Questions with Gemini' to generate a complete set instantly.`);
      return;
    }

    setIsSaving(true);
    audio.click();

    const fallbackCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const creator = user?.email?.split("@")[0] || "Challenger";
    const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    let finalCode = fallbackCode;
    let finalId = `chal-${Date.now()}`;

    try {
      const res = await fetch("/api/challenge/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          title: challengeTitle,
          sport: questions[0]?.sport || aiSport || "All Sports",
          difficulty: aiDifficulty || "Mixed",
          questions,
          creatorName: creator,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.code) {
        finalCode = data.code;
        finalId = data.challengeId || finalId;
      } else { throw new Error(data.error || "Challenge was not saved."); }
    } catch (dbErr) {
      alert(dbErr instanceof Error ? dbErr.message : "Challenge was not saved. Please retry.");
      setIsSaving(false);
      return;
    }

    // Persist in localStorage so it survives reload and logout
    const savedItem: SavedChallenge = {
      id: finalId,
      code: finalCode,
      title: challengeTitle,
      creator_name: creator,
      sport: questions[0]?.sport || aiSport || "All Sports",
      tournament: selectedTournament !== "All" ? selectedTournament : undefined,
      difficulty: aiDifficulty || "Mixed",
      created_at: dateStr,
      question_count: 10,
      questions: [...questions],
    };

    const existingIdx = savedChallenges.findIndex((c) => c.code === finalCode);
    let updatedList: SavedChallenge[];
    if (existingIdx >= 0) {
      updatedList = [...savedChallenges];
      updatedList[existingIdx] = savedItem;
    } else {
      updatedList = [savedItem, ...savedChallenges];
    }
    persistSavedChallenges(updatedList);

    setChallengeCode(finalCode);
    setShowShareModal(true);
    audio.challengeCreated();
    setIsSaving(false);
  };

  const startChallengeNow = () => {
    if (questions.length !== 10) {
      alert(`A challenge requires strictly 10 questions. Currently you have ${questions.length}/10. Add or generate questions to make it exactly 10.`);
      return;
    }
    void playReviewedChallenge(questions, questions.every(q => q.sport === questions[0].sport) ? questions[0].sport : "All Sports", "Mixed");
  };

  const copyShareLink = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const directUrl = `${origin}/challenge?code=${code}`;
    navigator.clipboard?.writeText(directUrl);
    audio.click();
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (started) return <QuizGame onExit={() => setStarted(false)} />;

  return (
    <main className="arena-container arena-mode-page pb-20">
      {isReviewing && <div role="status" className="arena-container py-4 text-sm text-arena-accent">Reviewing questions and replacing repeats before your round...</div>}
      <div className="pt-7 pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-arena-muted hover:text-arena-text transition-colors"
        >
          <ArrowLeft size={15} /> Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="arena-eyebrow mt-5">Challenge Studio</div>
          <h1 className="font-display text-[clamp(40px,7vw,72px)] tracking-[-0.06em] leading-[0.95] mt-2 font-bold">
            Create. Dare.<br />
            <span className="arena-gradient-text">Compete.</span>
          </h1>
          <p className="text-arena-muted max-w-[700px] mt-3 leading-relaxed">
            Create a 10-question quiz with AI, write your own, or import a file.
            Share a code and see who takes your challenge.
          </p>
        </motion.div>
      </div>

      <Link href="/challenge/activity" className="inline-flex text-sm text-arena-accent mb-5">View my challenge players & activity →</Link>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Question Creator Workspace */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="challenge-tabs">
            <button
              className={`arena-btn text-xs flex-1 min-w-[110px] justify-center ${activeTab === "ai" ? "arena-btn-primary shadow-[0_0_15px_rgba(0,212,255,0.25)]" : "arena-btn-ghost"}`}
              onClick={() => { setActiveTab("ai"); audio.click(); }}
            >
              <Sparkles size={14} /> Generate
            </button>
            <button
              className={`arena-btn text-xs flex-1 min-w-[110px] justify-center ${activeTab === "play_code" ? "arena-btn-primary shadow-[0_0_15px_rgba(0,212,255,0.25)]" : "arena-btn-ghost"}`}
              onClick={() => { setActiveTab("play_code"); audio.click(); }}
            >
              <KeyRound size={14} /> Play Code
            </button>
            <button
              className={`arena-btn text-xs flex-1 min-w-[110px] justify-center ${activeTab === "saved" ? "arena-btn-primary shadow-[0_0_15px_rgba(0,212,255,0.25)]" : "arena-btn-ghost"}`}
              onClick={() => { setActiveTab("saved"); audio.click(); }}
            >
              <Bookmark size={14} /> Saved ({savedChallenges.length})
            </button>
            <button
              className={`arena-btn text-xs flex-1 min-w-[100px] justify-center ${activeTab === "manual" ? "arena-btn-primary shadow-[0_0_15px_rgba(0,212,255,0.25)]" : "arena-btn-ghost"}`}
              onClick={() => { setActiveTab("manual"); audio.click(); }}
            >
              <Plus size={14} /> Manual
            </button>
            <button
              className={`arena-btn text-xs flex-1 min-w-[90px] justify-center ${activeTab === "file" ? "arena-btn-primary shadow-[0_0_15px_rgba(0,212,255,0.25)]" : "arena-btn-ghost"}`}
              onClick={() => { setActiveTab("file"); audio.click(); }}
            >
              <Upload size={14} /> File
            </button>
          </div>

          {/* TAB: Gemini AI Generator */}
          {activeTab === "ai" && (
            <motion.div
              className="arena-card space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="arena-eyebrow">Your next challenge</div>
                  <h3 className="font-display font-bold text-lg">Create your questions</h3>
                </div>
                <span className="arena-pill px-2.5 py-1 text-xs text-arena-accent font-semibold border-arena-accent/40">
                  10 questions
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-arena-muted mb-1">Category · 4 sports + General Knowledge</label>
                  <select
                    value={aiSport}
                    onChange={(e) => {
                      const newSport = e.target.value as Sport;
                      setAiSport(newSport);
                      setSelectedTournament("All");
                      setAiCategory("");
                    }}
                    className="arena-input text-sm"
                  >
                    {SPORT_LIST.map((s) => (
                      <option key={s} value={s} className="bg-arena-panel">
                        {s === "Football" ? "Football (Soccer)" : s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-arena-muted mb-1">Difficulty</label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value as Difficulty)}
                    className="arena-input text-sm"
                  >
                    {DIFFICULTY_LIST.map((d) => (
                      <option key={d} value={d} className="bg-arena-panel">{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tournament Selector Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-arena-muted mb-1">
                  Tournament / League / Category
                </label>
                <select
                  className="arena-input text-sm mb-2"
                  value={selectedTournament}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedTournament(val);
                    if (val === "All") {
                      setAiCategory("");
                    } else if (val !== "Custom") {
                      setAiCategory(val);
                    }
                  }}
                >
                  <option value="All" className="bg-arena-panel">All / Any Tournament ({aiSport})</option>
                  {(TOURNAMENTS_BY_SPORT[aiSport] || []).map((t) => (
                    <option key={t} value={t} className="bg-arena-panel">{t}</option>
                  ))}
                  <option value="Custom" className="bg-arena-panel"> Enter Custom Tournament / Topic...</option>
                </select>

                {selectedTournament === "Custom" && (
                  <input
                    type="text"
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value)}
                    placeholder="e.g. 2011 Cricket World Cup, Champions League 2024, WrestleMania 40"
                    className="arena-input text-sm"
                    autoFocus
                  />
                )}
              </div>

              {/* Decade Selector */}
              <div>
                <label className="block text-xs font-semibold text-arena-muted mb-1">
                  Era / Decade Filter
                </label>
                <select
                  className="arena-input text-sm"
                  value={aiDecade}
                  onChange={(e) => setAiDecade(e.target.value as DecadeOption)}
                >
                  {DECADE_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value} className="bg-arena-panel">{d.label}</option>
                  ))}
                </select>
              </div>

              {/* 1-Click 10-Question Button */}
              <div className="p-4 rounded-2xl bg-arena-accent/5 border border-arena-accent/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-arena-accent" />
                  <span className="text-xs font-bold text-arena-text">Prepare a complete round</span>
                </div>
                <p className="text-xs text-arena-muted leading-relaxed">
                  Prepare 10 questions matched to{" "}
                  <strong className="text-arena-text">{aiSport}</strong> and your selected filters.
                </p>
                <button
                  onClick={generate10WithGemini}
                  disabled={isGenerating10 || isGenerating}
                  className="arena-btn arena-btn-primary w-full justify-center py-3 shadow-[0_0_25px_rgba(0,212,255,0.3)] text-sm font-semibold"
                >
                  {isGenerating10 ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span>Generating 10 Unique Questions and your selected filters...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} />
                      <span>Generate 10 questions</span>
                    </div>
                  )}
                </button>
              </div>

              {/* Or add one by one */}
              <div className="pt-1 flex items-center justify-between">
                <span className="text-xs text-arena-muted">Or add questions one at a time:</span>
                <button
                  onClick={generateOneWithAI}
                  disabled={isGenerating || isGenerating10 || questions.length >= 10}
                  className="arena-btn arena-btn-ghost text-xs border border-white/10"
                >
                  {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Add one question ({questions.length}/10)
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB: Play by Challenge Code */}
          {activeTab === "play_code" && (
            <motion.div
              className="arena-card space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="arena-eyebrow">Play a Challenge</div>
              <h3 className="font-display font-bold text-lg">Enter 6-Digit Challenge Code</h3>
              <p className="text-xs text-arena-muted leading-relaxed">
                Enter a code shared by a friend or creator to load their custom 10-question set and compete.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  maxLength={8}
                  className="arena-input font-display text-xl tracking-[0.2em] uppercase text-center flex-1"
                />
                <button
                  onClick={() => loadChallenge(inputCode)}
                  disabled={isLoadingChallenge || inputCode.trim().length < 4}
                  className="arena-btn arena-btn-primary px-6"
                >
                  {isLoadingChallenge ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  Load
                </button>
              </div>

              {loadError && (
                <div className="p-3 rounded-xl bg-arena-bad/10 border border-arena-bad/30 text-arena-bad text-xs">
                  {loadError}
                </div>
              )}

              {loadedChallenge && (
                <motion.div
                  className="p-5 rounded-2xl bg-white/[.03] border border-arena-accent/40 space-y-4 mt-4"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-arena-muted">Challenge Ready</div>
                      <h4 className="font-display text-xl font-bold text-arena-text mt-0.5">{loadedChallenge.title}</h4>
                      <p className="text-xs text-arena-muted mt-1">
                        Created by <span className="text-arena-accent font-semibold">{loadedChallenge.creator_name}</span>
                      </p>
                    </div>
                    <div className="font-display text-2xl font-bold arena-gradient-text tracking-widest">
                      {loadedChallenge.code}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="arena-pill px-2.5 py-1">{loadedChallenge.sport}</span>
                    <span className="arena-pill px-2.5 py-1">{loadedChallenge.difficulty}</span>
                    <span className="arena-pill px-2.5 py-1 text-arena-accent font-semibold">
                      {loadedQuestions.length} Questions
                    </span>
                  </div>

                  <button
                    onClick={playLoadedChallenge}
                    className="arena-btn arena-btn-primary w-full justify-center py-3 text-sm shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                  >
                    <Play size={16} fill="currentColor" />
                    Start This Challenge Now
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* TAB: My Saved Challenges (Persistent) */}
          {activeTab === "saved" && (
            <motion.div
              className="arena-card space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="arena-eyebrow">Local & Profile Storage</div>
                  <h3 className="font-display font-bold text-lg">My Saved Challenges</h3>
                </div>
                <span className="text-xs text-arena-muted">
                  Persists across reloads & logout
                </span>
              </div>

              {savedChallenges.length === 0 ? (
                <div className="py-12 text-center text-arena-muted text-xs border border-dashed border-arena-line rounded-2xl space-y-2">
                  <Bookmark size={24} className="mx-auto text-arena-muted/60" />
                  <p>You haven&apos;t saved any challenges yet.</p>
                  <p className="text-[11px] text-arena-muted/80">
                    Create 10 questions using Gemini AI or Manual Entry, then click &quot;Save &amp; Generate Share Code&quot;.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {savedChallenges.map((item) => (
                    <div
                      key={item.code}
                      className="p-4 rounded-2xl bg-white/[.02] border border-arena-line hover:border-arena-accent/40 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-arena-text">{item.title}</h4>
                          <div className="flex items-center gap-2 text-[11px] text-arena-muted mt-1 flex-wrap">
                            <span className="arena-pill px-2 py-0.5">{item.sport}</span>
                            {item.tournament && (
                              <span className="arena-pill px-2 py-0.5 text-arena-accent">{item.tournament}</span>
                            )}
                            <span className="arena-pill px-2 py-0.5">{item.difficulty}</span>
                            <span>• {item.question_count} Questions</span>
                            <span>• {item.created_at}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-display font-bold text-base arena-gradient-text tracking-widest px-2.5 py-1 rounded-lg bg-white/[.04] border border-arena-accent/30 inline-block">
                            {item.code}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => playSavedChallengeDirectly(item)}
                          className="arena-btn arena-btn-primary text-xs py-1.5 px-3 flex-1 justify-center"
                        >
                          <Play size={13} fill="currentColor" /> Play Now
                        </button>
                        <button
                          onClick={() => copyShareLink(item.code)}
                          className="arena-btn arena-btn-ghost text-xs py-1.5 px-3 justify-center border border-white/10"
                          title="Copy Share Link"
                        >
                          {copiedCode === item.code ? (
                            <CheckCircle2 size={13} className="text-arena-good" />
                          ) : (
                            <Copy size={13} />
                          )}
                          {copiedCode === item.code ? "Copied!" : "Copy Link"}
                        </button>
                        <button
                          onClick={() => deleteSavedChallenge(item.code)}
                          className="w-8 h-8 rounded-lg grid place-items-center hover:bg-arena-bad/10 text-arena-muted hover:text-arena-bad transition-colors"
                          title="Delete Challenge"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: Manual Question Entry */}
          {activeTab === "manual" && (
            <motion.div
              className="arena-card space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="arena-eyebrow">Manual Entry</div>
              <h3 className="font-display font-bold text-lg">Author Custom Question</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-arena-muted mb-1">Sport</label>
                  <select
                    value={manualSport}
                    onChange={(e) => setManualSport(e.target.value as Sport)}
                    className="arena-input text-sm"
                  >
                    {SPORT_LIST.map((s) => (
                      <option key={s} value={s} className="bg-arena-panel">
                        {s === "Football" ? "Football (Soccer)" : s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-arena-muted mb-1">Difficulty</label>
                  <select
                    value={manualDiff}
                    onChange={(e) => setManualDiff(e.target.value as Difficulty)}
                    className="arena-input text-sm"
                  >
                    {DIFFICULTY_LIST.map((d) => (
                      <option key={d} value={d} className="bg-arena-panel">{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-arena-muted mb-1">Question Text</label>
                <textarea
                  value={manualQ}
                  onChange={(e) => setManualQ(e.target.value)}
                  placeholder="Which player holds the record for...?"
                  className="arena-textarea text-sm"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-arena-muted mb-2">
                  4 Options (Select radio button for Correct Answer)
                </label>
                <div className="space-y-2">
                  {manualOpts.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={manualAnswer === i}
                        onChange={() => setManualAnswer(i)}
                        className="w-4 h-4 text-arena-accent accent-arena-accent"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...manualOpts];
                          next[i] = e.target.value;
                          setManualOpts(next);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        className="arena-input text-sm flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-arena-muted mb-1">Explanation</label>
                <input
                  type="text"
                  value={manualExp}
                  onChange={(e) => setManualExp(e.target.value)}
                  placeholder="Factual context explaining why this answer is correct"
                  className="arena-input text-sm"
                />
              </div>

              <button
                onClick={addManualQuestion}
                disabled={questions.length >= 10}
                className="arena-btn arena-btn-primary w-full justify-center py-2.5"
              >
                <Plus size={16} /> Add Question ({questions.length}/10)
              </button>
            </motion.div>
          )}

          {/* TAB: File Import / Export */}
          {activeTab === "file" && (
            <motion.div
              className="arena-card space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="arena-eyebrow">File System</div>
              <h3 className="font-display font-bold text-lg">Import or Export Question Decks</h3>

              <div className="flex gap-2">
                <button
                  className={`arena-btn text-xs ${fileFormat === "json" ? "arena-btn-primary" : "arena-btn-ghost"}`}
                  onClick={() => setFileFormat("json")}
                >
                  <FileJson size={14} /> JSON Format
                </button>
                <button
                  className={`arena-btn text-xs ${fileFormat === "csv" ? "arena-btn-primary" : "arena-btn-ghost"}`}
                  onClick={() => setFileFormat("csv")}
                >
                  <FileText size={14} /> CSV Format
                </button>
              </div>

              <textarea
                value={fileText}
                onChange={(e) => setFileText(e.target.value)}
                placeholder={
                  fileFormat === "json"
                    ? `[\n  {\n    "sport": "Cricket",\n    "difficulty": "Easy",\n    "question": "Who won the 2011 ICC World Cup?",\n    "options": ["India", "Sri Lanka", "Australia", "England"],\n    "answer": 0,\n    "explanation": "India won at Wankhede."\n  }\n]`
                    : `question,option_a,option_b,option_c,option_d,answer,sport,difficulty,year,explanation\nWho won the 2011 ICC World Cup?,India,Sri Lanka,Australia,England,0,Cricket,Easy,2011,India won at Wankhede.`
                }
                className="arena-textarea text-xs font-mono"
                rows={6}
              />

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  onClick={parseFileInput}
                  disabled={!fileText.trim()}
                  className="arena-btn arena-btn-primary text-xs"
                >
                  <Upload size={14} /> Validate & Append (Max 10)
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={exportAsJSON}
                    disabled={questions.length === 0}
                    className="arena-btn arena-btn-ghost text-xs"
                  >
                    <Download size={13} /> Export JSON
                  </button>
                  <button
                    onClick={exportAsCSV}
                    disabled={questions.length === 0}
                    className="arena-btn arena-btn-ghost text-xs"
                  >
                    <Download size={13} /> Export CSV
                  </button>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="arena-notice" data-variant="error">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-arena-bad mb-1">
                    <AlertTriangle size={14} /> Validation Warnings
                  </div>
                  <ul className="text-xs space-y-1 list-disc pl-4">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right: Challenge Deck & Management */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="arena-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="arena-eyebrow">Active Challenge Deck</div>
                <h3 className="font-display font-bold text-xl flex items-center gap-2">
                  <span>{questions.length}/10 Questions</span>
                  {questions.length === 10 ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-arena-good/20 text-arena-good font-semibold">
                      Deck Ready
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-arena-gold/20 text-arena-gold font-semibold">
                      Need {10 - questions.length} more
                    </span>
                  )}
                </h3>
              </div>
              <button
                onClick={() => setQuestions([])}
                disabled={questions.length === 0}
                className="text-xs text-arena-muted hover:text-arena-bad transition-colors"
              >
                Clear All
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-arena-muted mb-1">
                Challenge Title
              </label>
              <input
                type="text"
                value={challengeTitle}
                onChange={(e) => setChallengeTitle(e.target.value)}
                className="arena-input text-sm"
              />
            </div>

            {/* Questions list */}
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {questions.length === 0 ? (
                <div className="py-12 text-center text-arena-muted text-xs border border-dashed border-arena-line rounded-xl space-y-2">
                  <Sparkles size={20} className="mx-auto text-arena-accent" />
                  <p>No questions in deck yet.</p>
                  <p className="text-arena-text font-semibold">
                    Click &quot;Generate Full 10-Question Challenge&quot; on the left to prepare your round.
                  </p>
                </div>
              ) : (
                questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3 rounded-xl bg-white/[.02] border border-arena-line hover:border-arena-accent/30 transition-all text-xs space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-arena-text flex-1">
                        <span className="text-arena-accent font-bold mr-1.5">{idx + 1}.</span>
                        {q.question}
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveQuestion(idx, "up")}
                          disabled={idx === 0}
                          className="w-6 h-6 rounded grid place-items-center hover:bg-white/[.06] disabled:opacity-30"
                          title="Move Up"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          onClick={() => moveQuestion(idx, "down")}
                          disabled={idx === questions.length - 1}
                          className="w-6 h-6 rounded grid place-items-center hover:bg-white/[.06] disabled:opacity-30"
                          title="Move Down"
                        >
                          <ChevronDown size={13} />
                        </button>
                        <button
                          onClick={() => openEditModal(idx)}
                          className="w-6 h-6 rounded grid place-items-center hover:bg-white/[.06] text-arena-accent"
                          title="Edit"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => regenerateSingleQuestion(idx)}
                          disabled={regeneratingIndex === idx}
                          className="w-6 h-6 rounded grid place-items-center hover:bg-white/[.06] text-arena-accent2"
                          title="Regenerate this question with Gemini AI"
                        >
                          <RefreshCw size={13} className={regeneratingIndex === idx ? "animate-spin" : ""} />
                        </button>
                        <button
                          onClick={() => deleteQuestion(idx)}
                          className="w-6 h-6 rounded grid place-items-center hover:bg-white/[.06] text-arena-bad"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-arena-muted flex-wrap">
                      <span className="arena-pill px-1.5 py-0.5">{q.sport}</span>
                      <span className="arena-pill px-1.5 py-0.5">{q.difficulty}</span>
                      <span className="truncate">Answer: {q.options[q.answer]}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-2">
              <button
                onClick={startChallengeNow}
                disabled={questions.length !== 10}
                className="arena-btn arena-btn-primary w-full justify-center py-3 text-sm disabled:opacity-40"
              >
                <Play size={16} fill="currentColor" />
                Play This Challenge ({questions.length}/10)
              </button>

              <button
                onClick={saveAndShare}
                disabled={questions.length !== 10 || isSaving}
                className="arena-btn arena-btn-ghost w-full justify-center py-2.5 text-arena-accent border border-arena-accent/30 hover:bg-arena-accent/10 disabled:opacity-40"
              >
                {isSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Share2 size={15} />
                )}
                Save &amp; Generate Share Code (10 Qs)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Question Modal */}
      <AnimatePresence>
        {editingIndex !== null && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              className="arena-card max-w-lg w-full p-6 space-y-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg">Edit Question {editingIndex + 1}</h3>
                <button
                  onClick={() => { setEditingIndex(null); setEditForm(null); }}
                  className="w-7 h-7 rounded-full bg-white/[.06] grid place-items-center"
                >
                  <X size={14} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-arena-muted mb-1">Question</label>
                <textarea
                  value={editForm.question}
                  onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                  className="arena-textarea text-sm"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-arena-muted">Options & Correct Answer</label>
                {editForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="editAnswer"
                      checked={editForm.answer === i}
                      onChange={() => setEditForm({ ...editForm, answer: i })}
                      className="accent-arena-accent"
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...editForm.options] as [string, string, string, string];
                        next[i] = e.target.value;
                        setEditForm({ ...editForm, options: next });
                      }}
                      className="arena-input text-xs flex-1"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-arena-muted mb-1">Explanation</label>
                <input
                  type="text"
                  value={editForm.explanation}
                  onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                  className="arena-input text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => { setEditingIndex(null); setEditForm(null); }}
                  className="arena-btn arena-btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="arena-btn arena-btn-primary text-xs"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              className="arena-card max-w-md w-full text-center p-6 space-y-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="arena-eyebrow justify-center">Challenge Saved</div>
              <h3 className="font-display text-2xl font-bold">Your Challenge Code</h3>

              <div className="py-2">
                <div className="font-display text-5xl font-bold tracking-[0.16em] arena-gradient-text">
                  {challengeCode}
                </div>
              </div>

              <p className="text-xs text-arena-muted leading-relaxed">
                This challenge is saved to your profile and will stay available after reload or logout until you delete it.
                Share the code or direct play link with anyone:
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(challengeCode);
                      audio.click();
                      setCopiedCode(challengeCode);
                      setTimeout(() => setCopiedCode(null), 2500);
                    }}
                    className="arena-btn arena-btn-ghost text-xs flex-1 justify-center"
                  >
                    <Copy size={14} />
                    {copiedCode === challengeCode ? "Code Copied!" : "Copy Code"}
                  </button>
                  <button
                    onClick={() => copyShareLink(challengeCode)}
                    className="arena-btn arena-btn-primary text-xs flex-1 justify-center"
                  >
                    {copiedCode === challengeCode ? (
                      <CheckCircle2 size={14} className="text-arena-good" />
                    ) : (
                      <Share2 size={14} />
                    )}
                    {copiedCode === challengeCode ? "Link Copied!" : "Copy Direct Link"}
                  </button>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="arena-btn arena-btn-ghost text-xs w-full justify-center"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function ChallengePage() {
  return (
    <Suspense fallback={<div className="arena-container py-24 text-center text-arena-muted">Loading Challenge Studio...</div>}>
      <ChallengeContent />
    </Suspense>
  );
}
