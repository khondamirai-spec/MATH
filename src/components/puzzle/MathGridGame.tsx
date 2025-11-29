"use client";

import { useState, useEffect, useCallback } from "react";

const INITIAL_TIME = 60;
const GRID_SIZE = 6; // 6x6 grid
const TOTAL_CELLS = 36;

type Cell = {
  id: number;
  value: number;
  state: "default" | "selected" | "used";
};

interface MathGridGameProps {
  onBack: () => void;
}

export default function MathGridGame({ onBack }: MathGridGameProps) {
  const [grid, setGrid] = useState<Cell[]>([]);
  const [target, setTarget] = useState(0);
  const [currentSum, setCurrentSum] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [isTutorialOpen, setIsTutorialOpen] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Initialize grid
  const generateGrid = useCallback(() => {
    const newGrid: Cell[] = [];
    for (let i = 0; i < TOTAL_CELLS; i++) {
      newGrid.push({
        id: i,
        value: Math.floor(Math.random() * 9) + 1, // 1-9
        state: "default",
      });
    }
    return newGrid;
  }, []);

  const generateTarget = useCallback((currentGrid: Cell[]) => {
    const availableCells = currentGrid.filter((c) => c.state !== "used");
    if (availableCells.length === 0) return 0;

    // Pick 2-4 random available cells to form a target
    // This ensures at least one solution exists
    const count = Math.min(availableCells.length, Math.floor(Math.random() * 3) + 2);
    const shuffled = [...availableCells].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    const sum = selected.reduce((acc, c) => acc + c.value, 0);
    return sum;
  }, []);

  // Initial setup
  useEffect(() => {
    const newGrid = generateGrid();
    setGrid(newGrid);
    setTarget(generateTarget(newGrid));
  }, [generateGrid, generateTarget]);

  // Timer
  useEffect(() => {
    if (isTutorialOpen || isGameOver) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          setIsGameOver(true);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isTutorialOpen, isGameOver]);

  // Check for refill
  useEffect(() => {
    const availableCount = grid.filter((c) => c.state !== "used").length;
    if (availableCount < 5 && !isGameOver && grid.length > 0) {
        // Refill board
        const newGrid = generateGrid();
        setGrid(newGrid);
        setTarget(generateTarget(newGrid));
        setCurrentSum(0);
    }
  }, [grid, isGameOver, generateGrid, generateTarget]);

  const handleCellClick = (id: number) => {
    if (isGameOver || isTutorialOpen) return;

    const cell = grid.find((c) => c.id === id);
    if (!cell || cell.state === "used") return;

    let newGrid = [...grid];
    let newSum = currentSum;

    if (cell.state === "selected") {
      // Deselect
      newGrid = newGrid.map((c) =>
        c.id === id ? { ...c, state: "default" } : c
      );
      newSum -= cell.value;
    } else {
      // Select
      newGrid = newGrid.map((c) =>
        c.id === id ? { ...c, state: "selected" } : c
      );
      newSum += cell.value;
    }

    setGrid(newGrid);
    setCurrentSum(newSum);

    // Check logic
    if (newSum === target) {
      // Correct!
      const scoreToAdd = 5; // Logic from screenshot: 5.0 for correct answer
      setScore((s) => s + scoreToAdd);
      setMessage("+5.0");
      
      // Mark selected as used
      setTimeout(() => {
        const nextGrid = newGrid.map((c) =>
          c.state === "selected" ? { ...c, state: "used" as const } : c
        );
        setGrid(nextGrid);
        setCurrentSum(0);
        setTarget(generateTarget(nextGrid));
        setMessage(null);
      }, 200);
    } else if (newSum > target) {
      // Wrong! Over the target
      // Penalty
      // Logic from screenshot: 5.0 for wrong answer. (Assuming penalty)
       // Or maybe it just resets? Screenshot shows "5.0 for wrong answer" which is weird if it's positive.
       // But usually it means -5.
      setScore((s) => Math.max(0, s - 5));
      setMessage("-5.0");

      setTimeout(() => {
        const nextGrid = newGrid.map((c) =>
            c.state === "selected" ? { ...c, state: "default" as const } : c
        );
        setGrid(nextGrid);
        setCurrentSum(0);
        setMessage(null);
      }, 500);
    }
  };

  const handleRestart = () => {
    const newGrid = generateGrid();
    setGrid(newGrid);
    setTarget(generateTarget(newGrid));
    setScore(0);
    setCurrentSum(0);
    setTimeLeft(INITIAL_TIME);
    setIsGameOver(false);
  };

  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden font-sans">
      {/* Header */}
      <div className="relative z-30 flex items-center justify-between mb-4">
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
          <span>{Math.round(score)}</span>
        </div>
      </div>

      {/* Target Display */}
      <div className="flex flex-col items-center justify-center mb-8">
        <button 
          onClick={() => setIsTutorialOpen(true)}
          className="text-xs font-bold text-[var(--foreground-muted)] tracking-widest mb-2 uppercase hover:text-foreground transition-colors cursor-pointer"
        >
          MATEMATIK TO'R ℹ
        </button>
        <div className="text-6xl font-bold text-foreground mb-2 transition-all scale-110">{target}</div>
        {message && (
            <div className={`text-lg font-bold ${message.includes('+') ? 'text-green-500' : 'text-red-500'} animate-pulse absolute top-32`}>
                {message}
            </div>
        )}
         <div className="h-2 w-full max-w-[200px] bg-[var(--surface)] rounded-full mt-4 overflow-hidden border border-[var(--foreground-muted)]/20">
            <div 
                className="h-full bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-100 ease-linear"
                style={{ width: `${(timeLeft / INITIAL_TIME) * 100}%` }}
            />
        </div>
      </div>


      {/* Grid */}
      <div className="grid grid-cols-6 gap-1 w-full aspect-square max-w-sm mx-auto bg-[var(--surface)]/50 p-2 rounded-xl border border-[var(--foreground-muted)]/20">
        {grid.map((cell) => (
          <button
            key={cell.id}
            onClick={() => handleCellClick(cell.id)}
            disabled={cell.state === "used"}
            className={`
              aspect-square rounded-md flex items-center justify-center text-2xl font-bold transition-all duration-150
              ${
                cell.state === "used"
                  ? "invisible"
                  : cell.state === "selected"
                  ? "bg-white text-orange-600 scale-95 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                  : "bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] text-white hover:opacity-90 active:scale-90 shadow-lg shadow-orange-900/20"
              }
            `}
          >
            {cell.value}
          </button>
        ))}
      </div>
      
      <div className="mt-4 text-center text-[var(--foreground-muted)] text-sm">
         Joriy yig'indi: <span className={`font-bold ${currentSum > target ? 'text-red-500' : 'text-foreground'}`}>{currentSum}</span>
      </div>

      {/* Tutorial Modal */}
      <div className={`fixed inset-0 z-50 flex items-end justify-center ${isTutorialOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div 
            className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${isTutorialOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setIsTutorialOpen(false)}
        />
        
        {/* Bottom Sheet */}
        <div className={`relative z-10 w-full max-w-md bg-[var(--surface)] rounded-t-[2rem] p-6 pb-8 transition-transform duration-300 ease-out transform ${isTutorialOpen ? 'translate-y-0' : 'translate-y-full'} border-t border-[var(--foreground-muted)]/10 shadow-2xl`}>
            {/* Handle */}
            <div className="w-12 h-1 bg-[var(--foreground-muted)] rounded-full mx-auto mb-6 opacity-30" />
            
            <h2 className="text-xl font-bold text-center mb-6 text-foreground">Matematik To'r</h2>
            
            <div className="bg-background p-4 rounded-xl mb-6 border border-[var(--foreground-muted)]/20">
                <div className="text-4xl font-bold text-foreground mb-4">{target || 21}</div>
                <h3 className="text-foreground font-bold text-xl mb-2">Ko'rsatilgan javobga yetish uchun<br/>to'rdan raqamlarni tanlang</h3>
                
                {/* Mini Grid Visual */}
                <div className="grid grid-cols-6 gap-1 w-full max-w-[200px] mx-auto opacity-50 mb-4">
                    {Array.from({ length: 18 }).map((_, i) => (
                        <div key={i} className="aspect-square bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] rounded-sm text-[6px] flex items-center justify-center text-white">
                            {Math.floor(Math.random()*9)+1}
                        </div>
                    ))}
                </div>
            </div>

            <p className="text-[var(--foreground-muted)] text-sm mb-6 leading-relaxed px-4">
                Yuqorida ko'rsatilgan javobga yetish uchun matematik to'rdan raqamlarni tanlang. Yuqoridagi javobga yetish uchun istalgan raqamni tanlashingiz mumkin.
            </p>

            <div className="flex flex-col gap-3 mb-8 px-8">
                <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">5.0</span>
                    <span className="text-[var(--foreground-muted)] text-sm">to'g'ri javob uchun</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">-5.0</span>
                    <span className="text-[var(--foreground-muted)] text-sm">noto'g'ri javob uchun</span>
                </div>
            </div>

            <button 
                onClick={() => setIsTutorialOpen(false)}
                className="w-full py-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold tracking-wide shadow-lg shadow-orange-900/20 active:scale-95 transition-transform uppercase text-sm"
            >
                Tushundim!
            </button>
        </div>
      </div>

      {/* Game Over / Pause Modal */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/90 backdrop-blur-md">
             <div className="bg-[var(--surface)] border border-[var(--foreground-muted)]/20 p-8 rounded-3xl w-full max-w-sm text-center">
                <h2 className="text-3xl font-bold text-foreground mb-2">{timeLeft <= 0 ? "Vaqt tugadi!" : "To'xtatildi"}</h2>
                <p className="text-xl text-[var(--foreground-muted)] mb-8">Ball: {score.toFixed(1)}</p>
                
                <div className="flex flex-col gap-3">
                    {timeLeft > 0 && (
                         <button 
                            onClick={() => setIsGameOver(false)}
                            className="w-full py-3 bg-[var(--surface)]/80 text-foreground border border-[var(--foreground-muted)]/20 font-bold rounded-full hover:bg-[var(--surface)] transition-colors"
                        >
                            Davom etish
                        </button>
                    )}
                    <button 
                        onClick={handleRestart}
                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-full hover:opacity-90 transition-opacity shadow-lg shadow-orange-900/20"
                    >
                        Yangi o'yin
                    </button>
                    <button 
                        onClick={onBack}
                        className="w-full py-3 bg-transparent border border-[var(--foreground-muted)]/20 text-foreground font-bold rounded-full hover:bg-[var(--surface)]/50 transition-colors"
                    >
                        Chiqish
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
}

