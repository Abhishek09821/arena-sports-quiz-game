"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Plus,
  Search,
  Edit3,
  Trash2,
  FileUp,
  CheckCircle,
  XCircle,
  FileJson,
  FileText,
  BarChart3,
  HelpCircle,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { QUESTIONS, SPORT_LIST, DIFFICULTY_LIST, SPORT_META, type Sport, type Difficulty } from "@/data/questions";
import { validateQuestions, parseCSV } from "@/lib/validation";
import { audio } from "@/lib/audio";

type AdminTab = "dashboard" | "questions" | "add" | "import";

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSport, setFilterSport] = useState<Sport | "All">("All");
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | "All">("All");

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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mt-8">
            <Shield size={16} className="text-arena-accent" />
            <span className="arena-eyebrow">Admin Panel</span>
          </div>
          <h1 className="font-display text-[clamp(36px,6vw,60px)] tracking-[-0.06em] leading-[0.95] mt-2">
            Question Management
          </h1>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(
          [
            { id: "dashboard", icon: <BarChart3 size={15} />, label: "Dashboard" },
            { id: "questions", icon: <HelpCircle size={15} />, label: "Questions" },
            { id: "add", icon: <Plus size={15} />, label: "Add Question" },
            { id: "import", icon: <FileUp size={15} />, label: "Import" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            className={`arena-btn text-sm whitespace-nowrap ${tab === t.id ? "arena-btn-primary" : "arena-btn-ghost"}`}
            onClick={() => { setTab(t.id); audio.click(); }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {tab === "dashboard" && <DashboardTab />}

      {/* Questions List */}
      {tab === "questions" && (
        <QuestionsTab
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterSport={filterSport}
          setFilterSport={setFilterSport}
          filterDifficulty={filterDifficulty}
          setFilterDifficulty={setFilterDifficulty}
        />
      )}

      {/* Add Question */}
      {tab === "add" && <AddQuestionTab />}

      {/* Import */}
      {tab === "import" && <ImportTab />}
    </main>
  );
}

// ── Dashboard ──────────────────────────────────────────────
function DashboardTab() {
  const sportCounts = SPORT_LIST.map((sport) => ({
    sport,
    count: QUESTIONS.filter((q) => q.sport === sport).length,
    icon: SPORT_META[sport].icon,
  }));

  const diffCounts = DIFFICULTY_LIST.map((diff) => ({
    diff,
    count: QUESTIONS.filter((q) => q.difficulty === diff).length,
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="arena-card text-center py-4">
          <div className="font-display text-3xl font-bold text-arena-accent">
            {QUESTIONS.length}
          </div>
          <div className="text-xs text-arena-muted uppercase tracking-wider font-semibold mt-1">
            Total Questions
          </div>
        </div>
        <div className="arena-card text-center py-4">
          <div className="font-display text-3xl font-bold text-arena-good">
            {SPORT_LIST.length}
          </div>
          <div className="text-xs text-arena-muted uppercase tracking-wider font-semibold mt-1">
            Sports
          </div>
        </div>
        <div className="arena-card text-center py-4">
          <div className="font-display text-3xl font-bold text-arena-accent2">
            {DIFFICULTY_LIST.length}
          </div>
          <div className="text-xs text-arena-muted uppercase tracking-wider font-semibold mt-1">
            Difficulty Levels
          </div>
        </div>
        <div className="arena-card text-center py-4">
          <div className="font-display text-3xl font-bold text-arena-warn">
            1990–2026
          </div>
          <div className="text-xs text-arena-muted uppercase tracking-wider font-semibold mt-1">
            Year Range
          </div>
        </div>
      </div>

      {/* Sport breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="arena-card">
          <h3 className="font-display font-bold tracking-tight mb-4">
            Questions by Sport
          </h3>
          {sportCounts.map(({ sport, count, icon }) => (
            <div key={sport} className="flex items-center justify-between py-2 border-b border-arena-line last:border-0">
              <div className="flex items-center gap-2">
                <span>{icon}</span>
                <span className="text-sm font-medium">{sport}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 bg-white/[.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-arena-accent"
                    style={{ width: `${(count / QUESTIONS.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-arena-muted w-8 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="arena-card">
          <h3 className="font-display font-bold tracking-tight mb-4">
            Questions by Difficulty
          </h3>
          {diffCounts.map(({ diff, count }) => {
            const colors: Record<Difficulty, string> = {
              Easy: "bg-arena-good",
              Medium: "bg-arena-warn",
              Hard: "bg-orange-500",
              Legendary: "bg-arena-bad",
            };
            return (
              <div key={diff} className="flex items-center justify-between py-2 border-b border-arena-line last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${colors[diff]}`} />
                  <span className="text-sm font-medium">{diff}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-white/[.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors[diff]}`}
                      style={{ width: `${(count / QUESTIONS.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-arena-muted w-8 text-right">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── Questions List ─────────────────────────────────────────
function QuestionsTab({
  searchQuery,
  setSearchQuery,
  filterSport,
  setFilterSport,
  filterDifficulty,
  setFilterDifficulty,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterSport: Sport | "All";
  setFilterSport: (v: Sport | "All") => void;
  filterDifficulty: Difficulty | "All";
  setFilterDifficulty: (v: Difficulty | "All") => void;
}) {
  const filtered = useMemo(() => {
    return QUESTIONS.filter((q) => {
      if (filterSport !== "All" && q.sport !== filterSport) return false;
      if (filterDifficulty !== "All" && q.difficulty !== filterDifficulty) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          q.question.toLowerCase().includes(query) ||
          q.id.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [searchQuery, filterSport, filterDifficulty]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-arena-muted" />
          <input
            className="arena-input pl-9 text-sm"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="arena-select w-auto text-sm"
          value={filterSport}
          onChange={(e) => setFilterSport(e.target.value as Sport | "All")}
        >
          <option value="All">All Sports</option>
          {SPORT_LIST.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="arena-select w-auto text-sm"
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value as Difficulty | "All")}
        >
          <option value="All">All Difficulties</option>
          {DIFFICULTY_LIST.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="text-sm text-arena-muted mb-3">
        Showing {filtered.length} of {QUESTIONS.length} questions
      </div>

      {/* Question List */}
      <div className="grid gap-2">
        {filtered.slice(0, 50).map((q) => (
          <div
            key={q.id}
            className="arena-card flex items-start gap-3 py-3 px-4"
          >
            <div className="flex-shrink-0 mt-0.5">
              <span className="text-lg">{SPORT_META[q.sport]?.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{q.question}</div>
              <div className="flex gap-2 mt-1.5">
                <span className="arena-pill text-[10px]">{q.sport}</span>
                <span className="arena-pill text-[10px]">{q.difficulty}</span>
                <span className="arena-pill text-[10px]">{q.year}</span>
                <span className="arena-pill text-[10px]">{q.id}</span>
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button className="p-1.5 rounded-lg hover:bg-white/[.06] text-arena-muted hover:text-arena-text transition-colors" title="Edit">
                <Edit3 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length > 50 && (
        <div className="text-center text-sm text-arena-muted mt-4">
          Showing first 50 results. Refine your search.
        </div>
      )}
    </motion.div>
  );
}

// ── Add Question ───────────────────────────────────────────
function AddQuestionTab() {
  const [form, setForm] = useState({
    sport: "Cricket" as Sport,
    year: 2024,
    difficulty: "Medium" as Difficulty,
    question: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    answer: 0,
    explanation: "",
    source: "",
  });
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    const result = validateQuestions([
      {
        sport: form.sport,
        year: form.year,
        difficulty: form.difficulty,
        question: form.question,
        options: [form.option_a, form.option_b, form.option_c, form.option_d],
        answer: form.answer,
        explanation: form.explanation,
      },
    ]);

    if (result.valid) {
      setSuccess(true);
      audio.correct();
      // In production, this would save to Supabase
      setTimeout(() => setSuccess(false), 3000);
    } else {
      audio.wrong();
    }
  };

  return (
    <motion.div
      className="max-w-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="arena-card">
        <h3 className="font-display font-bold tracking-tight mb-4">
          Add New Question
        </h3>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1">
                Sport
              </span>
              <select
                className="arena-select text-sm"
                value={form.sport}
                onChange={(e) => setForm({ ...form, sport: e.target.value as Sport })}
              >
                {SPORT_LIST.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1">
                Difficulty
              </span>
              <select
                className="arena-select text-sm"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}
              >
                {DIFFICULTY_LIST.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1">
                Year
              </span>
              <input
                className="arena-input text-sm"
                type="number"
                min={1990}
                max={2026}
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1">
              Question
            </span>
            <textarea
              className="arena-textarea text-sm min-h-[80px]"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="Enter your question..."
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["a", "b", "c", "d"] as const).map((letter, i) => (
              <label key={letter} className="block">
                <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1">
                  Option {letter.toUpperCase()} {form.answer === i && "✓ Correct"}
                </span>
                <div className="flex gap-2">
                  <input
                    className="arena-input text-sm flex-1"
                    value={form[`option_${letter}` as keyof typeof form] as string}
                    onChange={(e) =>
                      setForm({ ...form, [`option_${letter}`]: e.target.value })
                    }
                    placeholder={`Option ${letter.toUpperCase()}`}
                  />
                  <button
                    className={`w-9 h-9 rounded-lg grid place-items-center transition-colors flex-shrink-0 ${
                      form.answer === i
                        ? "bg-arena-good/20 text-arena-good border border-arena-good/30"
                        : "bg-white/[.04] text-arena-muted border border-arena-line hover:border-arena-good/30"
                    }`}
                    onClick={() => setForm({ ...form, answer: i })}
                    title="Mark as correct"
                  >
                    <CheckCircle size={14} />
                  </button>
                </div>
              </label>
            ))}
          </div>

          <label className="block">
            <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1">
              Explanation
            </span>
            <textarea
              className="arena-textarea text-sm min-h-[60px]"
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              placeholder="Why is this the correct answer?"
            />
          </label>

          <label className="block">
            <span className="text-xs text-arena-muted uppercase tracking-wider font-bold block mb-1">
              Source (optional)
            </span>
            <input
              className="arena-input text-sm"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="Where did you verify this fact?"
            />
          </label>

          <button
            className="arena-btn arena-btn-primary w-full justify-center"
            onClick={handleSubmit}
          >
            <Plus size={16} />
            Add Question
          </button>

          {success && (
            <div className="arena-notice">
              <CheckCircle size={14} className="inline mr-1 text-arena-good align-[-2px]" />
              Question validated successfully. In production, this saves to Supabase.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Import ─────────────────────────────────────────────────
function ImportTab() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"json" | "csv">("json");
  const [results, setResults] = useState<{
    valid: boolean;
    count: number;
    errors: string[];
  } | null>(null);

  const handleValidate = () => {
    try {
      let rawData: unknown[];
      if (mode === "json") {
        rawData = JSON.parse(text);
      } else {
        rawData = parseCSV(text);
      }

      const result = validateQuestions(rawData as unknown[], { checkDuplicates: true });
      setResults({
        valid: result.valid,
        count: result.questions.length,
        errors: result.errors.map(
          (e) => `${e.index >= 0 ? `Row ${e.index + 1}` : "Set"}: ${e.message}`
        ),
      });
      audio.click();
    } catch (e) {
      setResults({
        valid: false,
        count: 0,
        errors: [e instanceof Error ? e.message : "Parse error"],
      });
    }
  };

  return (
    <motion.div
      className="max-w-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="arena-card">
        <h3 className="font-display font-bold tracking-tight mb-4">
          Bulk Import Questions
        </h3>

        <div className="flex gap-2 mb-4">
          <button
            className={`arena-btn text-sm ${mode === "json" ? "arena-btn-primary" : "arena-btn-ghost"}`}
            onClick={() => setMode("json")}
          >
            <FileJson size={15} />
            JSON
          </button>
          <button
            className={`arena-btn text-sm ${mode === "csv" ? "arena-btn-primary" : "arena-btn-ghost"}`}
            onClick={() => setMode("csv")}
          >
            <FileText size={15} />
            CSV
          </button>
        </div>

        <textarea
          className="arena-textarea text-sm font-mono"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            mode === "json"
              ? 'Paste JSON array of question objects...'
              : 'Paste CSV with headers: question,option_a,option_b,option_c,option_d,answer,sport,difficulty,year,explanation'
          }
        />

        <div className="flex gap-2 mt-3">
          <button
            className="arena-btn arena-btn-ghost text-sm"
            onClick={() => { setText(""); setResults(null); }}
          >
            <Trash2 size={15} />
            Clear
          </button>
          <button
            className="arena-btn text-sm"
            onClick={handleValidate}
            disabled={!text.trim()}
          >
            <FileUp size={15} />
            Validate & Preview
          </button>
        </div>

        {results && (
          <div className={`mt-4 arena-notice ${!results.valid ? 'border-arena-bad/30' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              {results.valid ? (
                <CheckCircle size={15} className="text-arena-good" />
              ) : (
                <XCircle size={15} className="text-arena-bad" />
              )}
              <span className="font-semibold text-sm">
                {results.valid
                  ? `${results.count} questions validated successfully`
                  : `Validation failed`}
              </span>
            </div>
            {results.errors.map((e, i) => (
              <div key={i} className="text-sm text-arena-muted">• {e}</div>
            ))}
            {results.valid && (
              <button className="arena-btn arena-btn-primary text-sm mt-3">
                <Plus size={15} />
                Import to Database
              </button>
            )}
          </div>
        )}
      </div>

      <div className="arena-notice mt-4">
        <Shield size={14} className="inline mr-1 align-[-2px]" />
        In production, imported questions go through a verification queue before becoming active.
        Duplicate detection uses normalized text hashing.
      </div>
    </motion.div>
  );
}
