"use client";

import { useState } from "react";
import PuzzlePage, { type PuzzleMode } from "@/components/puzzle/PuzzlePage";
import MentalArithmeticGame from "@/components/puzzle/MentalArithmeticGame";
import MathPairsGame from "@/components/puzzle/MathPairsGame";
import MathGridGame from "@/components/puzzle/MathGridGame";
import SquareRootGame from "@/components/puzzle/SquareRootGame";

const memoryModes: PuzzleMode[] = [
  {
    title: "Mental Arithmetic",
    score: 0,
    icon: "brain",
    subtitle: "Remember and calculate",
    scoreLabel: "Memory Score",
    background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)",
  },
  {
    title: "Pattern Match",
    subtitle: "Spot card pairs in record time",
    icon: "puzzle",
    score: 28,
    scoreLabel: "Match Score",
    background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)",
  },
  {
    title: "Speed Tiles",
    subtitle: "Keep track as cards shuffle",
    icon: "sparkles",
    score: 8,
    scoreLabel: "Streak Score",
    background: "linear-gradient(130deg, #f59e0b 0%, #f97316 48%, #ef4444 100%)",
  },
  {
    title: "Square Root",
    score: 0,
    icon: "brain",
    subtitle: "Find the root of the number",
    scoreLabel: "Root Score",
    background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)",
  },
];

export default function MemoryPuzzlePage() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  if (activeGame === "Mental Arithmetic") {
    return <MentalArithmeticGame onBack={() => setActiveGame(null)} />;
  }

  if (activeGame === "Pattern Match") {
    return <MathPairsGame onBack={() => setActiveGame(null)} />;
  }

  if (activeGame === "Speed Tiles") {
    return <MathGridGame onBack={() => setActiveGame(null)} />;
  }

  if (activeGame === "Square Root") {
    return <SquareRootGame onBack={() => setActiveGame(null)} />;
  }

  return (
    <PuzzlePage
      eyebrow="🧠 MEMORY TRAINER"
      title="Memory Puzzle"
      subtitle="Sharpen recall with vibrant pattern quests"
      modes={memoryModes}
      onPlay={(mode) => setActiveGame(mode)}
      variant="memory"
    />
  );
}
