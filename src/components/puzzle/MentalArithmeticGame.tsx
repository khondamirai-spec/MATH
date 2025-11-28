"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const DISPLAY_DURATION = 2000; // 2 seconds per number
const INITIAL_SEQUENCE_LENGTH = 3;

type SequenceItem = {
  value: number;
  operator: "+" | "-" | "*" | "/" | "";
  display: string; // e.g. "+ 5" or "3"
};

const generateSequence = (length: number): { sequence: SequenceItem[], answer: number } => {
  const items: SequenceItem[] = [];
  let currentResult = 0;

  // First number
  const firstNum = Math.floor(Math.random() * 10) + 1; // 1-10
  currentResult = firstNum;
  items.push({ value: firstNum, operator: "", display: `${firstNum}` });

  const operators = ["+", "-", "*", "/"] as const;

  for (let i = 1; i < length; i++) {
    const op = operators[Math.floor(Math.random() * operators.length)];
    let val = Math.floor(Math.random() * 9) + 1; // 1-9

    // Simplified logic to avoid complex fractions or huge numbers for now if needed
    // For "Mental Arithmetic", usually integers are expected.
    // We need to ensure the intermediate result is manageable? 
    // The prompt says "No precedency", implying accumulation.
    
    if (op === "/") {
        // Ensure divisibility
        // Find a divisor of currentResult
        // If currentResult is 0, we can't divide (or result is 0)
        if (currentResult === 0) {
             val = Math.floor(Math.random() * 9) + 1;
             // Change op to + to avoid 0/x issue or just allow 0
             // Actually 0 / x is 0.
        } else {
             // simplistic approach: find factors
             const factors = [];
             for(let k=1; k<=Math.abs(currentResult); k++) {
                 if (currentResult % k === 0) factors.push(k);
             }
             if (factors.length > 0) {
                 val = factors[Math.floor(Math.random() * factors.length)];
             } else {
                 // Prime or something? Should handle
                 val = 1;
             }
        }
        currentResult = currentResult / val;
    } else if (op === "*") {
        val = Math.floor(Math.random() * 5) + 1; // Keep multipliers small
        currentResult = currentResult * val;
    } else if (op === "-") {
        // Allow negatives? The image shows positive numbers mostly, but let's allow negatives.
        // If we want to avoid negatives, we check.
        currentResult = currentResult - val;
    } else {
        currentResult = currentResult + val;
    }

    items.push({ value: val, operator: op, display: `${op} ${val}` });
  }

  return { sequence: items, answer: currentResult };
};

interface MentalArithmeticGameProps {
  onBack: () => void;
}

