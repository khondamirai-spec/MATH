"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { initializeUserSession } from "@/lib/userSession";
import { updateScoreAndGems, getMinigameIdByCode } from "@/lib/gamification";
import { supabase } from "@/lib/supabase";

const BASE_QUESTION_DURATION = 5; // seconds per question
const CORRECT_STREAK_FOR_LEVEL_UP = 7;
const PROGRESS_INTERVAL = 100; // ms
const PROGRESS_DECREMENT = PROGRESS_INTERVAL / 1000;
const MAX_HEARTS = 3;

// Dynamic timer based on level
const getQuestionDuration = (level: number) => {
  if (level === 1) return 7;
  if (level === 2) return 5;
  return 3.5; // Level 3+
};

// Heart break sound effect
const playHeartBreakSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    setTimeout(() => audioContext.close(), 400);
  } catch {
    // Audio not supported
  }
};

// Level configuration from Supabase
interface LevelConfig {
  id: string;
  level: number;
  number_range_min: number;
  number_range_max: number;
  question_count: number;
}

type Operator = "+" | "-" | "*" | "/";

interface Question {
  expressionParts: (string | number)[]; // e.g. ["?", "*", 14, "=", 70]
  missingValue: number;
  options: number[];
}

const generateOptions = (correct: number, maxRange: number): number[] => {
  const options = new Set<number>();
  options.add(correct);
  
  // Scale variance with difficulty - make options closer/harder
  const baseVariance = maxRange <= 10 ? 3 : maxRange <= 100 ? 15 : 50;
  const varianceMultiplier = maxRange <= 10 ? 1 : maxRange <= 100 ? 2 : 4;
  
  while (options.size < 4) {
    const variance = Math.floor(Math.random() * baseVariance * varianceMultiplier) + 1;
    const sign = Math.random() > 0.5 ? 1 : -1;
    const val = correct + (variance * sign);
    
    if (val >= 0 && val <= maxRange * 3 && !options.has(val)) {
      options.add(val);
    } else if (val < 0 || options.size < 4) {
      // Generate a completely random option within reasonable range
      const randomOption = Math.floor(Math.random() * Math.max(correct * 2, maxRange));
      if (!options.has(randomOption) && randomOption >= 0) {
        options.add(randomOption);
      }
    }
  }
  
  return Array.from(options).sort(() => Math.random() - 0.5);
};

const buildQuestion = (minRange: number, maxRange: number): Question => {
  const operators: Operator[] = ["+", "-", "*", "/"];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  
  let a = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
  let b = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
  let result = 0;

  // Scale multiplier/divider caps based on range
  const multDivCap = maxRange <= 10 ? 10 : maxRange <= 100 ? 30 : 75;

  // Adjust numbers to ensure integer results and scale difficulty
  if (operator === "/") {
    b = Math.max(1, Math.floor(Math.random() * Math.min(multDivCap, maxRange / 2)) + 1);
    const maxResult = Math.min(Math.floor(maxRange / b), multDivCap);
    result = Math.floor(Math.random() * maxResult) + 1;
    a = result * b;
  } else if (operator === "*") {
    a = Math.floor(Math.random() * Math.min(multDivCap, maxRange)) + Math.max(1, minRange);
    b = Math.floor(Math.random() * Math.min(multDivCap, maxRange)) + Math.max(1, minRange);
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
    options: generateOptions(missingValue, maxRange)
  };
};

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

interface CorrectAnswerGameProps {
  onBack: () => void;
}

type GamePhase = 'tutorial' | 'playing' | 'finished';

