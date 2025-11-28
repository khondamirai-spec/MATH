"use client";

import { useState, useEffect, useCallback } from "react";

interface PicturePuzzleGameProps {
  onBack: () => void;
}

type Shape = "square" | "circle" | "triangle";

interface Puzzle {
  equations: {
    shapes: Shape[];
    result: number;
  }[];
  finalEquation: {
    shapes: Shape[];
  };
  solution: {
    square: number;
    circle: number;
    triangle: number;
    finalAnswer: number;
  };
}

const generatePuzzle = (): Puzzle => {
  const square = Math.floor(Math.random() * 5) + 1;
  const circle = Math.floor(Math.random() * 5) + 1;
  const triangle = Math.floor(Math.random() * 5) + 1;

  const equations = [
    {
      shapes: ["square", "square", "square"] as Shape[],
      result: square * 3,
    },
    {
      shapes: ["square", "circle", "circle"] as Shape[],
      result: square + circle * 2,
    },
    {
      shapes: ["circle", "triangle", "triangle"] as Shape[],
      result: circle + triangle * 2,
    },
  ];

  const finalEquation = {
    shapes: ["square", "circle", "triangle"] as Shape[],
  };

  return {
    equations,
    finalEquation,
    solution: {
      square,
      circle,
      triangle,
      finalAnswer: square + circle + triangle,
    },
  };
};

const ShapeIcon = ({ shape, size = 40 }: { shape: Shape; size?: number }) => {
  const className = "stroke-[#7c3aed] stroke-[2.5] fill-none";
  
  if (shape === "square") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <rect x="3" y="3" width="18" height="18" rx="1" />
      </svg>
    );
  } else if (shape === "circle") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  } else {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <path d="M12 3L3 21h18L12 3z" />
      </svg>
    );
  }
};

const TIMER_DURATION = 40; // seconds

