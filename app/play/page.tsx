"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { audio } from "@/lib/audio";
import { buildGame } from "@/lib/quiz";
import { SPORTS, type Difficulty, type Sport } from "@/data/questions";
import { useQuizStore } from "@/lib/store";
import QuizGame from "@/components/QuizGame";
import { ArrowLeft, Play, Shuffle } from "lucide-react";
import Link from "next/link";

const counts = [5,10,15,20];
const diffs: (Difficulty|"Mixed")[] = ['Mixed','Easy','Medium','Hard','Legendary'];

export default function PlayPage(){
 const params=useSearchParams(); const qs=params.get('sport'); const initial=(SPORTS.some(s=>s.name===qs)?qs:'All Sports') as Sport|'All Sports';
 const [sport,setSport]=useState<Sport|'All Sports'>(initial); const [count,setCount]=useState(10); const [difficulty,setDifficulty]=useState<Difficulty|'Mixed'>('Mixed'); const [started,setStarted]=useState(false);
 const start=()=>{audio.unlock(); useQuizStore.getState().start(buildGame({sport,difficulty,count}),{sport,difficulty,mode:'solo'}); setStarted(true)};
 if(started) return <QuizGame onExit={()=>setStarted(false)} />;
 return <main className="container" style={{paddingBottom:70}}><div style={{padding:'45px 0 25px'}}><Link href="/" className="nav-link" style={{display:'inline-flex'}}><ArrowLeft size={16}/> Home</Link><div className="eyebrow" style={{marginTop:30}}>Solo arena</div><h1 style={{fontFamily:'Space Grotesk',fontSize:'clamp(46px,7vw,78px)',letterSpacing:'-.06em',margin:'10px 0'}}>Build your round.</h1><p className="muted" style={{maxWidth:680}}>Choose the sport, question count and intensity. Every round shuffles the pool and scores speed without turning the UI into a casino.</p></div>
  <div className="grid grid-2">
   <div className="card"><div className="eyebrow">1 · Sport</div><h3>What are we playing?</h3><div className="grid grid-2" style={{marginTop:14}}><button className={`card mode-tile ${sport==='All Sports'?'active':''}`} onClick={()=>setSport('All Sports')}><b>🌐 All Sports</b><span className="small muted">Mixed archive</span></button>{SPORTS.map(s=><button key={s.name} className={`card mode-tile ${sport===s.name?'active':''}`} onClick={()=>setSport(s.name)}><b>{s.icon} {s.name}</b><span className="small muted">1990–2026</span></button>)}</div></div>
   <div className="card"><div className="eyebrow">2 · Round</div><h3>How long?</h3><div className="grid grid-4" style={{marginTop:14}}>{counts.map(n=><button key={n} className={`card mode-tile ${count===n?'active':''}`} onClick={()=>setCount(n)}><div className="stat">{n}</div><div className="small muted">questions</div></button>)}</div><div className="eyebrow" style={{marginTop:28}}>3 · Difficulty</div><div className="grid grid-2" style={{marginTop:14}}>{diffs.map(d=><button key={d} className={`card mode-tile ${difficulty===d?'active':''}`} onClick={()=>setDifficulty(d)}><b>{d==='Mixed'?'🎲 ':d==='Easy'?'🟢 ':d==='Medium'?'🟡 ':d==='Hard'?'🟠 ':'🔴 '}{d}</b><div className="small muted">{d==='Legendary'?'Deep-cut facts & pressure timing': 'Curated difficulty mix'}</div></button>)}</div></div>
  </div>
  <div className="card" style={{marginTop:16,display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}><div><div className="eyebrow">Ready?</div><h3 style={{marginBottom:4}}>{count} questions · {sport} · {difficulty}</h3><div className="small muted">Questions do not repeat inside a round.</div></div><button className="btn primary" onClick={start}><Play size={17}/>Start round</button></div>
  <div className="notice" style={{marginTop:16}}><Shuffle size={15} style={{verticalAlign:'-3px',marginRight:5}}/> Current MVP uses an original local starter bank. The database layer is designed so this can grow into thousands of verified questions without changing the game UI.</div>
 </main>
}
