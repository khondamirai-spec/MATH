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

const buildLevel = () => {
  // Generate a root between 2 and 15 (squares 4 to 225)
  const root = Math.floor(Math.random() * 14) + 2;
  const square = root * root;
  
  // Generate distractors
  const options = new Set<number>();
  options.add(root);
  
  while (options.size < 4) {
    // Generate distraction numbers close to the root
    const offset = Math.floor(Math.random() * 5) + 1;
    const sign = Math.random() > 0.5 ? 1 : -1;
    const distractor = root + (offset * sign);
    
    if (distractor > 0 && !options.has(distractor)) {
      options.add(distractor);
    }
  }

  // Convert to array and shuffle
  const shuffledOptions = Array.from(options).sort(() => Math.random() - 0.5);

  return {
    expression: `√${square}`,
    solution: root,
    options: shuffledOptions
  };
};

interface SquareRootGameProps {
  onBack: () => void;
}

export default function SquareRootGame({ onBack }: SquareRootGameProps) {
  const [score, setScore] = useState(0);
  const [equation, setEquation] = useState("√64");
  const [answer, setAnswer] = useState<number>(8);
  const [options, setOptions] = useState<number[]>([8, 4, 12, 6]);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
  const [isTutorialOpen, setIsTutorialOpen] = useState(true);
  const isFirstLoad = useRef(true);

  const loadNextQuestion = useCallback((playSound: boolean = true) => {
    const { expression, solution, options: newOptions } = buildLevel();
    setEquation(expression);
    setAnswer(solution);
    setOptions(newOptions);
    setTimeLeft(QUESTION_DURATION);
    if (playSound) {
      playTinTinSound();
    }
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

  const handleOptionClick = (selected: number) => {
    if (selected === answer) {
      setScore((s) => s + 1);
      loadNextQuestion();
    } else {
      // Penalize score matches CalculatorGame logic description
      setScore((s) => Math.max(0, s - 1));
      loadNextQuestion();
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="relative z-30 flex items-center justify-between mb-6">
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
      <div className="w-full h-2 bg-[var(--foreground-muted)]/20 rounded-full mb-8 overflow-hidden border border-orange-500/30">
        <div 
            className="h-full bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] shadow-[0_0_12px_rgba(239,68,68,0.65)] transition-[width] duration-75 ease-linear" 
            style={{ width: `${Math.max(0, Math.min(100, (timeLeft / QUESTION_DURATION) * 100))}%` }}
        ></div>
      </div>

      {/* Game Title - Clickable for Tutorial */}
      <button 
        onClick={() => setIsTutorialOpen(true)}
        className="flex items-center justify-center gap-2 text-[var(--foreground-muted)] mb-12 hover:text-foreground transition-colors cursor-pointer w-full"
      >
        <span className="uppercase tracking-widest text-sm font-semibold">KVADRAT ILDIZ</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
           <circle cx="12" cy="12" r="10"></circle>
           <line x1="12" y1="16" x2="12" y2="12"></line>
           <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </button>

      {/* Problem Display */}
      <div className="flex-1 flex flex-col items-center justify-center mb-16">
        <div className="text-6xl font-bold tracking-wider text-foreground">
            {equation}
        </div>
      </div>

      {/* Options Grid - 2x2 */}
      <div className="grid grid-cols-2 gap-4 pb-8 px-2">
        {options.map((opt, idx) => (
            <button
                key={`${idx}-${opt}`}
                onClick={() => handleOptionClick(opt)}
                className="aspect-square rounded-3xl bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] hover:opacity-90 text-white text-4xl font-semibold shadow-lg shadow-orange-900/20 active:scale-95 transition-transform flex items-center justify-center"
            >
                {opt}
            </button>
        ))}
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
            
            <h2 className="text-xl font-bold text-center mb-6 text-foreground">Kvadrat Ildiz</h2>
            
            {/* Mini Game Preview */}
            <div className="bg-background rounded-2xl p-6 mb-6 relative overflow-hidden border border-[var(--foreground-muted)]/20 mx-4 shadow-inner">
                <div className="text-center mb-4 text-[var(--foreground-muted)] text-[10px] tracking-widest uppercase">Kvadrat Ildiz</div>
                <div className="text-center text-3xl font-bold mb-6 text-foreground">
                    √64
                </div>
                <div className="grid grid-cols-2 gap-2 px-8">
                    <div className="h-12 bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] rounded-xl flex items-center justify-center text-white font-bold">8</div>
                    <div className="h-12 bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] opacity-30 rounded-xl flex items-center justify-center text-foreground/50">4</div>
                </div>
            </div>

            <p className="text-center text-[var(--foreground-muted)] text-sm mb-8 leading-relaxed px-4">
                To'g'ri kvadrat ildizni tanlang.<br/>
                Qanchalik tez yechsangiz, keyingi<br/>
                tenglama uchun shunchalik ko'p vaqt beriladi.
            </p>

            <div className="flex flex-col gap-3 mb-8 px-8">
                <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">1.0</span>
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
                O'ynash
            </button>
        </div>
      </div>
    </div>
  );
}
