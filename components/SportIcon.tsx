import type { Sport } from "@/data/questions";

export default function SportIcon({ sport, size = 28, className = "" }: { sport: Sport | "All Sports"; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`sport-icon ${className}`}>
    {sport === "Cricket" ? <><path d="m20 4 4 4-5 5-4-4zM15 9l4 4L9 26l-6-6z"/><circle cx="25" cy="24" r="4"/><path d="m23 21 4 6"/></> :
      sport === "Football" ? <><circle cx="16" cy="16" r="12"/><path d="m16 10 6 4-2 7h-8l-2-7zM16 4v6M4 13l6 1M7 25l5-4m8 0 5 4m-3-11 6-1"/></> :
      sport === "Basketball" ? <><circle cx="16" cy="16" r="12"/><path d="M4 16h24M16 4v24M7 8c12 4 12 12 0 16M25 8c-12 4-12 12 0 16"/></> :
      sport === "WWE/WWF" ? <><path d="M5 9v18m22-18v18M5 12l11-5 11 5-11 5zM5 17l11 5 11-5M5 22l11 5 11-5M16 17v10"/><path d="m13 4 3-2 3 2"/></> :
      sport === "General Knowledge" ? <><path d="M16 8c-3-3-8-3-12-2v20c4-1 9-1 12 2 3-3 8-3 12-2V6c-4-1-9-1-12 2v20"/><path d="M8 11h4m8 0h4M8 16h4m8 0h4"/></> : <><circle cx="10" cy="10" r="5"/><circle cx="23" cy="10" r="5"/><circle cx="10" cy="23" r="5"/><circle cx="23" cy="23" r="5"/></>}
  </svg>;
}
