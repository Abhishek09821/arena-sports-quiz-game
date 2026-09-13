"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronRight, Clock3, RotateCcw, Volume2, X } from "lucide-react";
import { useQuizStore } from "@/lib/store";
import { audio } from "@/lib/audio";
import Link from "next/link";

const letters = ['A','B','C','D'];

export default function QuizGame({ onExit }: { onExit?: () => void }) {
  const { questions, index, score, streak, correct, wrong, selected, locked, choose, next, reset } = useQuizStore();
  const q = questions[index];
  const [time, setTime] = useState(q?.difficulty === 'Legendary' ? 16 : q?.difficulty === 'Hard' ? 20 : q?.difficulty === 'Medium' ? 25 : 30);
  const [finished, setFinished] = useState(false);

  useEffect(() => { if (!q) return; setTime(q.difficulty === 'Legendary' ? 16 : q.difficulty === 'Hard' ? 20 : q.difficulty === 'Medium' ? 25 : 30); setFinished(false); }, [index, q]);
  useEffect(() => { if (!q || locked || finished) return; const t = setInterval(() => setTime(v => v <= 1 ? 0 : v - 1), 1000); return () => clearInterval(t); }, [q, locked, finished]);
  useEffect(() => { if (!q || locked || finished) return; if (time === 10) audio.tick(); if (time > 0 && time <= 5) audio.urgentTick(); if (time === 0) { choose(-1,0); audio.wrong(); } }, [time]);
  const progress = q ? ((index + 1) / questions.length) * 100 : 0;
  const currentCorrect = locked && selected === q?.answer;
  const last = index === questions.length - 1;

  const answer = (i: number) => { if (locked) return; audio.unlock(); const ok = choose(i,time); ok ? audio.correct() : audio.wrong(); };
  const goNext = () => { audio.click(); if (last) { setFinished(true); audio.win(); } else next(); };

  if (!q && !finished) return null;
  if (finished) return <div className="center"><div className="result"><div className="eyebrow">Round complete</div><div className="result-score">{score}</div><div className="rank">{correct}/{questions.length} correct · best streak {useQuizStore.getState().bestStreak}</div><p className="muted">{correct === questions.length ? 'Perfect run. That was clinical.' : correct >= questions.length * .7 ? 'Strong run. Your sports brain is online.' : 'Good start. Another round is already calling.'}</p><div className="hero-actions" style={{justifyContent:'center'}}><button className="btn primary" onClick={() => { reset(); onExit?.(); }}><RotateCcw size={16}/>Play again</button><Link className="btn ghost" href="/"><X size={16}/>Exit</Link></div></div></div>;

  return <div className="play-wrap container">
    <div className="quiz-top"><div><div className="eyebrow">Question {index + 1} / {questions.length}</div><div className="scorebar" style={{marginTop:8}}><div className="mini">Score <b>{score}</b></div><div className="mini">Streak <b>{streak}×</b></div><div className="mini">W/L <b>{correct}/{wrong}</b></div></div></div><div className={`timer ${time <= 5 ? 'warn':''}`}><Clock3 size={17}/><span>{time}</span></div></div>
    <div className="progress"><span style={{width:`${progress}%`}} /></div>
    <AnimatePresence mode="wait"><motion.div key={q.id} className="question-card" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.24}}>
      <div className="question-meta"><span className="pill">{q.sport}</span><span className="pill">{q.year}</span><span className="pill">{q.difficulty}</span></div>
      <div className="question">{q.question}</div>
      <div className="answers">{q.options.map((option,i) => { const state = !locked ? '' : i === q.answer ? 'correct' : i === selected ? 'wrong' : 'dim'; return <motion.button key={option} whileTap={{scale:.985}} className={`answer ${state}`} onClick={() => answer(i)} disabled={locked}><span className="key">{letters[i]}</span><span>{option}</span>{locked && i===q.answer ? <Check size={18}/> : locked && i===selected ? <X size={18}/> : null}</motion.button> })}</div>
      {locked && <motion.div className="explain" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}><b>{currentCorrect ? 'Correct.' : 'Not this time.'}</b> {q.explanation}</motion.div>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:18,gap:12,flexWrap:'wrap'}}><div className="small muted"><Volume2 size={14} style={{verticalAlign:'-2px'}}/> Sound cues are subtle & optional.</div>{locked && <button className="btn primary" onClick={goNext}>{last ? 'See results' : 'Next question'} <ChevronRight size={17}/></button>}</div>
    </motion.div></AnimatePresence>
  </div>;
}
