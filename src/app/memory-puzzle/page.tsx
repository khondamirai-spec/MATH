"use client";

import PuzzlePage, { type PuzzleMode } from "@/components/puzzle/PuzzlePage";

const memoryModes: PuzzleMode[] = [
  {
    title: "Pattern Match",
    subtitle: "Spot card pairs in record time",
    icon: "puzzle",
    score: 28,
    scoreLabel: "Match Score",
    background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)",
  },
  {
    title: "Sequence Recall",
    subtitle: "Memorize flashing tiles",
    icon: "brain",
    score: 12,
    scoreLabel: "Recall Score",
    background: "linear-gradient(140deg, #f59e0b 0%, #f97316 52%, #ef4444 100%)",
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
    title: "Zen Focus",
    subtitle: "Relaxed mode • no timer",
    icon: "question",
    score: 0,
    scoreLabel: "Focus Score",
    background: "linear-gradient(150deg, #f59e0b 0%, #f97316 54%, #ef4444 100%)",
  },
];

export default function MemoryPuzzlePage() {
  return (
    <PuzzlePage
      eyebrow="🧠 Memory Trainer"
      title="Memory Puzzle"
      subtitle="Sharpen recall with vibrant pattern quests"
      modes={memoryModes}
    />
  );
}

