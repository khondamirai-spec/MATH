"use client";

import { useState } from "react";
import PuzzlePage, { type PuzzleMode } from "@/components/puzzle/PuzzlePage";
import CalculatorGame from "@/components/puzzle/CalculatorGame";

const mathModes: PuzzleMode[] = [
  {
    title: "Calculator",
    score: 15,
    icon: "hourglass",
    subtitle: "Classic mode • Beat the clock",
    scoreLabel: "Calculator Score",
    background: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 55%, #3b82f6 100%)",
  },
  {
    title: "Guess the sign?",
    score: 0,
    icon: "question",
    subtitle: "Fill in the correct operators",
    scoreLabel: "Sign Score",
    background: "linear-gradient(135deg, #0f172a 0%, #3b82f6 60%, #6366f1 100%)",
  },
  {
    title: "Correct answer",
    score: 0,
    icon: "clipboard",
    subtitle: "Choose the right result",
    scoreLabel: "Accuracy Score",
    background: "linear-gradient(135deg, #1e1b4b 0%, #6366f1 50%, #a855f7 100%)",
  },
  {
    title: "Quick calculation",
    score: 0,
    icon: "bolt",
    subtitle: "Rapid-fire equations",
    scoreLabel: "Speed Score",
    background: "linear-gradient(135deg, #0f172a 0%, #0891b2 50%, #22d3ee 100%)",
  },
];

export default function MathPuzzlePage() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  if (activeGame === "Calculator") {
    return <CalculatorGame onBack={() => setActiveGame(null)} />;
  }

  return (
    <PuzzlePage
      eyebrow="🧩 Logic Games"
      title="Math Puzzle"
      subtitle="Train your brain with quick calculations"
      modes={mathModes}
      onPlay={(mode) => setActiveGame(mode)}
    />
  );
}
