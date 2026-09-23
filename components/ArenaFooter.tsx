import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function ArenaFooter() {
  return <footer className="site-footer"><div className="arena-container">
    <div className="footer-top"><div><Link href="/" className="site-brand">ARENA<span>.</span></Link><p>A place for people who know the game.</p></div><div className="footer-contact"><span>Questions, ideas, or a little feedback?</span><a href="mailto:abhishek.tiwarii9821@gmail.com">Ask your question <ArrowUpRight size={16}/></a><span>abhishek.tiwarii9821@gmail.com</span></div></div>
    <div className="footer-bottom"><span>Four sports. General knowledge. Your arena.</span><nav aria-label="Footer"><Link href="/methodology">Methodology</Link><Link href="/friends">Friends</Link><a href="https://www.linkedin.com/in/abhishek-tiwari-3a3594300/" target="_blank" rel="noreferrer">LinkedIn</a></nav></div>
  </div></footer>;
}
