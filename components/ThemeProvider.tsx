"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Sport } from "@/data/questions";

type Theme = "light" | "dark";
const ThemeContext = createContext({ theme: "light" as Theme, sport: "All Sports" as Sport | "All Sports", toggleTheme: () => {}, selectSport: (_sport: Sport | "All Sports") => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [sport, setSport] = useState<Sport | "All Sports">("All Sports");
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("arena-theme"); } catch { /* Keep the light default. */ }
    setTheme(saved === "light" || saved === "dark" ? saved : "light");
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  useEffect(() => { document.documentElement.dataset.sport = sport; }, [sport]);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("arena-theme", next); } catch { /* Session preference still works. */ }
  };
  return <ThemeContext.Provider value={{ theme, sport, toggleTheme, selectSport: setSport }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export function useSportTheme(sport: Sport | "All Sports") {
  const { selectSport } = useTheme();
  useEffect(() => { selectSport(sport); }, [sport, selectSport]);
}
