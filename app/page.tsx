"use client";
import Link from "next/link";
import { ArrowRight, Headphones, Swords, Trophy, Zap } from "lucide-react";
import { SPORTS, QUESTIONS } from "@/data/questions";
import { audio } from "@/lib/audio";

export default function Home() {
  return <main>
    <section className="container hero">
      <div className="eyebrow">1990 → 2026 · 8 sports · zero boring screens</div>
      <h1>Think fast.<br/><span style={{color:"#71e6ff"}}>Know sport.</span></h1>
      <p>A premium sports quiz built for quick decisions, clean competition and ridiculously satisfying feedback. Pick your round, lock your answer and chase the streak.</p>
      <div className="hero-actions">
        <Link href="/play" className="btn primary" onClick={() => audio.unlock()}><Zap size={17}/>Start a game<ArrowRight size={17}/></Link>
        <Link href="/multiplayer" className="btn ghost"><Swords size={17}/>Play 1v1</Link>
        <Link href="/challenge" className="btn ghost"><Trophy size={17}/>Create challenge</Link>
      </div>
    </section>

    <section className="container section">
      <div className="section-title"><div><div className="eyebrow">The arena</div><h2>Eight sports. One scoreboard.</h2></div><div className="pill">{QUESTIONS.length} starter questions</div></div>
      <div className="grid grid-4">{SPORTS.map(s => <Link href={`/play?sport=${encodeURIComponent(s.name)}`} className="card sport-card" key={s.name} onClick={() => audio.unlock()}><div className="sport-icon">{s.icon}</div><div><h3>{s.name}</h3><div className="small muted">1990–2026 archive</div></div></Link>)}</div>
    </section>

    <section className="container section">
      <div className="grid grid-4">
        {[['5','Quick Fire','Short, sharp warm-up.'],['10','Main Event','The balanced classic.'],['15','Deep Cut','Longer run, bigger streaks.'],['20','Marathon','For people who do not quit.']].map(([n,t,d]) => <div className="card" key={n}><div className="eyebrow">{n} Q</div><h3>{t}</h3><p className="small muted">{d}</p></div>)}
      </div>
    </section>

    <section className="container section">
      <div className="card" style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'center',flexWrap:'wrap'}}><div><div className="eyebrow">Sound on, not sound spam</div><h2 style={{fontFamily:'Space Grotesk',margin:'8px 0'}}>Tactile clicks. Soft ticks. Big moments.</h2><p className="muted" style={{maxWidth:650,margin:0}}>The MVP generates lightweight UI audio in-browser: option tap, timer tick, correct, wrong, win and lose. Nothing loops until it becomes annoying.</p></div><Headphones size={30} color="#71e6ff"/></div>
    </section>

    <footer className="container footer"><div className="tagline">Built for sport obsessives</div><div style={{marginTop:10}}>Arena MVP · original starter question bank · designed to grow into a much larger verified database.</div></footer>
  </main>
}
