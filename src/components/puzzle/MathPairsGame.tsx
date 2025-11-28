"use client";

import { useState, useEffect, useCallback } from "react";

const GAME_DURATION = 0; // 0 means count up or no limit, usually memory games are timed or time-attack. 
// But "Record time" implies we might track time taken.
// Let's use a count-up timer or just play until finish.
// The previous games had countdowns. 
// Let's stick to the pattern: Score based on matches.

type Card = {
  id: number;
  content: string;
  value: number; // The calculated value for matching
  state: "hidden" | "selected" | "matched";
};

const generatePair = (idStart: number): Card[] => {
    const target = Math.floor(Math.random() * 20) + 1;
    const cards: Card[] = [];

    // Card 1: The number
    cards.push({
      id: idStart,
      content: target.toString(),
      value: target,
      state: "hidden",
    });

    // Card 2: An expression
    const ops = ["+", "-", "*", "/"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let expr = "";
    
    if (op === "+") {
        const a = Math.floor(Math.random() * target); 
        const b = target - a;
        expr = `${a} + ${b}`;
    } else if (op === "-") {
        const b = Math.floor(Math.random() * 10) + 1;
        const a = target + b;
        expr = `${a} - ${b}`;
    } else if (op === "*") {
        const factors = [];
        for(let i=1; i<=target; i++) {
            if (target % i === 0) factors.push(i);
        }
        const a = factors[Math.floor(Math.random() * factors.length)];
        const b = target / a;
        expr = `${a} * ${b}`;
    } else { // "/"
        const b = Math.floor(Math.random() * 5) + 1;
        const a = target * b;
        expr = `${a} / ${b}`;
    }
    
    cards.push({
      id: idStart + 1,
      content: expr,
      value: target,
      state: "hidden",
    });

    return cards;
};

const generateCards = (): Card[] => {
  const pairsCount = 6; // 3x4 grid
  let cards: Card[] = [];
  let idCounter = 0;

  for (let i = 0; i < pairsCount; i++) {
      cards = [...cards, ...generatePair(idCounter)];
      idCounter += 2;
  }
  
  // Shuffle
  return cards.sort(() => Math.random() - 0.5);
};

interface MathPairsGameProps {
  onBack: () => void;
}

const INITIAL_TIME = 60;
const PROGRESS_INTERVAL = 100;

export default function MathPairsGame({ onBack }: MathPairsGameProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isTutorialOpen, setIsTutorialOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // Initialize
  useEffect(() => {
    setCards(generateCards());
  }, []);

  // Timer
  useEffect(() => {
    if (isTutorialOpen || isGameOver) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          setIsGameOver(true);
          return 0;
        }
        return prev - (PROGRESS_INTERVAL / 1000);
      });
    }, PROGRESS_INTERVAL);

    return () => clearInterval(timer);
  }, [isTutorialOpen, isGameOver]);

  const handleCardClick = (clickedId: number) => {
    if (isProcessing || isTutorialOpen) return;
    
    const clickedCard = cards.find(c => c.id === clickedId);
    if (!clickedCard || clickedCard.state !== "hidden") return;

    // Reveal card
    setCards(prev => prev.map(c => c.id === clickedId ? { ...c, state: "selected" } : c));
    
    const newSelected = [...selectedIds, clickedId];
    setSelectedIds(newSelected);

    if (newSelected.length === 2) {
        setIsProcessing(true);
        checkMatch(newSelected[0], newSelected[1]);
    }
  };

  const checkMatch = useCallback((id1: number, id2: number) => {
    setCards(prev => {
      const card1 = prev.find(c => c.id === id1);
      const card2 = prev.find(c => c.id === id2);
      
      if (!card1 || !card2) return prev;

      const isMatch = card1.value === card2.value;

      if (isMatch) {
          // Match - update after a short delay for animation
          setTimeout(() => {
              setCards(current => current.map(c => 
                  (c.id === id1 || c.id === id2) ? { ...c, state: "matched" } : c
              ));
              setScore(s => s + 10);
              setSelectedIds([]);
              setIsProcessing(false);
          }, 500);
      } else {
          // No match - flip back after delay
          setTimeout(() => {
              setCards(current => current.map(c => 
                  (c.id === id1 || c.id === id2) ? { ...c, state: "hidden" } : c
              ));
              setScore(s => Math.max(0, s - 2)); // Penalty
              setSelectedIds([]);
              setIsProcessing(false);
          }, 1000);
      }
      
      return prev;
    });
  }, []);

  // Check if all matched, if so, generate new board
  const allMatched = cards.length > 0 && cards.every(c => c.state === "matched");
  
  useEffect(() => {
    if (allMatched && !isGameOver) {
        // Add a small delay for visual satisfaction
        setTimeout(() => {
             setCards(generateCards());
        }, 500);
    }
  }, [allMatched, isGameOver]);

  const handleRestart = () => {
    setCards(generateCards());
    setScore(0);
    setTimeLeft(INITIAL_TIME);
    setSelectedIds([]);
    setIsProcessing(false);
    setIsGameOver(false);
  };

  // Check if all matched - REMOVED since game is endless now
  // const allMatched = cards.length > 0 && cards.every(c => c.state === "matched");

  // useEffect(() => {
  //   if (allMatched) {
  //       setIsGameOver(true); // Stop timer, show win screen (which we'll reuse isGameOver for, or differentiate)
  //   }
  // }, [allMatched]);

  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden font-sans">
      {/* Top Nav */}
      <div className="relative z-30 flex items-center justify-between mb-2">
        <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--surface)] text-foreground border border-[var(--foreground-muted)]/20 shadow-sm hover:scale-105 transition-all"
            aria-label="Back"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
            </svg>
        </button>

        <div className="flex items-center gap-2 text-xl font-bold text-foreground">
          <span>💎</span>
          <span>{score}</span>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="w-full h-2 bg-[var(--surface)] rounded-full mb-4 overflow-hidden border border-[var(--foreground-muted)]/20">
        <div 
            className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-[width] duration-100 ease-linear" 
            style={{ width: `${Math.min(100, (timeLeft / INITIAL_TIME) * 100)}%` }}
        ></div>
      </div>
      
      <div className="text-center text-sm font-mono text-[var(--foreground-muted)] mb-2">
        {Math.ceil(timeLeft)}s
      </div>

      <div className="flex items-center justify-center gap-2 text-[var(--foreground-muted)] mb-8">
        <span className="uppercase tracking-widest text-sm font-semibold">MATH PAIRS</span>
        <button onClick={() => setIsTutorialOpen(true)} className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">i</button>
      </div>

       {/* Tutorial Modal */}
       <div className={`fixed inset-0 z-50 flex items-end justify-center ${isTutorialOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div 
            className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${isTutorialOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setIsTutorialOpen(false)}
        />
        <div className={`relative z-10 w-full max-w-md bg-[var(--surface)] rounded-t-[2rem] p-6 pb-8 transition-transform duration-300 ease-out transform ${isTutorialOpen ? 'translate-y-0' : 'translate-y-full'} border-t border-[var(--foreground-muted)]/10 shadow-2xl`}>
            <div className="w-12 h-1 bg-[var(--foreground-muted)] rounded-full mx-auto mb-6 opacity-30" />
            <h2 className="text-xl font-bold text-center mb-6 text-foreground">Math Pairs</h2>
            
            <p className="text-center text-[var(--foreground-muted)] text-sm mb-8 leading-relaxed px-4">
                Find pairs of cards that have the same value.<br/>
                Match a number with its math equation.<br/>
                Example: "4" matches "2 + 2"
            </p>

            <div className="flex flex-col gap-3 mb-8 px-8">
                <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">+10</span>
                    <span className="text-[var(--foreground-muted)] text-sm">for match</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">-2</span>
                    <span className="text-[var(--foreground-muted)] text-sm">for mismatch</span>
                </div>
            </div>

            <button 
                onClick={() => setIsTutorialOpen(false)}
                className="w-full py-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold tracking-wide shadow-lg shadow-orange-900/20 active:scale-95 transition-transform uppercase text-sm"
            >
                Got it!
            </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3 px-2">
        {cards.map((card) => {
          const isHidden = card.state === "hidden";
          const isMatched = card.state === "matched";
          const isSelected = card.state === "selected";
          
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={isProcessing || isMatched}
              className={`aspect-[4/5] rounded-2xl border-2 text-2xl font-bold flex items-center justify-center relative overflow-hidden ${
                isHidden
                  ? "bg-[var(--surface)] border-[var(--foreground-muted)]/20 text-[var(--foreground-muted)] hover:border-[var(--foreground-muted)]/40 transition-all duration-200 hover:scale-105 active:scale-95"
                  : isMatched
                  ? "bg-[var(--surface)]/50 border-[var(--foreground-muted)]/10 text-[var(--foreground-muted)] opacity-50 scale-95 transition-all duration-300"
                  : "bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] border-transparent text-white shadow-[0_0_15px_rgba(245,158,11,0.5)] shadow-lg shadow-orange-900/20 transition-all duration-300 scale-105 animate-in zoom-in-95"
              }`}
            >
              {isHidden ? (
                <span className="text-4xl opacity-50 select-none">?</span>
              ) : (
                <span className="animate-in fade-in zoom-in-95 duration-300">
                  {card.content.replace('*', '×').replace('/', '÷')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Win State */}
      {isGameOver && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in">
            <h2 className="text-4xl font-bold text-foreground mb-4">Time's Up!</h2>
            <p className="text-2xl text-[var(--foreground-muted)] mb-8">Score: {score}</p>
            <div className="flex gap-4">
                <button 
                    onClick={handleRestart}
                    className="px-8 py-3 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-orange-900/20"
                >
                    Play Again
                </button>
                <button 
                    onClick={onBack}
                    className="px-8 py-3 bg-[var(--surface)] text-foreground border border-[var(--foreground-muted)]/20 rounded-full font-bold hover:bg-[var(--surface)]/80 transition-colors"
                >
                    Exit
                </button>
            </div>
        </div>
      )}

    </div>
  );
}

