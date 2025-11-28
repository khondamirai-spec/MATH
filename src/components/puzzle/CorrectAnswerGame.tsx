"use client";

import { useState, useEffect, useCallback } from "react";

const QUESTION_DURATION = 5; // seconds per question
const PROGRESS_INTERVAL = 100; // ms
const PROGRESS_DECREMENT = PROGRESS_INTERVAL / 1000;

type Operator = "+" | "-" | "*" | "/";

interface Question {
  expressionParts: (string | number)[]; // e.g. ["?", "*", 14, "=", 70]
  missingValue: number;
  options: number[];
}

const generateOptions = (correct: number): number[] => {
  const options = new Set<number>();
  options.add(correct);
  
  while (options.size < 4) {
    const variance = Math.floor(Math.random() * 10) + 1;
    const sign = Math.random() > 0.5 ? 1 : -1;
    const val = correct + (variance * sign);
    if (val >= 0 && !options.has(val)) { // Keep options non-negative for simplicity
      options.add(val);
    } else if (val < 0) {
      // fallback for negative numbers if needed
       options.add(Math.floor(Math.random() * 20)); 
    }
  }
  
  return Array.from(options).sort(() => Math.random() - 0.5);
};

const buildQuestion = (): Question => {
  const operators: Operator[] = ["+", "-", "*", "/"];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  
  let a = Math.floor(Math.random() * 15) + 1; // 1-15
  let b = Math.floor(Math.random() * 15) + 1; // 1-15
  let result = 0;

  // Adjust numbers to ensure integer results and reasonable difficulty
  if (operator === "/") {
    result = a;
    a = a * b; // Ensure a is divisible by b
  } else if (operator === "*") {
    a = Math.floor(Math.random() * 12) + 1;
    b = Math.floor(Math.random() * 12) + 1;
    result = a * b;
  } else if (operator === "+") {
    result = a + b;
  } else { // "-"
    if (a < b) [a, b] = [b, a];
    result = a - b;
  }

  const hideIndex = Math.random() > 0.5 ? 0 : 1;
  const missingValue = hideIndex === 0 ? a : b;
  
  const expressionParts = [
    hideIndex === 0 ? "?" : a,
    operator === "/" ? "÷" : operator === "*" ? "×" : operator,
    hideIndex === 1 ? "?" : b,
    "=",
    result
  ];

  return {
    expressionParts,
    missingValue,
    options: generateOptions(missingValue)
  };
};

interface CorrectAnswerGameProps {
  onBack: () => void;
}

export default function CorrectAnswerGame({ onBack }: CorrectAnswerGameProps) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
  const [question, setQuestion] = useState<Question | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(true);

  const loadNextQuestion = useCallback(() => {
    setQuestion(buildQuestion());
    setTimeLeft(QUESTION_DURATION);
  }, []);

  // Load initial question
  useEffect(() => {
    loadNextQuestion();
  }, [loadNextQuestion]);

  // Timer logic
  useEffect(() => {
    if (isPaused || isTutorialOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          return 0;
        }
        return Math.max(0, prev - PROGRESS_DECREMENT);
      });
    }, PROGRESS_INTERVAL);

    return () => clearInterval(timer);
  }, [isPaused, isTutorialOpen]);

  // Handle timeout
  useEffect(() => {
    if (!isPaused && !isTutorialOpen && timeLeft === 0) {
      // Time run out - count as wrong? Or just skip? 
      // Usually implies a penalty or loss of streak. 
      // For consistency with other modes, we might deduct or just reset.
      // Let's deduct to encourage speed.
      setScore((s) => Math.max(0, s - 1));
      loadNextQuestion();
    }
  }, [timeLeft, isPaused, isTutorialOpen, loadNextQuestion]);

  const handleOptionClick = (value: number) => {
    if (!question) return;

    if (value === question.missingValue) {
      // Correct
      setScore((s) => s + 1);
      loadNextQuestion();
    } else {
      // Incorrect
      setScore((s) => Math.max(0, s - 1)); 
      loadNextQuestion();
    }
  };

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

      {/* Timer Bar */}
      <div className="w-full h-2 bg-[var(--foreground-muted)]/20 rounded-full mb-8 overflow-hidden border border-purple-500/30">
        <div 
            className="h-full bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 shadow-[0_0_12px_rgba(168,85,247,0.65)] transition-[width] duration-100 ease-linear" 
            style={{ width: `${Math.min(100, (timeLeft / QUESTION_DURATION) * 100)}%` }}
        ></div>
      </div>
      
      {/* Game Title */}
      <button 
        onClick={() => setIsTutorialOpen(true)}
        className="flex items-center justify-center gap-2 text-[var(--foreground-muted)] mb-8 hover:text-foreground transition-colors cursor-pointer w-full"
      >
        <span className="uppercase tracking-widest text-sm font-semibold">CORRECT ANSWER</span>
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
            
            <h2 className="text-xl font-bold text-center mb-6 text-foreground">Correct Answer</h2>
            
            <div className="text-center text-[var(--foreground-muted)] text-sm mb-8 leading-relaxed px-4">
                Find the missing number to complete the equation.<br/>
                Be quick to earn more points!
            </div>

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
                className="w-full py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold tracking-wide shadow-lg shadow-blue-900/20 active:scale-95 transition-transform uppercase text-sm"
            >
                Got it!
            </button>
        </div>
      </div>

      {/* Problem Display */}
      <div className="flex-1 flex flex-col items-center justify-center mb-12">
        {question && (
            <div className="flex items-center justify-center gap-3 text-4xl md:text-5xl font-bold tracking-wider text-foreground">
                {question.expressionParts.map((part, i) => (
                    <span key={i} className={part === "?" ? "w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-[var(--surface)] rounded-xl border border-[var(--foreground-muted)]/20 text-[var(--foreground-muted)]" : ""}>
                        {part}
                    </span>
                ))}
            </div>
        )}
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-2 gap-4 pb-8">
        {question?.options.map((option, i) => (
            <button
                key={i}
                onClick={() => handleOptionClick(option)}
                className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-3xl font-semibold shadow-lg shadow-blue-900/20 active:scale-95 transition-transform flex items-center justify-center"
            >
                {option}
            </button>
        ))}
      </div>
    </div>
  );
}
