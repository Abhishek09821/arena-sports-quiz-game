"use client";

import { useState } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { useQuizStore } from "@/lib/store";
import { SPORT_LIST, DIFFICULTY_LIST, type Question, type Sport, type Difficulty } from "@/data/questions";
import QuizGame from "@/components/QuizGame";
import { audio } from "@/lib/audio";
import { validateQuestions, parseCSV } from "@/lib/validation";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/components/AuthContext";

type BuilderTab = "ai" | "manual" | "file";

export default function ChallengePage() {
  const { user } = useAuth();

  // Builder State
  const [activeTab, setActiveTab] = useState<BuilderTab>("ai");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [started, setStarted] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState("Ultimate Sports Challenge");

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

  // Share Modal State
  const [challengeCode, setChallengeCode] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
          <div className="arena-card p-2 flex gap-2">
            <button
              className={`arena-btn text-xs flex-1 justify-center ${activeTab === "ai" ? "arena-btn-primary" : "arena-btn-ghost"}`}
              onClick={() => { setActiveTab("ai"); audio.click(); }}
            >
              <Sparkles size={14} /> AI Generator
            </button>
            <button
              className={`arena-btn text-xs flex-1 justify-center ${activeTab === "manual" ? "arena-btn-primary" : "arena-btn-ghost"}`}
              onClick={() => { setActiveTab("manual"); audio.click(); }}
            >
              <Plus size={14} /> Manual Entry
            </button>
            <button
              className={`arena-btn text-xs flex-1 justify-center ${activeTab === "file" ? "arena-btn-primary" : "arena-btn-ghost"}`}
              onClick={() => { setActiveTab("file"); audio.click(); }}
            >
              <Upload size={14} /> File Import/Export
            </button>
          </div>

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
                    onChange={(e) => setAiSport(e.target.value as Sport)}
                    className="arena-input text-sm"
                  >
                    {SPORT_LIST.map((s) => (
                      <option key={s} value={s} className="bg-arena-panel">{s}</option>
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

              <div>
                <label className="block text-xs font-semibold text-arena-muted mb-1">
                  Specific Topic or Tournament (Optional)
                </label>
                <input
                  type="text"
                  value={aiCategory}
                  onChange={(e) => setAiCategory(e.target.value)}
                  placeholder="e.g. 2011 Cricket World Cup, Wimbledon Champions, El Clásico"
                  className="arena-input text-sm"
                />
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
                      <option key={s} value={s} className="bg-arena-panel">{s}</option>
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

              <div className="py-4">
                <div className="font-display text-5xl font-bold tracking-[0.16em] arena-gradient-text">
                  {challengeCode}
                </div>
              </div>

              <p className="text-xs text-arena-muted">
                Anyone can enter this code in the Multiplayer or Challenge section to take your custom quiz deck.
              </p>

              <div className="flex gap-2 justify-center pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(challengeCode);
                    audio.click();
                  }}
                  className="arena-btn arena-btn-primary text-xs"
                >
                  <Copy size={14} /> Copy Code
                </button>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="arena-btn arena-btn-ghost text-xs"
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
