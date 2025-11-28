"use client";

import Link from "next/link";
import { CSSProperties, ReactElement, cloneElement, useEffect } from "react";

const icons = {
  hourglass: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 2h12" />
      <path d="M6 22h12" />
      <path d="M6 2v6l4 4-4 4v6" />
      <path d="M18 2v6l-4 4 4 4v6" />
    </svg>
  ),
  question: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9.09 9c.5-1.5 1.64-2.5 3.41-2.5 1.91 0 3.5 1.24 3.5 3 0 1.73-1.31 2.5-2.59 3.27-.84.5-1.41 1.09-1.41 2.23V16" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 2h6v4H9z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
    </svg>
  ),
  brain: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 2a3 3 0 0 0-3 3v1a4 4 0 0 0-3 4v2a4 4 0 0 0 4 4h2" />
      <path d="M15 2a3 3 0 0 1 3 3v1a4 4 0 0 1 3 4v2a4 4 0 0 1-4 4h-2" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </svg>
  ),
  puzzle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 5h4v4H5z" />
      <path d="M15 5h4v4h-4z" />
      <path d="M5 15h4v4H5z" />
      <path d="M14 10h6v6h-6z" />
      <path d="M10 14V4h4v6" />
      <path d="M10 20v-6" />
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="m12 3 1.2 3.4L16 7.6l-2.8 1.2L12 12l-1.2-3.2L8 7.6l2.8-1.2z" />
      <path d="M5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8z" />
      <path d="m19 13 .8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8z" />
    </svg>
  ),
} as const satisfies Record<string, ReactElement>;

type ModeIcon = keyof typeof icons;

export type PuzzleMode = {
  title: string;
  score: number;
  icon: ModeIcon;
  subtitle?: string;
  scoreLabel?: string;
  background?: string;
};

type PuzzlePageProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  modes: PuzzleMode[];
  backHref?: string;
};

type CSSVarStyles = CSSProperties & {
  "--math-card-gradient"?: string;
};

const Icon = ({ type, className }: { type: ModeIcon; className?: string }) => {
  const icon = icons[type];
  if (!icon) return null;

  return cloneElement(icon, {
    className,
  });
};

export default function PuzzlePage({ eyebrow = "🧩 Logic Games", title, subtitle, modes, backHref = "/" }: PuzzlePageProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedTheme = window.localStorage.getItem("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      const root = document.documentElement;
      root.classList.remove("theme-light", "theme-dark");
      root.classList.add(`theme-${storedTheme}`);
    }
  }, []);

  return (
    <div className="math-puzzle-page">
      <header className="math-header">
        <Link href={backHref} className="math-back-button" aria-label="Back to home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="math-header-content">
          <div className="math-header-top">
            <span className="math-eyebrow">{eyebrow}</span>
          </div>
          <h1 className="math-title">{title}</h1>
          {subtitle && (
            <p className="math-subtitle">{subtitle}</p>
          )}
        </div>
      </header>

      <main className="math-grid">
        {modes.map((mode) => {
          const style: CSSVarStyles | undefined = mode.background
            ? { "--math-card-gradient": mode.background }
            : undefined;

          return (
            <article key={mode.title} className="math-card" style={style}>
              <div className="math-card-left">
                <Icon type={mode.icon} className="math-icon" />
                <div className="math-card-text">
                  <h2>{mode.title}</h2>
                  {mode.subtitle ? <p className="math-card-subtitle">{mode.subtitle}</p> : null}
                  <div className="math-divider" />
                  <div className="math-score-line">
                    <span>{mode.scoreLabel ?? "Score"}:</span>
                    <span className="math-score-value">💎 {mode.score}</span>
                  </div>
                </div>
              </div>

              <button className="math-play-button" aria-label={`Play ${mode.title}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </article>
          );
        })}
      </main>
    </div>
  );
}

