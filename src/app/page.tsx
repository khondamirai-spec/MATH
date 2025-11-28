"use client";

import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [points] = useState(15);

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Header */}
      <header className="flex w-full items-center justify-between px-6 py-5">
        {/* Trophy Badge */}
        <div className="trophy-badge flex items-center gap-2 rounded-full px-4 py-2">
          <span className="text-xl">💎</span>
          <span className="text-lg font-semibold text-[color:var(--foreground)]">
            {points}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center px-6 pt-8">
        {/* Title Section */}
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-[color:var(--foreground)] md:text-5xl">
            Logika AI
          </h1>
          <p className="text-base text-[color:var(--foreground-muted)] md:text-lg">
            Miyangni charxla va Logikangni oshir !
          </p>
        </div>

        {/* Game Buttons */}
        <div className="flex w-full max-w-md flex-col gap-5">
          {/* Math Puzzle Button */}
          <Link
            href="/math-puzzle"
            className="game-btn btn-math-puzzle relative flex h-28 w-full items-center justify-center gap-3 rounded-3xl px-6 text-[color:var(--foreground)]"
          >
            {/* Decorative calculator icon in background */}
            <div className="btn-decoration left-2 top-1/2 -translate-y-1/2 text-8xl opacity-50">
              <svg
                width="120"
                height="120"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="opacity-80"
              >
                <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h3v3H8V8zm5 0h3v3h-3V8zm-5 5h3v3H8v-3zm5 0h3v3h-3v-3z" />
              </svg>
            </div>
            
            {/* Icon */}
            <div className="z-10 flex h-10 w-10 items-center justify-center rounded-lg border-2 border-white/30">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            
            <span className="z-10 text-2xl font-semibold md:text-3xl">
              Math Puzzle
            </span>
            
            {/* Progress bar */}
            <div className="progress-bar"></div>
          </Link>

          {/* Memory Puzzle Button */}
          <Link
            href="/memory-puzzle"
            className="game-btn btn-memory-puzzle relative flex h-28 w-full items-center justify-center gap-3 rounded-3xl px-6 text-[color:var(--foreground)]"
          >
            {/* Decorative clock icon in background */}
            <div className="btn-decoration left-2 top-1/2 -translate-y-1/2 text-8xl opacity-50">
              <svg
                width="120"
                height="120"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="opacity-80"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            
            {/* Icon */}
            <div className="z-10">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            
            <span className="z-10 text-2xl font-semibold md:text-3xl">
              Memory Puzzle
            </span>
            
            {/* Progress bar */}
            <div className="progress-bar"></div>
          </Link>

          {/* Train Your Brain Button */}
          <Link
            href="/train-your-brain"
            className="game-btn btn-train-brain relative flex h-28 w-full items-center justify-center gap-3 rounded-3xl px-6 text-[color:var(--foreground)]"
          >
            {/* Decorative brain icon in background */}
            <div className="btn-decoration left-2 top-1/2 -translate-y-1/2 text-8xl opacity-50">
              <svg
                width="120"
                height="120"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="opacity-80"
              >
                <path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0-4 4v2a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-2a4 4 0 0 0-4-4V6a4 4 0 0 0-4-4z" />
              </svg>
            </div>
            
            {/* Icon */}
            <div className="z-10">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="5" r="3" />
                <path d="M12 8v4" />
                <circle cx="12" cy="15" r="3" />
                <path d="M8 12h8" />
                <path d="M12 18v3" />
                <path d="M9 21h6" />
              </svg>
            </div>
            
            <span className="z-10 text-2xl font-semibold md:text-3xl">
              Train Your Brain
            </span>
            
            {/* Progress bar */}
            <div className="progress-bar"></div>
          </Link>
        </div>
      </main>
    </div>
  );
}
