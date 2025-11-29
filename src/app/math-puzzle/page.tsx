"use client";

import { useState, useEffect } from "react";
import PuzzlePage, { type PuzzleMode } from "@/components/puzzle/PuzzlePage";
import CalculatorGame from "@/components/puzzle/CalculatorGame";
import GuessTheSignGame from "@/components/puzzle/GuessTheSignGame";
import CorrectAnswerGame from "@/components/puzzle/CorrectAnswerGame";
import QuickCalculationGame from "@/components/puzzle/QuickCalculationGame";
import { initializeUserSession } from "@/lib/userSession";
import { getUserGameRecords } from "@/lib/gamification";

const initialMathModes: PuzzleMode[] = [
  {
    title: "Kalkulyator",
    score: 0,
    icon: "hourglass",
    subtitle: "Klassik rejim • Vaqtni yeng",
    scoreLabel: "Kalkulyator bali",
    background: "linear-gradient(135deg, #0f172a 0%, #0891b2 50%, #22d3ee 100%)",
  },
  {
    title: "Belgini top",
    score: 0,
    icon: "question",
    subtitle: "To'g'ri amalni tanlang",
    scoreLabel: "Belgi bali",
    background: "linear-gradient(135deg, #0f172a 0%, #0891b2 50%, #22d3ee 100%)",
  },
  {
    title: "To'g'ri javob",
    score: 0,
    icon: "clipboard",
    subtitle: "To'g'ri natijani tanlang",
    scoreLabel: "Aniqlik bali",
    background: "linear-gradient(135deg, #0f172a 0%, #0891b2 50%, #22d3ee 100%)",
  },
  {
    title: "Tez hisoblash",
    score: 0,
    icon: "bolt",
    subtitle: "Tezkor tenglamalar",
    scoreLabel: "Tezlik bali",
    background: "linear-gradient(135deg, #0f172a 0%, #0891b2 50%, #22d3ee 100%)",
  },
];

export default function MathPuzzlePage() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [modes, setModes] = useState<PuzzleMode[]>(initialMathModes);

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

  if (activeGame === "Kalkulyator") {
    return <CalculatorGame onBack={() => setActiveGame(null)} />;
  }

  if (activeGame === "Belgini top") {
    return <GuessTheSignGame onBack={() => setActiveGame(null)} />;
  }

  if (activeGame === "To'g'ri javob") {
    return <CorrectAnswerGame onBack={() => setActiveGame(null)} />;
  }

  if (activeGame === "Tez hisoblash") {
    return <QuickCalculationGame onBack={() => setActiveGame(null)} />;
  }

  return (
    <PuzzlePage
      eyebrow="🧩 Mantiqiy O'yinlar"
      title="Matematik Boshqotirma"
      subtitle="Tez hisob-kitoblar bilan miyangni mashq qil"
      modes={modes}
      onPlay={(mode) => setActiveGame(mode)}
    />
  );
}
