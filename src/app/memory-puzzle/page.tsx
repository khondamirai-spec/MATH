"use client";

import { useState, useEffect } from "react";
import PuzzlePage, { type PuzzleMode } from "@/components/puzzle/PuzzlePage";
import MentalArithmeticGame from "@/components/puzzle/MentalArithmeticGame";
import MathPairsGame from "@/components/puzzle/MathPairsGame";
import MathGridGame from "@/components/puzzle/MathGridGame";
import SquareRootGame from "@/components/puzzle/SquareRootGame";
import { initializeUserSession } from "@/lib/userSession";
import { getUserGameRecords } from "@/lib/gamification";

const initialMemoryModes: PuzzleMode[] = [
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
    score: 0,
    scoreLabel: "Moslik bali",
    background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)",
  },
  {
    title: "Tez plitalar",
    subtitle: "Kartochkalar aralashtiri lganda kuzatib bor",
    icon: "sparkles",
    score: 0,
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
  const [modes, setModes] = useState<PuzzleMode[]>(initialMemoryModes);

  useEffect(() => {
    if (activeGame) return;

    const fetchScores = async () => {
      const userId = await initializeUserSession('math');
      if (userId) {
        const records = await getUserGameRecords(userId);
        setModes(prevModes => prevModes.map(mode => ({
          ...mode,
          score: records[mode.title] || 0
        })));
      }
    };

    fetchScores();
  }, [activeGame]);

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
      modes={modes}
      onPlay={(mode) => setActiveGame(mode)}
      variant="memory"
    />
  );
}
