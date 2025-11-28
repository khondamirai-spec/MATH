"use client";

import { useState, useEffect, useCallback } from "react";

const QUESTION_DURATION = 5; // seconds per question
const PROGRESS_INTERVAL = 100; // ms
const PROGRESS_DECREMENT = PROGRESS_INTERVAL / 1000;

const buildEquation = () => {
  const operators = ["+", "-", "*", "/"] as const;
  const operator = operators[Math.floor(Math.random() * operators.length)];
  let a = Math.floor(Math.random() * 10) + 1;
  let b = Math.floor(Math.random() * 10) + 1;
  let newAnswer = 0;

  if (operator === "/") {
    newAnswer = a;
    a = a * b;
  } else if (operator === "*") {
    newAnswer = a * b;
  } else if (operator === "+") {
    newAnswer = a + b;
  } else {
    if (a < b) [a, b] = [b, a];
    newAnswer = a - b;
  }

  return {
    expression: `${a} ${operator} ${b}`,
    solution: newAnswer,
  };
};

interface CalculatorGameProps {
  onBack: () => void;
}

export default function CalculatorGame({ onBack }: CalculatorGameProps) {
  const [score, setScore] = useState(0);
  const [equation, setEquation] = useState("9 / 3");
  const [answer, setAnswer] = useState<number>(3);
  const [input, setInput] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const loadNextQuestion = useCallback(() => {
    const { expression, solution } = buildEquation();
    setEquation(expression);
    setAnswer(solution);
    setInput("");
    setTimeLeft(QUESTION_DURATION);
  }, []);

  useEffect(() => {
    if (isPaused || isTutorialOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          return 0;
        }
        const next = Number((prev - PROGRESS_DECREMENT).toFixed(2));
        return next < 0 ? 0 : next;
      });
    }, PROGRESS_INTERVAL);

    return () => clearInterval(timer);
  }, [isPaused, isTutorialOpen]);

  useEffect(() => {
    if (!isPaused && timeLeft === 0) {
      loadNextQuestion();
    }
  }, [isPaused, timeLeft, loadNextQuestion]);


  // Handle number input
  const handleNumberClick = (num: string) => {
    if (input.length < 8) { // Limit input length
      setInput((prev) => prev + num);
    }
  };

  // Handle delete (backspace)
  const handleDelete = () => {
    setInput((prev) => prev.slice(0, -1));
  };

  // Handle clear
  const handleClear = () => {
    setInput("");
  };

  // Check answer when input changes (or could be auto-submit if length matches, but usually users expect immediate feedback or enter)
  // For this UI, there is no "Enter" button, suggesting auto-check or just waiting. 
  // Usually in these games, once the correct answer is typed, it moves to next.
  // "9 / 3" is 3. If user types 3, we should probably accept it.
  useEffect(() => {
    if (input && parseInt(input, 10) === answer) {
        // Correct answer
        setScore((s) => s + 1);
        loadNextQuestion();
    }
  }, [input, answer, loadNextQuestion]);

  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
      {/* Top Navigation Bar */}
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

      {/* Progress Bar */}
      <div className="w-full h-2 bg-[var(--foreground-muted)]/20 rounded-full mb-8 overflow-hidden border border-blue-500/30">
        <div 
            className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.65)] transition-[width] duration-75 ease-linear" 
            style={{ width: `${Math.max(0, Math.min(100, (timeLeft / QUESTION_DURATION) * 100))}%` }}
        ></div>
      </div>

      {/* Game Title - Clickable for Tutorial */}
      <button 
        onClick={() => setIsTutorialOpen(true)}
        className="flex items-center justify-center gap-2 text-[var(--foreground-muted)] mb-8 hover:text-foreground transition-colors cursor-pointer w-full"
      >
        <span className="uppercase tracking-widest text-sm font-semibold">CALCULATOR</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </button>

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
            
            <h2 className="text-xl font-bold text-center mb-6 text-foreground">Quick Calculation</h2>
            
            {/* Mini Game Preview */}
            <div className="bg-background rounded-2xl p-6 mb-6 relative overflow-hidden border border-[var(--foreground-muted)]/20 mx-4 shadow-inner">
                <div className="flex justify-between items-center mb-4 opacity-50">
                    <div className="w-8 h-8 rounded-full bg-[var(--surface)] flex items-center justify-center border border-[var(--foreground-muted)]/10">
                        <span className="text-xs text-foreground">‹</span>
                    </div>
                    <div className="flex gap-2 text-xs font-bold text-foreground">
                        <span>💎</span> 0
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[var(--surface)] flex items-center justify-center border border-[var(--foreground-muted)]/10">
                        <div className="w-2 h-2 bg-foreground/50 rounded-sm"></div>
                    </div>
                </div>
                
                <div className="w-full h-1 bg-[var(--foreground-muted)]/20 rounded-full mb-6 overflow-hidden">
                    <div className="h-full w-3/4 bg-blue-500"></div>
                </div>
                
                <div className="text-center mb-2 text-[var(--foreground-muted)] text-[10px] tracking-widest uppercase">Quick Calculation</div>
                <div className="text-center text-2xl font-bold mb-2 text-foreground flex justify-center items-center gap-3">
                    6 / 3 = <div className="w-10 h-10 bg-[var(--surface)] rounded-lg border border-[var(--foreground-muted)]/20"></div>
                </div>
            </div>

            <p className="text-center text-[var(--foreground-muted)] text-sm mb-8 leading-relaxed px-4">
                Solve simple equation one by one.<br/>
                Faster you solve, more time will be<br/>
                given to solve next equation.
            </p>

            <div className="flex flex-col gap-3 mb-8 px-8">
                <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">1.0</span>
                    <span className="text-[var(--foreground-muted)] text-sm">for correct answer</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">-1.0</span>
                    <span className="text-[var(--foreground-muted)] text-sm">for wrong answer</span>
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

      {/* Problem Display */}
      <div className="flex-1 flex flex-col items-center justify-center mb-8">
        <div className="text-6xl font-bold mb-8 tracking-wider text-foreground">{equation.replace('/', '÷').replace('*', '×')}</div>
        
        {/* Answer Input Field */}
        <div className="w-full h-20 bg-[var(--surface)] rounded-2xl flex items-center justify-center text-4xl font-bold text-foreground border border-[var(--foreground-muted)]/20 shadow-sm">
            {input}
            <span className="animate-pulse text-blue-500">|</span>
        </div>
      </div>

      {/* Number Pad Grid */}
      <div className="grid grid-cols-3 gap-3 pb-6">
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
            <button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="aspect-square rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-3xl font-semibold shadow-lg shadow-blue-900/20 active:scale-95 transition-transform flex items-center justify-center"
            >
                {num}
            </button>
        ))}
        
        {/* Bottom Row */}
        <button
            onClick={handleClear}
            className="aspect-square rounded-2xl bg-[var(--surface)] hover:brightness-110 text-foreground text-xl font-medium active:scale-95 transition-transform flex items-center justify-center shadow-sm border border-[var(--foreground-muted)]/10"
        >
            Clear
        </button>
        
        <button
            onClick={() => handleNumberClick("0")}
            className="aspect-square rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-3xl font-semibold shadow-lg shadow-blue-900/20 active:scale-95 transition-transform flex items-center justify-center"
        >
            0
        </button>
        
        <button
            onClick={handleDelete}
            className="aspect-square rounded-2xl bg-[var(--surface)] hover:brightness-110 text-foreground text-2xl font-medium active:scale-95 transition-transform flex items-center justify-center shadow-sm border border-[var(--foreground-muted)]/10"
        >
            ⌫
        </button>
      </div>
    </div>
  );
}

