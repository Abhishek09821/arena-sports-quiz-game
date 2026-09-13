"use client";
import { useState } from "react";
import { ArrowLeft, FileUp, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useQuizStore } from "@/lib/store";
import type { Question } from "@/data/questions";
import QuizGame from "@/components/QuizGame";
import { audio } from "@/lib/audio";

export default function ChallengePage(){
 const [text,setText]=useState(''); const [questions,setQuestions]=useState<Question[]>([]); const [started,setStarted]=useState(false); const [error,setError]=useState('');
 const parse=()=>{setError(''); try{const data=JSON.parse(text); if(!Array.isArray(data)||data.length!==10) throw new Error('Paste exactly 10 question objects.'); const normalized=data.map((x:any,i:number)=>({id:x.id||`challenge-${Date.now()}-${i}`,sport:x.sport||'Cricket',year:Number(x.year)||2026,difficulty:x.difficulty||'Medium',question:String(x.question),options:x.options,answer:Number(x.answer),explanation:String(x.explanation||'') })); if(normalized.some(q=>q.options?.length!==4||q.answer<0||q.answer>3)) throw new Error('Each question needs 4 options and answer index 0–3.'); setQuestions(normalized); }catch(e){setError(e instanceof Error?e.message:'Invalid JSON.')} };
 const start=()=>{if(questions.length!==10)return;audio.unlock();useQuizStore.getState().start(questions,{sport:'All Sports',difficulty:'Mixed',mode:'challenge'});setStarted(true)};
 if(started)return <QuizGame onExit={()=>setStarted(false)} />;
 return <main className="container" style={{paddingBottom:70}}><div style={{padding:'45px 0 25px'}}><Link href="/" className="nav-link" style={{display:'inline-flex'}}><ArrowLeft size={16}/> Home</Link><div className="eyebrow" style={{marginTop:30}}>Challenge mode</div><h1 style={{fontFamily:'Space Grotesk',fontSize:'clamp(46px,7vw,78px)',letterSpacing:'-.06em',margin:'10px 0'}}>Bring 10. Dare someone.</h1><p className="muted" style={{maxWidth:730}}>MVP input is JSON so your custom dataset can be validated before it enters the game. Later this same contract can accept PDF/CSV imports and rewrite the questions into Arena format.</p></div>
 <div className="grid grid-2"><div className="card"><div className="eyebrow">Question set</div><h3>Paste exactly 10 questions</h3><textarea className="textarea" value={text} onChange={e=>setText(e.target.value)} placeholder={'[{\n  "sport":"Cricket",\n  "year":2023,\n  "difficulty":"Hard",\n  "question":"...",\n  "options":["A","B","C","D"],\n  "answer":2,\n  "explanation":"..."\n}]'} /><div style={{display:'flex',gap:10,marginTop:12,flexWrap:'wrap'}}><button className="btn ghost" onClick={()=>setText('')}><Trash2 size={16}/>Clear</button><button className="btn" onClick={parse}><FileUp size={16}/>Validate set</button></div>{error&&<div className="notice" style={{marginTop:12,borderColor:'rgba(255,107,122,.3)'}}>{error}</div>}</div>
 <div className="card"><div className="eyebrow">Validated</div><h3>{questions.length}/10 loaded</h3><p className="muted">A challenge is intentionally fixed at ten questions. Once the set is loaded, the same scoring, timer and feedback engine is used.</p>{questions.length>0&&<div style={{display:'grid',gap:7,marginTop:16}}>{questions.map((q,i)=><div className="pill" key={q.id} style={{justifyContent:'space-between'}}><span>{i+1}. {q.sport}</span><span>{q.difficulty}</span></div>)}</div>}<button className="btn primary" style={{marginTop:20,width:'100%',justifyContent:'center'}} disabled={questions.length!==10} onClick={start}><Play size={17}/>Start challenge</button></div></div>
 <div className="notice" style={{marginTop:16}}>Import safety rule for the production version: user-provided material should be parsed, normalized, deduplicated and fact-reviewed before becoming part of the public question bank. A private challenge set can still remain private to its room.</div>
 </main>
}
