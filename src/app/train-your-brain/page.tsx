"use client";

import { useState, useEffect } from "react";
import PuzzlePage, { type PuzzleMode } from "@/components/puzzle/PuzzlePage";
import PicturePuzzleGame from "@/components/puzzle/PicturePuzzleGame";
import MagicTriangleGame from "@/components/puzzle/MagicTriangleGame";
import NumberPyramidGame from "@/components/puzzle/NumberPyramidGame";
import { initializeUserSession } from "@/lib/userSession";
import { getUserGameRecords } from "@/lib/gamification";

const initialBrainModes: PuzzleMode[] = [
  {
    title: "Kunlik vazifa",
    subtitle: "Har kuni yangi mini vazifalar",
    icon: "sparkles",
    score: 0,
    scoreLabel: "Vazifa bali",
    background: "linear-gradient(135deg, #5b21b6 0%, #7c3aed 55%, #db2777 100%)",
  },
  {
    title: "Mantiqiy to'r",
    subtitle: "Maslahatlarni bog'la va yechimni top",
    icon: "puzzle",
    score: 0,
    scoreLabel: "Mantiq bali",
    background: "linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #c026d3 100%)",
  },
  {
    title: "Tez fikrlash",
    subtitle: "Tezkor raund • 5 soniyada javob",
    icon: "bolt",
    score: 0,
    scoreLabel: "Sprint bali",
    background: "linear-gradient(135deg, #581c87 0%, #9333ea 55%, #e11d48 100%)",
  },
];

export default function TrainYourBrainPage() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [modes, setModes] = useState<PuzzleMode[]>(initialBrainModes);

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

  if (activeGame === "Kunlik vazifa") {
    return <PicturePuzzleGame onBack={() => setActiveGame(null)} />;
  }

  if (activeGame === "Mantiqiy to'r") {
    return <MagicTriangleGame onBack={() => setActiveGame(null)} />;
  }

  if (activeGame === "Tez fikrlash") {
    return <NumberPyramidGame onBack={() => setActiveGame(null)} />;
  }

  return (
    <PuzzlePage
      eyebrow="⚡ Miya Zali"
      title="Miyangni Mashq qil"
      subtitle="E'tibor, mantiq va tezlik mashqlarini bajar"
      modes={modes}
      onPlay={(mode) => setActiveGame(mode)}
      variant="train"
    />
  );
}

