"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  FileUp,
  Play,
  Trash2,
  Copy,
  Share2,
  FileJson,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import Link from "next/link";
import { useQuizStore } from "@/lib/store";
import type { Question } from "@/data/questions";
import QuizGame from "@/components/QuizGame";
import { audio } from "@/lib/audio";
import { validateQuestions, parseCSV } from "@/lib/validation";
import { trackEvent } from "@/lib/analytics";

type ImportMode = "json" | "csv";

export default function ChallengePage() {
  const [text, setText] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [started, setStarted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>("json");
  const [challengeCode, setChallengeCode] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);

  const parseInput = () => {
    setErrors([]);

    try {
      let rawData: unknown[];

      if (importMode === "json") {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          setErrors(["Input must be a JSON array of question objects."]);
          return;
        }
        rawData = parsed;
      } else {
        rawData = parseCSV(text);
        if (rawData.length === 0) {
          setErrors(["No valid rows found. Check CSV format."]);
          return;
        }
      }

      const result = validateQuestions(rawData, { exactCount: 10 });

      if (!result.valid) {
        const errorMessages = result.errors.map(
          (e) =>
            `${e.index >= 0 ? `Q${e.index + 1}` : "Set"}: ${e.message}`
        );
        setErrors(errorMessages);
        // Still show valid questions
        if (result.questions.length > 0) {
          setQuestions(result.questions);
        }
        return;
      }

      setQuestions(result.questions);
      audio.challengeCreated();
    } catch (e) {
      setErrors([
        e instanceof Error
          ? e.message
          : importMode === "json"
            ? "Invalid JSON."
            : "Invalid CSV.",
      ]);
    }
  };

  const startChallenge = () => {
    if (questions.length !== 10) return;
    audio.unlock();
    useQuizStore.getState().start(questions, {
      sport: "All Sports",
      difficulty: "Mixed",
      mode: "challenge",
    });
    trackEvent("challenge_created", { questionCount: 10 });
    setStarted(true);
  };

  const generateCode = () => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    setChallengeCode(code);
    setShowShareModal(true);
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(challengeCode);
    audio.click();
  };

  if (started)
    return <QuizGame onExit={() => setStarted(false)} />;

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
          <div className="arena-eyebrow mt-8">Challenge Mode</div>
          <h1 className="font-display text-[clamp(40px,7vw,72px)] tracking-[-0.06em] leading-[0.95] mt-2 font-bold">
            Bring 10.<br />
            <span className="arena-gradient-text">Dare someone.</span>
          </h1>
          <p className="text-arena-muted max-w-[700px] mt-3 leading-relaxed">
            Import exactly 10 questions via JSON or CSV. Validate, preview, then play or share as a challenge.
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Import Panel */}
        <motion.div
          className="arena-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
        >
          <div className="arena-eyebrow">Import</div>
          <h3 className="font-display font-bold tracking-tight mt-1 mb-4 text-lg">
            Paste your question set
          </h3>

          {/* Import Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <motion.button
              className={`arena-btn text-sm ${importMode === "json" ? "arena-btn-primary" : "arena-btn-ghost"}`}
              onClick={() => setImportMode("json")}
              whileTap={{ scale: 0.96 }}
            >
              <FileJson size={15} />
              JSON
            </motion.button>
            <motion.button
              className={`arena-btn text-sm ${importMode === "csv" ? "arena-btn-primary" : "arena-btn-ghost"}`}
              onClick={() => setImportMode("csv")}
              whileTap={{ scale: 0.96 }}
            >
              <FileText size={15} />
              CSV
            </motion.button>
          </div>

          <textarea
            className="arena-textarea text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              importMode === "json"
                ? `[{\n  "sport": "Cricket",\n  "year": 2023,\n  "difficulty": "Hard",\n  "question": "...",\n  "options": ["A", "B", "C", "D"],\n  "answer": 2,\n  "explanation": "..."\n}]`
                : `question,option_a,option_b,option_c,option_d,answer,sport,difficulty,year,explanation\nWho won..?,A,B,C,D,0,Cricket,Medium,2023,Some explanation`
            }
            aria-label="Question import text"
          />

          <div className="flex gap-2 mt-3 flex-wrap">
            <motion.button
              className="arena-btn arena-btn-ghost text-sm"
              onClick={() => { setText(""); setQuestions([]); setErrors([]); }}
              whileTap={{ scale: 0.95 }}
            >
              <Trash2 size={15} />
              Clear
            </motion.button>
            <motion.button
              className="arena-btn text-sm"
              onClick={parseInput}
              disabled={text.trim().length === 0}
              whileTap={{ scale: 0.95 }}
            >
              <FileUp size={15} />
              Validate Set
            </motion.button>
          </div>

          {/* Errors */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div
                className="mt-3 arena-notice"
                data-variant="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex items-center gap-2 mb-2 text-arena-bad font-semibold text-sm">
                  <AlertTriangle size={15} />
                  Validation Issues
                </div>
                {errors.map((e, i) => (
                  <div key={i} className="text-sm">
                    • {e}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Preview Panel */}
        <motion.div
          className="arena-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="arena-eyebrow">Preview</div>
          <h3 className="font-display font-bold tracking-tight mt-1 mb-2 text-lg">
            <span className="text-arena-accent">{questions.length}</span>/10 loaded
          </h3>
          <p className="text-sm text-arena-muted mb-4">
            A challenge is fixed at 10 questions. Same scoring, timer, and feedback engine.
          </p>

          {questions.length > 0 && (
            <div className="grid gap-1.5 mb-4 max-h-[300px] overflow-y-auto pr-1">
              {questions.map((q, i) => (
                <motion.div
                  key={q.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-arena-line bg-white/[.02] text-xs"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * i, duration: 0.3 }}
                >
                  <span className="truncate max-w-[220px] font-medium">
                    <span className="text-arena-accent mr-1.5">{i + 1}.</span>
                    {q.question.slice(0, 60)}
                    {q.question.length > 60 ? "…" : ""}
                  </span>
                  <span className="flex-shrink-0 ml-2 arena-pill text-[10px]">{q.difficulty}</span>
                </motion.div>
              ))}
            </div>
          )}

          {questions.length === 0 && (
            <div className="py-10 text-center text-arena-muted text-sm border border-dashed border-arena-line rounded-xl">
              Import questions to see a preview here.
            </div>
          )}

          <div className="flex flex-col gap-2 mt-4">
            <motion.button
              className="arena-btn arena-btn-primary w-full justify-center"
              disabled={questions.length !== 10}
              onClick={startChallenge}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
            >
              <Play size={17} />
              Start Challenge
            </motion.button>

            {questions.length === 10 && (
              <motion.button
                className="arena-btn arena-btn-ghost w-full justify-center"
                onClick={generateCode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
              >
                <Share2 size={16} />
                Generate Share Code
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowShareModal(false)}
            />
            <motion.div
              className="arena-card relative z-10 w-full max-w-md text-center"
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
            >
              {/* Close button */}
              <button
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[.04] grid place-items-center hover:bg-white/[.08] transition-colors"
                onClick={() => setShowShareModal(false)}
              >
                <X size={14} />
              </button>

              <div className="arena-eyebrow mb-4 justify-center">Challenge Code</div>
              <div className="arena-glow-halo inline-block mb-5">
                <div className="font-display text-5xl font-bold tracking-[0.14em] arena-gradient-text">
                  {challengeCode}
                </div>
              </div>
              <p className="text-sm text-arena-muted mb-6 leading-relaxed">
                Share this code with your opponent. They&apos;ll need the same question set to play.
              </p>
              <div className="flex gap-2 justify-center">
                <motion.button
                  className="arena-btn arena-btn-primary"
                  onClick={copyCode}
                  whileTap={{ scale: 0.95 }}
                >
                  <Copy size={15} />
                  Copy Code
                </motion.button>
                <motion.button
                  className="arena-btn arena-btn-ghost"
                  onClick={() => setShowShareModal(false)}
                  whileTap={{ scale: 0.95 }}
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Notice */}
      <motion.div
        className="arena-notice mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <CheckCircle2 size={14} className="inline mr-1.5 align-[-2px] text-arena-accent" />
        Import validation enforces: 10 questions, 4 unique options each, valid sport, valid difficulty, no duplicates.
        CSV and JSON both supported. PDF import architecture is ready for a future update.
      </motion.div>
    </main>
  );
}
