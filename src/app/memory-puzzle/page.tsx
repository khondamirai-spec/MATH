"use client";

import { useState } from "react";
import PuzzlePage, { type PuzzleMode } from "@/components/puzzle/PuzzlePage";
import MentalArithmeticGame from "@/components/puzzle/MentalArithmeticGame";
import MathPairsGame from "@/components/puzzle/MathPairsGame";
import MathGridGame from "@/components/puzzle/MathGridGame";
import SquareRootGame from "@/components/puzzle/SquareRootGame";

const memoryModes: PuzzleMode[] = [
  {
    title: "Og'zaki hisob",
    score: 0,
    icon: "brain",
    subtitle: "Eslab qol va hisobla",
    scoreLabel: "Xotira bali",
    background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)",
  },
  {
    title: "Juftlikni top",
    subtitle: "Kartochka juftliklarini rekord vaqtda top",
    icon: "puzzle",
    score: 28,
    scoreLabel: "Moslik bali",
    background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)",
  },
  {
    title: "Tez plitalar",
    subtitle: "Kartochkalar aralashtiri lganda kuzatib bor",
    icon: "sparkles",
    score: 8,
    scoreLabel: "Ketma-ketlik bali",
    background: "linear-gradient(130deg, #f59e0b 0%, #f97316 48%, #ef4444 100%)",
  },
  {
    title: "Kvadrat ildiz",
    score: 0,
    icon: "brain",
    subtitle: "Sonning ildizini top",
    scoreLabel: "Ildiz bali",
    background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)",
  },
];

export default function MemoryPuzzlePage() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  if (activeGame === "Og'zaki hisob") {
    return <MentalArithmeticGame onBack={() => setActiveGame(null)} />;
  }

  if (activeGame === "Juftlikni top") {
    return <MathPairsGame onBack={() => setActiveGame(null)} />;
  }

  if (activeGame === "Tez plitalar") {
    return <MathGridGame onBack={() => setActiveGame(null)} />;
  }

  if (activeGame === "Kvadrat ildiz") {
    return <SquareRootGame onBack={() => setActiveGame(null)} />;
  }

  return (
    <PuzzlePage
      eyebrow="🧠 XOTIRA TRENERI"
      title="Xotira Boshqotirmasi"
      subtitle="Rang-barang namuna topshiriqlari bilan xotirangni charxla"
      modes={memoryModes}
      onPlay={(mode) => setActiveGame(mode)}
      variant="memory"
    />
  );
}