export default function PicturePuzzleGame({ onBack }: PicturePuzzleGameProps) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [score, setScore] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isTutorialOpen, setIsTutorialOpen] = useState(true);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);

  const loadNewPuzzle = useCallback(() => {
    setPuzzle(generatePuzzle());
    setUserAnswer("");
    setFeedback(null);
    // Don't reset timer - let it continue
  }, []);

  useEffect(() => {
    loadNewPuzzle();
  }, [loadNewPuzzle]);

  // Timer countdown - continues without resetting
  useEffect(() => {
    if (isTutorialOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - reset puzzle but keep timer going
          loadNewPuzzle();
          return TIMER_DURATION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTutorialOpen, loadNewPuzzle]);

  const handleNumberClick = (num: string) => {
    if (feedback === "correct") return;
    
    if (num === "clear") {
      setUserAnswer("");
      setFeedback(null);
    } else if (num === "backspace") {
      setUserAnswer((prev) => prev.slice(0, -1));
      setFeedback(null);
    } else {
      // Auto-submit when entering a number
      const newAnswer = userAnswer + num;
      if (newAnswer.length <= 2) {
        setUserAnswer(newAnswer);
        setFeedback(null);
        
        // Auto-check answer
        if (puzzle) {
          const answer = parseInt(newAnswer, 10);
          if (answer === puzzle.solution.finalAnswer) {
            setFeedback("correct");
            setScore((s) => s + 2);
            // Don't reset timer - let it continue
            setTimeout(() => {
              loadNewPuzzle();
            }, 1000);
          } else if (newAnswer.length === 2) {
            // Wrong answer after 2 digits
            setFeedback("wrong");
            setScore((s) => Math.max(0, s - 2));
            setTimeout(() => {
              setUserAnswer("");
              setFeedback(null);
            }, 800);
          }
        }
      }
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)] max-w-md mx-auto overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="relative z-30 flex items-center justify-between mb-2 px-4 py-3">
        <button 
          onClick={onBack}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--surface)] text-[var(--foreground)] border border-[var(--foreground-muted)]/20 shadow-md hover:scale-105 transition-all"
          aria-label="Back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-xl font-bold text-foreground">
          <span>💎</span>
          <span>{score}</span>
        </div>
      </div>

      {/* Progress Bar / Timer */}
      <div className="w-full h-2 bg-[var(--foreground-muted)]/30 relative overflow-hidden rounded-full border border-[var(--foreground-muted)]/40">
        <div 
          className="h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(139,92,246,0.5)]"
          style={{ 
            width: `${(timeLeft / TIMER_DURATION) * 100}%`,
            background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 55%, #db2777 100%)'
          }}
        />
      </div>

      {/* Game Title */}
      <button 
        onClick={() => setIsTutorialOpen(true)}
        className="flex items-center justify-center gap-2 py-4 hover:opacity-80 transition-opacity"
      >
        <span className="uppercase tracking-[0.2em] text-sm font-medium text-[var(--foreground-muted)]">Rasm Boshqotirma</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--foreground-muted)]">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>

      {/* Tutorial Modal */}
      {isTutorialOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] p-6 pb-8 rounded-t-3xl w-full max-w-md border-t border-gray-800">
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white text-center mb-4">Rasm Boshqotirma</h2>
            
            {/* Demo visual showing the game */}
            <div className="bg-black/50 p-4 rounded-xl mb-4">
              <div className="flex flex-col gap-3 items-center mb-3">
                {/* Demo equation 1: square + square + square = 9 */}
                <div className="flex items-center gap-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-[#7c3aed] stroke-[2.5] fill-none">
                    <rect x="3" y="3" width="18" height="18" rx="1" />
                  </svg>
                  <span className="text-gray-400 text-sm">+</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-[#7c3aed] stroke-[2.5] fill-none">
                    <rect x="3" y="3" width="18" height="18" rx="1" />
                  </svg>
                  <span className="text-gray-400 text-sm">+</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-[#7c3aed] stroke-[2.5] fill-none">
                    <rect x="3" y="3" width="18" height="18" rx="1" />
                  </svg>
                  <span className="text-gray-400 text-sm mx-1">=</span>
                  <span className="text-white font-bold">9</span>
                </div>
                
                {/* Demo equation 2: square + circle + circle = 7 */}
                <div className="flex items-center gap-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-[#7c3aed] stroke-[2.5] fill-none">
                    <rect x="3" y="3" width="18" height="18" rx="1" />
                  </svg>
                  <span className="text-gray-400 text-sm">+</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-[#7c3aed] stroke-[2.5] fill-none">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  <span className="text-gray-400 text-sm">+</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-[#7c3aed] stroke-[2.5] fill-none">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  <span className="text-gray-400 text-sm mx-1">=</span>
                  <span className="text-white font-bold">7</span>
                </div>
                
                {/* Demo final equation with ? */}
                <div className="flex items-center gap-2 mt-1">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-[#7c3aed] stroke-[2.5] fill-none">
                    <rect x="3" y="3" width="18" height="18" rx="1" />
                  </svg>
                  <span className="text-gray-400 text-sm">+</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-[#7c3aed] stroke-[2.5] fill-none">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  <span className="text-gray-400 text-sm mx-1">=</span>
                  <div className="w-8 h-8 rounded-full bg-[#4a4a4a] flex items-center justify-center">
                    <span className="text-gray-400 text-sm">?</span>
                  </div>
                </div>
              </div>
              
              <p className="text-white font-bold text-center text-lg">Har bir shaklning<br/>qiymatini toping</p>
            </div>
            
            <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
              Har bir shakl bir raqamni ifodalaydi. Berilgan tenglamalardan har bir shakl raqamini toping va oxirgi tenglamani yeching.
            </p>

            <div className="flex justify-center gap-8 mb-6 text-sm">
              <div><span className="text-white font-bold">2.0</span> <span className="text-gray-500">to'g'ri javob uchun</span></div>
              <div><span className="text-white font-bold">2.0</span> <span className="text-gray-500">noto'g'ri javob uchun</span></div>
            </div>

            <button 
              onClick={() => setIsTutorialOpen(false)}
              className="w-full py-4 rounded-full text-white font-bold text-lg uppercase tracking-wide active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 55%, #db2777 100%)' }}
            >
              TUSHUNDIM!
            </button>
          </div>
        </div>
      )}

      {/* Puzzle Display */}
      <div className="flex-1 flex flex-col justify-center gap-5 px-6">
        {puzzle && (
          <>
            {/* Equations */}
            {puzzle.equations.map((eq, idx) => (
              <div key={idx} className="flex items-center justify-center gap-3">
                {eq.shapes.map((shape, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <ShapeIcon shape={shape} size={40} />
                    {i < eq.shapes.length - 1 && (
                      <span className="text-white text-xl font-light">+</span>
                    )}
                  </div>
                ))}
                <span className="text-white text-xl font-light mx-2">=</span>
                <span className="text-white text-2xl font-medium w-8 text-center">{eq.result}</span>
              </div>
            ))}

            {/* Final Equation */}
            <div className="flex items-center justify-center gap-3 mt-2">
              {puzzle.finalEquation.shapes.map((shape, i) => (
                <div key={i} className="flex items-center gap-3">
                  <ShapeIcon shape={shape} size={40} />
                  {i < puzzle.finalEquation.shapes.length - 1 && (
                    <span className="text-white text-xl font-light">+</span>
                  )}
                </div>
              ))}
              <span className="text-white text-xl font-light mx-2">=</span>
              <div className="w-14 h-14 rounded-full bg-[#4a4a4a] flex items-center justify-center">
                {feedback === "correct" ? (
                  <span className="text-2xl text-green-400">✓</span>
                ) : feedback === "wrong" ? (
                  <span className="text-2xl text-red-400">✗</span>
                ) : userAnswer ? (
                  <span className="text-2xl text-white font-medium">{userAnswer}</span>
                ) : (
                  <span className="text-2xl text-gray-400">?</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="px-4 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              disabled={feedback === "correct"}
              className="h-20 rounded-2xl text-white text-3xl font-semibold shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 55%, #db2777 100%)' }}
            >
              {num}
            </button>
          ))}
          
          {/* Bottom row */}
          <button
            onClick={() => handleNumberClick("clear")}
            disabled={feedback === "correct"}
            className="h-20 rounded-2xl bg-[#2a2a2a] text-white text-base font-medium hover:bg-[#3a3a3a] active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Tozalash
          </button>
          <button
            onClick={() => handleNumberClick("0")}
            disabled={feedback === "correct"}
            className="h-20 rounded-2xl text-white text-3xl font-semibold shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 55%, #db2777 100%)' }}
          >
            0
          </button>
          <button
            onClick={() => handleNumberClick("backspace")}
            disabled={feedback === "correct"}
            className="h-20 rounded-2xl bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
