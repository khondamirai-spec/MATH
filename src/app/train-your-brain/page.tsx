"use client";

import PuzzlePage, { type PuzzleMode } from "@/components/puzzle/PuzzlePage";

const brainModes: PuzzleMode[] = [
  {
    title: "Daily Challenge",
    subtitle: "Fresh mini missions every day",
    icon: "sparkles",
    score: 4,
    scoreLabel: "Challenge Score",
    background: "linear-gradient(135deg, #5b21b6 0%, #7c3aed 55%, #db2777 100%)",
  },
  {
    title: "Logic Grid",
    subtitle: "Connect clues & crack the case",
    icon: "puzzle",
    score: 10,
    scoreLabel: "Logic Score",
    background: "linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #c026d3 100%)",
  },
  {
    title: "Mind Sprint",
    subtitle: "Speed round • answer in 5s",
    icon: "bolt",
    score: 2,
    scoreLabel: "Sprint Score",
    background: "linear-gradient(135deg, #581c87 0%, #9333ea 55%, #e11d48 100%)",
  },
  {
    title: "Focus Flow",
    subtitle: "Long-form puzzles to unwind",
    icon: "brain",
    score: 0,
    scoreLabel: "Flow Score",
    background: "linear-gradient(135deg, #3b0764 0%, #7c3aed 50%, #be185d 100%)",
  },
];

export default function TrainYourBrainPage() {
  return (
    <PuzzlePage
      eyebrow="🧠 Brain Gym"
      title="Train Your Brain"
      subtitle="Switch between focus, logic, and sprint drills"
      modes={brainModes}
    />
  );
}