export default function MentalArithmeticGame({ onBack }: MentalArithmeticGameProps) {
  const [score, setScore] = useState(0);
  const [sequence, setSequence] = useState<SequenceItem[]>([]);
  const [targetAnswer, setTargetAnswer] = useState(0);
  
  // Game State
  const [gameState, setGameState] = useState<'tutorial' | 'ready' | 'showing' | 'input' | 'feedback'>('tutorial');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  
  // Display
  const [displayContent, setDisplayContent] = useState("");
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = useCallback(() => {
    const { sequence: newSeq, answer } = generateSequence(INITIAL_SEQUENCE_LENGTH + Math.floor(score / 5)); // Increase difficulty every 5 points
    setSequence(newSeq);
    setTargetAnswer(answer);
    setCurrentStepIndex(0);
    setGameState('ready');
    setUserInput("");
    
    // Short delay before showing first number
    setTimeout(() => {
        setGameState('showing');
    }, 1000);
  }, [score]);

  // Handle the sequence showing logic
  useEffect(() => {
    if (gameState === 'showing') {
      if (currentStepIndex < sequence.length) {
        const item = sequence[currentStepIndex];
        setDisplayContent(item.display);
        
        timerRef.current = setTimeout(() => {
            setCurrentStepIndex(prev => prev + 1);
        }, DISPLAY_DURATION);
      } else {
        // Sequence finished
        setGameState('input');
        setDisplayContent("?");
      }
    }
    return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gameState, currentStepIndex, sequence]);


  const handleNumberClick = (num: string) => {
    if (gameState !== 'input') return;
    
    // Allow negative sign at start
    if (num === '-' && userInput === "") {
        setUserInput("-");
        return;
    }
    
    if (userInput.length < 8) {
      setUserInput((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    if (gameState !== 'input') return;
    setUserInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (gameState !== 'input') return;
    setUserInput("");
  };

  // Logic to submit answer
  // We can add a submit button or auto-submit if we want, but usually "Enter" or explicit action is better for calculated numbers.
  // Since there is no "Enter" in the previous keypad, maybe we add one or use auto-check?
  // The previous game checked on change, but that's risky for multi-digit answers.
  // Let's add an "Enter" button or check if the user pauses? 
  // The provided image screenshot shows "Got it!" but that's tutorial.
  // The CalculatorGame checks automatically: `if (input && parseInt(input, 10) === answer)`
  // But here the answer might be "12" and if I type "1", it's wrong if I auto-check.
  // So we need an Enter button. I will replace one of the empty slots or add it.
  // Looking at CalculatorGame keypad, there are slots.
  // [7 8 9]
  // [4 5 6]
  // [1 2 3]
  // [Clr 0 Del]
  // I can change "Clr" to "Enter" or add a submit button below.
  // Or I can just check if the input matches the answer. BUT what if the answer is 12 and user types 1? 
  // If I check "input == answer", then typing "1" (part of "12") shouldn't trigger failure.
  // But if the answer is 1 and user types 1, it is correct.
  // If answer is 12, user types 1 -> wait. types 2 -> correct.
  // Use auto-check for CORRECT answer. 
  // But how to detect WRONG answer? 
  // "You need to remember... and write final answer".
  // If I type "1" and wait, nothing happens.
  // Maybe we need an Enter button for this game specifically.
  
  const checkAnswer = () => {
      const val = parseInt(userInput, 10);
      if (isNaN(val)) return;

      if (val === targetAnswer) {
          setScore(s => s + 2);
          // Show success feedback
          setDisplayContent("Correct!");
          setTimeout(startGame, 1000);
      } else {
          setScore(s => s - 1);
          setDisplayContent(`Wrong! (${targetAnswer})`);
          setTimeout(startGame, 2000);
      }
  };


  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
      {/* Top Nav */}
      <div className="relative z-30 flex items-center justify-between mb-2">
        <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--surface)] text-foreground border border-[var(--foreground-muted)]/20 shadow-sm hover:scale-105 transition-all"
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

      {/* Title */}
      <div className="flex items-center justify-center gap-2 text-[var(--foreground-muted)] mb-4 w-full">
        <span className="uppercase tracking-widest text-sm font-semibold">MENTAL ARITHMETIC</span>
        <button onClick={() => setGameState('tutorial')} className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">i</button>
      </div>

      {/* Tutorial Modal */}
      {gameState === 'tutorial' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => startGame()} />
            <div className="relative z-10 w-full max-w-md bg-[var(--surface)] rounded-t-[2rem] p-6 pb-8 animate-in slide-in-from-bottom duration-300">
                <div className="w-12 h-1 bg-[var(--foreground-muted)] rounded-full mx-auto mb-6 opacity-30" />
                <h2 className="text-xl font-bold text-center mb-6 text-foreground">Mental Arithmetic</h2>
                
                <div className="bg-background rounded-2xl p-6 mb-6 border border-[var(--foreground-muted)]/20 mx-4 text-center">
                    <div className="text-4xl font-bold mb-2">4</div>
                    <div className="text-sm text-[var(--foreground-muted)]">Remember the sequence</div>
                </div>

                <p className="text-center text-[var(--foreground-muted)] text-sm mb-8 leading-relaxed px-4">
                    Number with operator will be shown one by one. You need to remember the number with operator and write final answer (No precedency).
                </p>

                <div className="flex flex-col gap-3 mb-8 px-8">
                    <div className="flex justify-between items-center">
                        <span className="text-foreground font-medium">2.0</span>
                        <span className="text-[var(--foreground-muted)] text-sm">for correct answer</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-foreground font-medium">-1.0</span>
                        <span className="text-[var(--foreground-muted)] text-sm">for wrong answer</span>
                    </div>
                </div>

                <button 
                    onClick={startGame}
                    className="w-full py-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold tracking-wide shadow-lg active:scale-95 transition-transform uppercase text-sm"
                >
                    Got it!
                </button>
            </div>
        </div>
      )}

      {/* Game Display */}
      <div className="flex-1 flex flex-col items-center justify-center mb-4 relative">
        {gameState === 'ready' && (
            <div className="text-2xl text-[var(--foreground-muted)] animate-pulse">Get Ready...</div>
        )}
        
        {(gameState === 'showing' || gameState === 'input' || gameState === 'feedback') && (
            <div className={`text-6xl font-bold tracking-wider text-foreground transition-all duration-300 ${gameState === 'showing' ? 'scale-110' : 'scale-100'}`}>
                {displayContent}
            </div>
        )}
        
        {gameState === 'input' && (
             <div className="mt-8 h-16 min-w-[120px] px-6 bg-[var(--surface)] rounded-2xl flex items-center justify-center text-4xl font-bold text-foreground border border-[var(--foreground-muted)]/20 shadow-sm">
                {userInput}
                <span className="animate-pulse text-blue-500">|</span>
            </div>
        )}
      </div>

      {/* Numpad */}
      <div className={`grid grid-cols-3 gap-2 pb-4 transition-opacity duration-300 ${gameState === 'input' ? 'opacity-100 pointer-events-auto' : 'opacity-50 pointer-events-none'}`}>
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
            <button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="aspect-square rounded-xl bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] hover:opacity-90 text-white text-2xl font-semibold shadow-lg shadow-orange-900/20 active:scale-95 transition-transform flex items-center justify-center"
            >
                {num}
            </button>
        ))}
        
        <button
            onClick={handleClear}
            className="aspect-square rounded-xl bg-[var(--surface)] text-foreground text-lg font-medium active:scale-95 transition-transform flex items-center justify-center shadow-sm border border-[var(--foreground-muted)]/10"
        >
            Clear
        </button>
        
        <button
            onClick={() => handleNumberClick("0")}
            className="aspect-square rounded-xl bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] hover:opacity-90 text-white text-2xl font-semibold shadow-lg shadow-orange-900/20 active:scale-95 transition-transform flex items-center justify-center"
        >
            0
        </button>
        
        <button
            onClick={checkAnswer}
            className="aspect-square rounded-xl bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] hover:opacity-90 text-white text-xl font-medium active:scale-95 transition-transform flex items-center justify-center shadow-lg shadow-orange-900/20"
        >
            ✓
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-2 pb-4 pt-0">
         <button
            onClick={() => handleNumberClick("-")}
            className={`p-4 rounded-xl bg-[var(--surface)] text-foreground text-xl font-medium active:scale-95 transition-transform flex items-center justify-center shadow-sm border border-[var(--foreground-muted)]/10 ${userInput === "" ? "opacity-100" : "opacity-50"}`}
         >
            -
         </button>
          <button
            onClick={handleDelete}
            className="p-4 rounded-xl bg-[var(--surface)] text-foreground text-xl font-medium active:scale-95 transition-transform flex items-center justify-center shadow-sm border border-[var(--foreground-muted)]/10"
        >
            ⌫
        </button>
      </div>
    </div>
  );
}