export default function CorrectAnswerGame({ onBack }: CorrectAnswerGameProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>('tutorial');
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);
  
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [timeLeft, setTimeLeft] = useState(getQuestionDuration(1));
  const [question, setQuestion] = useState<Question | null>(null);
  const [correctStreak, setCorrectStreak] = useState(0);
  
  const isFirstLoad = useRef(true);
  const hasAnswered = useRef(false);

  // Get current level config
  const currentLevel = levels[currentLevelIndex] || null;

  // Fetch levels from Supabase
  useEffect(() => {
    const fetchLevels = async () => {
      setIsLoadingLevels(true);
      try {
        const { data: minigame, error: minigameError } = await supabase
          .from('minigames')
          .select('id')
          .eq('code', 'missing_number')
          .single();

        if (minigameError || !minigame) {
          console.error('Failed to fetch minigame:', minigameError);
          setLevels([
            { id: '1', level: 1, number_range_min: 1, number_range_max: 10, question_count: 10 },
            { id: '2', level: 2, number_range_min: 1, number_range_max: 100, question_count: 25 },
            { id: '3', level: 3, number_range_min: 1, number_range_max: 500, question_count: 35 },
          ]);
          setIsLoadingLevels(false);
          return;
        }

        const { data: levelData, error: levelError } = await supabase
          .from('minigame_levels')
          .select('id, level, number_range_min, number_range_max, question_count')
          .eq('minigame_id', minigame.id)
          .order('level', { ascending: true });

        if (levelError || !levelData || levelData.length === 0) {
          console.error('Failed to fetch levels:', levelError);
          setLevels([
            { id: '1', level: 1, number_range_min: 1, number_range_max: 10, question_count: 10 },
            { id: '2', level: 2, number_range_min: 1, number_range_max: 100, question_count: 25 },
            { id: '3', level: 3, number_range_min: 1, number_range_max: 500, question_count: 35 },
          ]);
        } else {
          setLevels(levelData);
        }
      } catch (error) {
        console.error('Error fetching levels:', error);
        setLevels([
          { id: '1', level: 1, number_range_min: 1, number_range_max: 10, question_count: 10 },
          { id: '2', level: 2, number_range_min: 1, number_range_max: 100, question_count: 25 },
          { id: '3', level: 3, number_range_min: 1, number_range_max: 500, question_count: 35 },
        ]);
      }
      setIsLoadingLevels(false);
    };

    fetchLevels();
  }, []);

  // Save score to database
  const saveScore = useCallback(async () => {
    if (score > 0) {
      try {
        const userId = await initializeUserSession('math');
        if (userId) {
          const minigameId = await getMinigameIdByCode("missing_number");
          if (minigameId) {
            await updateScoreAndGems(userId, minigameId, score);
          }
        }
      } catch (error) {
        console.error("Failed to save score:", error);
      }
    }
  }, [score]);

  // Auto-save score when game finishes
  useEffect(() => {
    if (gamePhase === 'finished') {
      saveScore();
    }
  }, [gamePhase, saveScore]);

  const handleBack = async () => {
    await saveScore();
    onBack();
  };

  const loadNextQuestion = useCallback((playSound: boolean = true) => {
    if (!currentLevel) return;
    
    setQuestion(buildQuestion(currentLevel.number_range_min, currentLevel.number_range_max));
    setTimeLeft(getQuestionDuration(currentLevel.level));
    hasAnswered.current = false;
    
    if (playSound) {
      playTinTinSound();
    }
  }, [currentLevel]);

  // Timer logic
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          return 0;
        }
        return Math.max(0, prev - PROGRESS_DECREMENT);
      });
    }, PROGRESS_INTERVAL);

    return () => clearInterval(timer);
  }, [gamePhase]);

  // Handle timeout
  useEffect(() => {
    if (gamePhase !== 'playing' || !currentLevel) return;
    
    if (timeLeft === 0 && !hasAnswered.current) {
      hasAnswered.current = true;
      playHeartBreakSound();
      setHearts((h) => {
        const newHearts = h - 1;
        if (newHearts <= 0) {
          setTimeout(() => setGamePhase('finished'), 500);
        }
        return newHearts;
      });
      setCorrectStreak(0);
      if (hearts > 1) {
        loadNextQuestion();
      }
    }
  }, [gamePhase, timeLeft, loadNextQuestion, currentLevel, hearts]);

  const handleOptionClick = (value: number) => {
    if (!question || hasAnswered.current || gamePhase !== 'playing') return;

    hasAnswered.current = true;

    if (value === question.missingValue) {
      // Correct
      setScore((s) => s + 1);
      
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      
      // Auto level up
      if (newStreak >= CORRECT_STREAK_FOR_LEVEL_UP && currentLevelIndex < levels.length - 1) {
        setCurrentLevelIndex((idx) => idx + 1);
        setCorrectStreak(0);
      }
      
      loadNextQuestion();
    } else {
      // Incorrect - lose a heart
      playHeartBreakSound();
      setHearts((h) => {
        const newHearts = h - 1;
        if (newHearts <= 0) {
          setTimeout(() => setGamePhase('finished'), 500);
        }
        return newHearts;
      });
      setCorrectStreak(0);
      if (hearts > 1) {
        loadNextQuestion();
      }
    }
  };

  // Start game
  const startGame = () => {
    setGamePhase('playing');
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      loadNextQuestion(true);
    }
  };

  // Restart game
  const restartGame = () => {
    setScore(0);
    setHearts(MAX_HEARTS);
    setCorrectStreak(0);
    setCurrentLevelIndex(0);
    setGamePhase('tutorial');
    isFirstLoad.current = true;
    hasAnswered.current = false;
  };

  // Loading screen
  if (isLoadingLevels) {
    return (
      <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  // Tutorial screen
  if (gamePhase === 'tutorial') {
    return (
      <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full bg-[var(--surface)] rounded-3xl p-4 pb-5 border border-[var(--foreground-muted)]/10 shadow-2xl">
            <h2 className="text-lg font-bold text-center mb-4 text-foreground">❓ To'g'ri Javob</h2>
            
            {/* Mini Game Preview */}
            <div className="bg-background rounded-2xl p-4 mb-4 relative overflow-hidden border border-[var(--foreground-muted)]/20 mx-2 shadow-inner">
              <div className="flex justify-between items-center mb-3 opacity-50">
                <div className="w-6 h-6 rounded-full bg-[var(--surface)] flex items-center justify-center border border-[var(--foreground-muted)]/10">
                  <span className="text-[10px] text-foreground">‹</span>
                </div>
                <div className="flex gap-1.5 text-[10px] font-bold text-foreground">
                  <span>💎</span> 0
                </div>
              </div>
              
              <div className="w-full h-0.5 bg-[var(--foreground-muted)]/20 rounded-full mb-4 overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-slate-900 via-cyan-600 to-cyan-400"></div>
              </div>
              
              {/* Sample Equation Display */}
              <div className="text-center text-lg font-bold mb-3 text-foreground flex justify-center items-center gap-2">
                <div className="w-7 h-7 bg-[var(--surface)] rounded-lg border border-[var(--foreground-muted)]/20 flex items-center justify-center">
                  <span className="text-xs text-[var(--foreground-muted)]">?</span>
                </div>
                <span>×</span>
                <span>7</span>
                <span>=</span>
                <span>35</span>
              </div>
              
              {/* Mini Option Buttons */}
              <div className="grid grid-cols-4 gap-1.5 px-2">
                {[5, 3, 8, 6].map((num) => (
                  <div 
                    key={num}
                    className="aspect-square rounded-lg bg-gradient-to-br from-slate-900 via-cyan-600 to-cyan-400 text-white text-xs font-bold flex items-center justify-center shadow-sm"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-center text-[var(--foreground-muted)] text-xs mb-4 leading-relaxed">
              Tenglamani to'ldirish uchun yo'qolgan sonni toping.<br/>
              Qanchalik ko'p to'g'ri yechsangiz,<br/>
              savol qiyinlashadi.
            </p>

            <div className="flex flex-col gap-2 mb-4 px-3">
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium text-xs">+1 💎</span>
                <span className="text-[var(--foreground-muted)] text-[10px]">to'g'ri javob uchun</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium text-xs">❤️ → 💔</span>
                <span className="text-[var(--foreground-muted)] text-[10px]">noto'g'ri javobda yurak sinadi</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium text-xs">3 ❤️</span>
                <span className="text-[var(--foreground-muted)] text-[10px]">barcha yuraklar sinsa, o'yin tugaydi</span>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full py-3 rounded-full bg-gradient-to-r from-slate-900 via-cyan-600 to-cyan-400 text-white font-bold tracking-wide shadow-lg shadow-cyan-900/30 active:scale-95 transition-transform uppercase text-xs"
            >
              Boshlash
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Finished screen
  if (gamePhase === 'finished') {
    return (
      <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full bg-[var(--surface)] rounded-3xl p-8 border border-[var(--foreground-muted)]/10 shadow-2xl text-center">
            <div className="text-6xl mb-4">💔</div>
            <h2 className="text-2xl font-bold mb-2 text-foreground">O'yin tugadi!</h2>
            <p className="text-[var(--foreground-muted)] mb-4">Barcha yuraklar tugadi</p>
            
            <div className="bg-background rounded-2xl p-6 mb-6 border border-[var(--foreground-muted)]/20">
              <div className="text-4xl font-bold text-foreground mb-2">💎 {score}</div>
              <p className="text-sm text-[var(--foreground-muted)]">
                Erishilgan daraja: {currentLevelIndex + 1}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={restartGame}
                className="w-full py-4 rounded-full bg-gradient-to-r from-slate-900 via-cyan-600 to-cyan-400 text-white font-bold tracking-wide shadow-lg shadow-cyan-900/30 active:scale-95 transition-transform"
              >
                Qayta o'ynash
              </button>
              <button 
                onClick={handleBack}
                className="w-full py-4 rounded-full text-[var(--foreground-muted)] font-medium active:scale-95 transition-transform"
              >
                Orqaga
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Playing screen
  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="relative z-30 flex items-center justify-between mb-2">
        <button 
          onClick={handleBack}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--surface)] text-foreground border border-[var(--foreground-muted)]/20 shadow-sm hover:scale-105 transition-all"
          aria-label="Back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Hearts Display */}
        <div className="flex items-center gap-1 ml-8">
          {Array.from({ length: MAX_HEARTS }).map((_, idx) => (
            <span 
              key={idx} 
              className={`text-2xl transition-all duration-300 ${
                idx < hearts 
                  ? 'scale-100 opacity-100' 
                  : 'scale-75 opacity-50 grayscale'
              }`}
            >
              {idx < hearts ? '❤️' : '🖤'}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Level Indicator */}
          <div className="flex items-center gap-1">
            {levels.map((_, idx) => (
              <div 
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx <= currentLevelIndex 
                    ? 'bg-cyan-500' 
                    : 'bg-[var(--foreground-muted)]/30'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-xl font-bold text-foreground">
            <span>💎</span>
            <span>{score}</span>
          </div>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="w-full h-2 bg-[var(--foreground-muted)]/20 rounded-full mb-4 overflow-hidden border border-cyan-500/30">
        <div 
          className="h-full bg-gradient-to-r from-slate-900 via-cyan-600 to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.65)] transition-[width] duration-100 ease-linear" 
          style={{ width: `${Math.min(100, (timeLeft / getQuestionDuration(currentLevel?.level || 1)) * 100)}%` }}
        ></div>
      </div>

      {/* Streak Progress */}
      {currentLevelIndex < levels.length - 1 && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex gap-1">
            {Array.from({ length: CORRECT_STREAK_FOR_LEVEL_UP }).map((_, idx) => (
              <div 
                key={idx}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx < correctStreak 
                    ? 'bg-green-500 scale-110' 
                    : 'bg-[var(--foreground-muted)]/20'
                }`}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Game Title */}
      <div className="flex items-center justify-center gap-2 text-[var(--foreground-muted)] mb-8">
        <span className="uppercase tracking-widest text-sm font-semibold">TO'G'RI JAVOB</span>
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
            className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-slate-900 via-cyan-600 to-cyan-400 hover:from-slate-800 hover:via-cyan-500 hover:to-cyan-300 text-white text-3xl font-semibold shadow-lg shadow-cyan-900/30 active:scale-95 transition-transform flex items-center justify-center"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
