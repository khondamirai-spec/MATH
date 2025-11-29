"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Create a "tin tin" bell sound using Web Audio API
const playTinTinSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    const playTin = (startTime: number, frequency: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    };
    
    const now = audioContext.currentTime;
    playTin(now, 880);
    playTin(now + 0.15, 1108.73);
    
    setTimeout(() => {
      audioContext.close();
    }, 500);
  } catch {
    // Audio not supported, fail silently
  }
};

const QUESTION_DURATION = 5; // seconds per question
const PROGRESS_INTERVAL = 100; // ms
const PROGRESS_DECREMENT = PROGRESS_INTERVAL / 1000;

const buildEquation = () => {
  const operators = ["+", "-", "*", "/"] as const;
  const operator = operators[Math.floor(Math.random() * operators.length)];
  let a = Math.floor(Math.random() * 10) + 1;
  let b = Math.floor(Math.random() * 10) + 1;
  let result = 0;

  if (operator === "/") {
    // Ensure clean division
    result = a;
    a = a * b;
  } else if (operator === "*") {
    result = a * b;
  } else if (operator === "+") {
    result = a + b;
  } else {
    if (a < b) [a, b] = [b, a];
    result = a - b;
  }

  return {
    a,
    b,
    operator,
    result,
  };
};

interface GuessTheSignGameProps {
  onBack: () => void;
}

export default function GuessTheSignGame({ onBack }: GuessTheSignGameProps) {
  const [score, setScore] = useState(0);
  const [question, setQuestion] = useState<{ a: number; b: number; operator: string; result: number } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
  const [isTutorialOpen, setIsTutorialOpen] = useState(true);
  const isFirstLoad = useRef(true);

  const loadNextQuestion = useCallback((playSound: boolean = true) => {
    setQuestion(buildEquation());
    setTimeLeft(QUESTION_DURATION);
    if (playSound) {
      playTinTinSound();
    }
  }, []);

  useEffect(() => {
    loadNextQuestion();
  }, [loadNextQuestion]);

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

  const handleOperatorClick = (selectedOp: string) => {
    if (!question) return;

    if (selectedOp === question.operator) {
      setScore((s) => s + 1);
      loadNextQuestion();
    } else {
        // Wrong answer logic - for now just skip or maybe deduct?
        // Following CalculatorGame logic: -1 for wrong answer?
        // But usually immediate feedback is better. 
        // Let's just move to next for now, or maybe shake effect?
        // CalculatorGame logic: "Faster you solve... 1.0 for correct -1.0 for wrong"
        // But the CalculatorGame code actually doesn't seem to deduct for wrong answer explicitly in the provided snippet (it handles input matching).
        // Actually, the snippet text says "-1.0 for wrong answer".
        // I will implement deduction.
        setScore((s) => Math.max(0, s - 1));
        // Optional: Feedback
        loadNextQuestion();
    }
  };

  if (!question) return null;

  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
      {/* Top Navigation Bar - Copied from CalculatorGame */}
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
        <span className="uppercase tracking-widest text-sm font-semibold">BELGINI TOP</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </button>

      {/* Tutorial Modal */}
      <div className={`fixed inset-0 z-50 flex items-end justify-center ${isTutorialOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div 
            className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${isTutorialOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setIsTutorialOpen(false)}
        />
        
        <div className={`relative z-10 w-full max-w-md bg-[var(--surface)] rounded-t-[2rem] p-6 pb-8 transition-transform duration-300 ease-out transform ${isTutorialOpen ? 'translate-y-0' : 'translate-y-full'} border-t border-[var(--foreground-muted)]/10 shadow-2xl`}>
            <div className="w-12 h-1 bg-[var(--foreground-muted)] rounded-full mx-auto mb-6 opacity-30" />
            
            <h2 className="text-xl font-bold text-center mb-4 text-foreground">Belgini Top</h2>
            
            {/* Mini Game Preview */}
            <div className="bg-background rounded-2xl p-5 mb-5 relative overflow-hidden border border-[var(--foreground-muted)]/20 mx-2 shadow-inner">
                <div className="flex justify-between items-center mb-3 opacity-50">
                    <div className="w-7 h-7 rounded-full bg-[var(--surface)] flex items-center justify-center border border-[var(--foreground-muted)]/10">
                        <span className="text-xs text-foreground">‹</span>
                    </div>
                    <div className="flex gap-1 text-xs font-bold text-foreground">
                        <span>💎</span> 0
                    </div>
                </div>
                
                <div className="w-full h-1 bg-[var(--foreground-muted)]/20 rounded-full mb-4 overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500"></div>
                </div>
                
                <div className="text-center mb-2 text-[var(--foreground-muted)] text-[10px] tracking-widest uppercase">Belgini Top</div>
                
                {/* Sample Equation Display */}
                <div className="text-center text-2xl font-bold mb-4 text-foreground flex justify-center items-center gap-2">
                    <span>6</span>
                    <div className="w-8 h-8 bg-[var(--surface)] rounded-lg border border-[var(--foreground-muted)]/20 flex items-center justify-center">
                        <span className="text-base text-[var(--foreground-muted)]">?</span>
                    </div>
                    <span>3</span>
                    <span>=</span>
                    <span>2</span>
                </div>
                
                {/* Mini Operator Buttons */}
                <div className="grid grid-cols-4 gap-2 px-4">
                    {["÷", "×", "+", "−"].map((op) => (
                        <div 
                            key={op}
                            className="aspect-square rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-sm font-bold flex items-center justify-center shadow-sm"
                        >
                            {op}
                        </div>
                    ))}
                </div>
            </div>

            <p className="text-center text-[var(--foreground-muted)] text-sm mb-6 leading-relaxed px-4">
                Tenglamani to'ldiruvchi to'g'ri<br/>
                matematik amalni aniqlang.<br/>
                Ko'proq ball yig'ish uchun tez bo'ling!
            </p>
            
            <div className="flex flex-col gap-2 mb-6 px-8">
                <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">+1.0</span>
                    <span className="text-[var(--foreground-muted)] text-sm">to'g'ri javob uchun</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">-1.0</span>
                    <span className="text-[var(--foreground-muted)] text-sm">noto'g'ri javob uchun</span>
                </div>
            </div>

            <button 
                onClick={() => {
                  setIsTutorialOpen(false);
                  if (isFirstLoad.current) {
                    isFirstLoad.current = false;
                    playTinTinSound();
                  }
                }}
                className="w-full py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold tracking-wide shadow-lg shadow-blue-900/20 active:scale-95 transition-transform uppercase text-sm"
            >
                Tushundim!
            </button>
        </div>
      </div>

      {/* Problem Display */}
      <div className="flex-1 flex flex-col items-center justify-center mb-8">
        <div className="text-5xl font-bold mb-8 tracking-wider text-foreground flex items-center gap-4">
            <span>{question.a}</span>
            <div className="w-12 h-12 rounded-xl bg-[var(--surface)] border border-[var(--foreground-muted)]/20 flex items-center justify-center">
                <span className="text-2xl text-[var(--foreground-muted)]">?</span>
            </div>
            <span>{question.b}</span>
            <span>=</span>
            <span>{question.result}</span>
        </div>
      </div>

      {/* Operator Buttons */}
      <div className="grid grid-cols-2 gap-4 pb-6 w-full">
        {["/", "*", "+", "-"].map((op) => (
            <button
                key={op}
                onClick={() => handleOperatorClick(op)}
                className="aspect-square rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-5xl font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-transform flex items-center justify-center"
            >
                {op === "/" ? "÷" : op === "*" ? "×" : op}
            </button>
        ))}
      </div>
    </div>
  );
}

