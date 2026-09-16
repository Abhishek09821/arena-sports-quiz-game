"use client";

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
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useQuizStore } from "@/lib/store";
import {
  SPORT_LIST,
  DIFFICULTY_LIST,
  TOURNAMENTS_BY_SPORT,
  type Question,
  type Sport,
  type Difficulty,
} from "@/data/questions";
import QuizGame from "@/components/QuizGame";
import { audio } from "@/lib/audio";
import { validateQuestions, parseCSV } from "@/lib/validation";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/components/AuthContext";

type BuilderTab = "play_code" | "ai" | "manual" | "file";

function ChallengeContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Builder State
  const [activeTab, setActiveTab] = useState<BuilderTab>("play_code");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [started, setStarted] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState("Ultimate Sports Challenge");
  const [challengeCode, setChallengeCode] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
  const [copiedLink, setCopiedLink] = useState(false);

  // Tournament dropdown state
  const [selectedTournament, setSelectedTournament] = useState("All");

  // AI Generation State
  const [aiSport, setAiSport] = useState<Sport>("Cricket");
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>("Medium");
  const [aiCategory, setAiCategory] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Manual Question State
  const [manualQ, setManualQ] = useState("");
  const [manualOpts, setManualOpts] = useState(["", "", "", ""]);
  const [manualAnswer, setManualAnswer] = useState(0);
  const [manualExp, setManualExp] = useState("");
  const [manualSport, setManualSport] = useState<Sport>("Cricket");
  const [manualDiff, setManualDiff] = useState<Difficulty>("Medium");

  // Edit Modal State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Question | null>(null);

  // File Import State
  const [fileText, setFileText] = useState("");
  const [fileFormat, setFileFormat] = useState<"json" | "csv">("json");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // ── 0. Load & Play Challenge by Code ────────────────────────
  const loadChallenge = async (codeToLoad: string) => {
    const code = codeToLoad.trim().toUpperCase();
    if (!code) return;
    setIsLoadingChallenge(true);
    setLoadError(null);
    audio.click();

    try {
      const res = await fetch(`/api/challenge/${code}`);
      const data = await res.json();

      if (!res.ok || !data.challenge) {
        throw new Error(data.error || "Challenge not found. Please verify the code.");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qList: Question[] = (data.questions || []).map((q: any, i: number) => ({
        id: q.id || `chal-q-${i}`,
        sport: q.sport || data.challenge.sport || "All Sports",
        difficulty: q.difficulty || data.challenge.difficulty || "Mixed",
        year: q.year || 2024,
        question: q.question_text || q.question,
        options: Array.isArray(q.options)
          ? (q.options as [string, string, string, string])
          : [q.option_a, q.option_b, q.option_c, q.option_d],
        answer: typeof q.correct_option === "number" ? q.correct_option : (typeof q.answer === "number" ? q.answer : 0),
        explanation: q.explanation || "",
      }));

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

  const playLoadedChallenge = () => {
    if (!loadedChallenge || loadedQuestions.length === 0) return;
    audio.unlock();
    useQuizStore.getState().start(loadedQuestions, {
      sport: (loadedChallenge.sport as Sport) || "All Sports",
      difficulty: (loadedChallenge.difficulty as Difficulty) || "Mixed",
      mode: "challenge",
      sessionId: loadedChallenge.id,
    });
    trackEvent("game_started", { mode: "challenge", code: loadedChallenge.code, count: loadedQuestions.length });
    setStarted(true);
  };

  // Auto-load if code is in URL parameters (?code=XYZ123)
  useEffect(() => {
    const queryCode = searchParams.get("code");
    if (queryCode) {
      setInputCode(queryCode.toUpperCase());
      setActiveTab("play_code");
      loadChallenge(queryCode.toUpperCase());
    }
  }, [searchParams]);

  // ── 1. AI Single Question Generation ────────────────────────
  const generateOneWithAI = async () => {
    setIsGenerating(true);
    audio.click();

    try {
      const res = await fetch("/api/challenge/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: aiSport,
          difficulty: aiDifficulty,
          category: aiCategory || undefined,
          excludeStems: questions.map((q) => q.question.slice(0, 40)),
          excludeAnswers: questions.map((q) => q.options[q.answer]),
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
      alert(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── 2. AI Regenerate Specific Question ──────────────────────
  const regenerateSingleQuestion = async (index: number) => {
    setRegeneratingIndex(index);
    audio.click();

    try {
      const target = questions[index];
      const res = await fetch("/api/challenge/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: target.sport,
          difficulty: target.difficulty,
          excludeStems: questions.filter((_, i) => i !== index).map((q) => q.question.slice(0, 40)),
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
      alert(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // ── 3. Manual Question Entry ────────────────────────────────
  const addManualQuestion = () => {
    if (!manualQ.trim()) {
      alert("Please enter a question.");
      return;
    }
    if (manualOpts.some((o) => !o.trim())) {
      alert("All 4 options must be filled out.");
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

  // ── 4. Reorder & Delete ─────────────────────────────────────
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

  // ── 5. Edit Modal ───────────────────────────────────────────
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

  // ── 6. File Import & Export ─────────────────────────────────
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
          setQuestions((prev) => [...prev, ...result.questions]);
        }
        return;
      }

      setQuestions((prev) => [...prev, ...result.questions]);
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

  // ── 7. Save & Start Challenge ───────────────────────────────
  const saveAndShare = async () => {
    if (questions.length < 5) {
      alert("Please prepare at least 5 questions for your challenge.");
      return;
    }
    setIsSaving(true);

    try {
      const res = await fetch("/api/challenge/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: challengeTitle,
          questions,
          creatorName: user?.email?.split("@")[0] || "Challenger",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.code) {
        throw new Error(data.error || "Failed to save challenge to database.");
      }

      setChallengeCode(data.code);
      setShowShareModal(true);
      audio.challengeCreated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error saving challenge.");
    } finally {
      setIsSaving(false);
    }
  };

  const startChallengeNow = () => {
    if (questions.length === 0) return;
    audio.unlock();
    useQuizStore.getState().start(questions, {
      sport: "All Sports",
      difficulty: "Mixed",
      mode: "challenge",
    });
    trackEvent("challenge_created", { count: questions.length });
    setStarted(true);
  };

  if (started) return <QuizGame onExit={() => setStarted(false)} />;

  return (
    <main className="arena-container pb-20">
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
          transition={{ duration: 0.4 }}
        >
          <div className="arena-eyebrow mt-8">Challenge Studio</div>
          <h1 className="font-display text-[clamp(40px,7vw,72px)] tracking-[-0.06em] leading-[0.95] mt-2 font-bold">
            Create. Dare.<br />
            <span className="arena-gradient-text">Compete.</span>
          </h1>
          <p className="text-arena-muted max-w-[700px] mt-3 leading-relaxed">
            Build custom challenges question-by-question with AI, manual entry, or file import.
            Every question can be regenerated, edited, and shared with friends.
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Question Creator Workspace */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="arena-card p-2 flex gap-1.5 flex-wrap">
            <button
              className={`arena-btn text-xs flex-1 min-w-[120px] justify-center ${activeTab === "play_code" ? "arena-btn-primary shadow-[0_0_15px_rgba(0,212,255,0.25)]" : "arena-btn-ghost"}`}
              onClick={() => { setActiveTab("play_code"); audio.click(); }}
            >
              <KeyRound size={14} /> Play Code
            </button>
            <button
              className={`arena-btn text-xs flex-1 min-w-[120px] justify-center ${activeTab === "ai" ? "arena-btn-primary shadow-[0_0_15px_rgba(0,212,255,0.25)]" : "arena-btn-ghost"}`}
              onClick={() => { setActiveTab("ai"); audio.click(); }}
            >
              <Sparkles size={14} /> AI Generator
            </button>
            <button
              className={`arena-btn text-xs flex-1 min-w-[110px] justify-center ${activeTab === "manual" ? "arena-btn-primary shadow-[0_0_15px_rgba(0,212,255,0.25)]" : "arena-btn-ghost"}`}
              onClick={() => { setActiveTab("manual"); audio.click(); }}
            >
              <Plus size={14} /> Manual Entry
            </button>
            <button
              className={`arena-btn text-xs flex-1 min-w-[110px] justify-center ${activeTab === "file" ? "arena-btn-primary shadow-[0_0_15px_rgba(0,212,255,0.25)]" : "arena-btn-ghost"}`}
              onClick={() => { setActiveTab("file"); audio.click(); }}
            >
              <Upload size={14} /> File Import
            </button>
          </div>

          {/* TAB 0: Play by Challenge Code */}
          {activeTab === "play_code" && (
            <motion.div
              className="arena-card space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="arena-eyebrow">Play a Challenge</div>
              <h3 className="font-display font-bold text-lg">Enter 6-Digit Challenge Code</h3>
              <p className="text-xs text-arena-muted leading-relaxed">
                Enter a code shared by a creator to load their custom questions and test your skills.
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
                    <span className="arena-pill px-2.5 py-1">
                      {loadedChallenge.play_count || 0} Total Plays
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

          {/* TAB 1: AI Generator */}
          {activeTab === "ai" && (
            <motion.div
              className="arena-card space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="arena-eyebrow">AI Question Generator</div>
              <h3 className="font-display font-bold text-lg">Generate Questions One-by-One</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-arena-muted mb-1">Sport</label>
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

              {/* Tournament Selector Dropdown with Custom option */}
              <div>
                <label className="block text-xs font-semibold text-arena-muted mb-1">
                  Tournament / Competition (Dropdown or Custom)
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
                  <option value="Custom" className="bg-arena-panel">✏️ Enter Custom Tournament / Topic...</option>
                </select>

                {selectedTournament === "Custom" && (
                  <input
                    type="text"
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value)}
                    placeholder="e.g. 2011 Cricket World Cup, Wimbledon 2023, El Clásico"
                    className="arena-input text-sm"
                    autoFocus
                  />
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={generateOneWithAI}
                  disabled={isGenerating || questions.length >= 30}
                  className="arena-btn arena-btn-primary w-full justify-center py-3 shadow-[0_0_20px_rgba(0,212,255,0.2)]"
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span>Synthesizing Question with AI...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} />
                      <span>Generate Next Question ({questions.length + 1})</span>
                    </div>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Manual Question Entry */}
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
                className="arena-btn arena-btn-primary w-full justify-center py-2.5"
              >
                <Plus size={16} /> Add Question to Deck
              </button>
            </motion.div>
          )}

          {/* TAB 3: File Import / Export */}
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
                  <Upload size={14} /> Validate & Append Questions
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
                <div className="arena-eyebrow">Challenge Deck</div>
                <h3 className="font-display font-bold text-xl">
                  {questions.length} Questions Loaded
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
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {questions.length === 0 ? (
                <div className="py-12 text-center text-arena-muted text-sm border border-dashed border-arena-line rounded-xl">
                  No questions in deck yet.<br />
                  Use AI Generator or Manual Entry on the left to add questions.
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
                          title="Regenerate this question with AI"
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

                    <div className="flex items-center gap-2 text-[10px] text-arena-muted">
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
                disabled={questions.length === 0}
                className="arena-btn arena-btn-primary w-full justify-center py-3"
              >
                <Play size={16} fill="currentColor" />
                Play This Challenge Now
              </button>

              <button
                onClick={saveAndShare}
                disabled={questions.length < 5 || isSaving}
                className="arena-btn arena-btn-ghost w-full justify-center py-2.5 text-arena-accent border border-arena-accent/30 hover:bg-arena-accent/10"
              >
                {isSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Share2 size={15} />
                )}
                Save to Supabase & Generate Share Code
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
                Send this code or share the direct link with friends. They can enter it in the Challenge tab or click the link to play immediately!
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(challengeCode);
                      audio.click();
                    }}
                    className="arena-btn arena-btn-ghost text-xs flex-1 justify-center"
                  >
                    <Copy size={14} /> Copy Code
                  </button>
                  <button
                    onClick={() => {
                      const origin = typeof window !== "undefined" ? window.location.origin : "";
                      const directUrl = `${origin}/challenge?code=${challengeCode}`;
                      navigator.clipboard?.writeText(directUrl);
                      audio.click();
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    className="arena-btn arena-btn-primary text-xs flex-1 justify-center"
                  >
                    {copiedLink ? <CheckCircle2 size={14} className="text-arena-good" /> : <Share2 size={14} />}
                    {copiedLink ? "Link Copied!" : "Copy Direct Play Link"}
                  </button>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="arena-btn arena-btn-ghost text-xs w-full justify-center"
                >
                  Close
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
