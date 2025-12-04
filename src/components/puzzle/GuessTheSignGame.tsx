"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { initializeUserSession } from "@/lib/userSession";
import { updateScoreAndGems, getMinigameIdByCode } from "@/lib/gamification";
import { supabase } from "@/lib/supabase";

const QUESTION_DURATION = 5;
const CORRECT_STREAK_FOR_LEVEL_UP = 5;
const PROGRESS_INTERVAL = 100;
const PROGRESS_DECREMENT = PROGRESS_INTERVAL / 1000;
const MAX_HEARTS = 3;

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

const buildEquation = (minRange: number, maxRange: number) => {
  const operators = ["+", "-", "*", "/"] as const;
  const operator = operators[Math.floor(Math.random() * operators.length)];
  let a = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
  let b = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
  let result = 0;

  if (operator === "/") {
    // Ensure clean division
    b = Math.max(1, Math.min(b, 12));
    result = Math.floor(Math.random() * Math.min(maxRange / b, 15)) + 1;
    a = result * b;
  } else if (operator === "*") {
    a = Math.floor(Math.random() * Math.min(maxRange, 12)) + minRange;
    b = Math.floor(Math.random() * Math.min(maxRange, 12)) + minRange;
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

type GamePhase = 'tutorial' | 'playing' | 'finished';

export default function GuessTheSignGame({ onBack }: GuessTheSignGameProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>('tutorial');
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);
  
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [question, setQuestion] = useState<{ a: number; b: number; operator: string; result: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
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
          .eq('code', 'find_operator')
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
          const minigameId = await getMinigameIdByCode("find_operator");
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
    
    setQuestion(buildEquation(currentLevel.number_range_min, currentLevel.number_range_max));
    setTimeLeft(QUESTION_DURATION);
    hasAnswered.current = false;
    
    if (playSound) {
      playTinTinSound();
    }
  }, [currentLevel]);

  // Timer
  useEffect(() => {
    if (gamePhase !== 'playing') return;

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

  const handleOperatorClick = (selectedOp: string) => {
    if (!question || hasAnswered.current || gamePhase !== 'playing') return;

    hasAnswered.current = true;

    if (selectedOp === question.operator) {
      setScore((s) => s + 1);
      
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      
      if (newStreak >= CORRECT_STREAK_FOR_LEVEL_UP && currentLevelIndex < levels.length - 1) {
        setCurrentLevelIndex((idx) => idx + 1);
        setCorrectStreak(0);
      }
      
      loadNextQuestion();
    } else {
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

  const startGame = () => {
    setGamePhase('playing');
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      loadNextQuestion(true);
    }
  };

  const restartGame = () => {
    setScore(0);
    setHearts(MAX_HEARTS);
    setCorrectStreak(0);
    setCurrentLevelIndex(0);
    setGamePhase('tutorial');
    isFirstLoad.current = true;
    hasAnswered.current = false;
  };

  // Loading
  if (isLoadingLevels) {
    return (
      <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  // Tutorial
  if (gamePhase === 'tutorial') {
    return (
      <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full bg-[var(--surface)] rounded-3xl p-6 pb-8 border border-[var(--foreground-muted)]/10 shadow-2xl">
            <h2 className="text-xl font-bold text-center mb-6 text-foreground">🔣 Belgini Top</h2>
            
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
              Qanchalik ko'p to'g'ri yechsangiz,<br/>
              savol qiyinlashadi.
            </p>
            
            <div className="flex flex-col gap-2 mb-6 px-8">
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">+1 💎</span>
                <span className="text-[var(--foreground-muted)] text-sm">to'g'ri javob uchun</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">❤️ → 💔</span>
                <span className="text-[var(--foreground-muted)] text-sm">noto'g'ri javobda yurak sinadi</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">3 ❤️</span>
                <span className="text-[var(--foreground-muted)] text-sm">barcha yuraklar sinsa, o'yin tugaydi</span>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold tracking-wide shadow-lg shadow-blue-900/20 active:scale-95 transition-transform uppercase text-sm"
            >
              Boshlash
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Finished
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
                className="w-full py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold tracking-wide shadow-lg shadow-blue-900/20 active:scale-95 transition-transform"
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

  if (!question) return null;

  // Playing
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
                    ? 'bg-blue-500' 
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

      {/* Progress Bar */}
      <div className="w-full h-2 bg-[var(--foreground-muted)]/20 rounded-full mb-4 overflow-hidden border border-blue-500/30">
        <div 
          className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.65)] transition-[width] duration-75 ease-linear" 
          style={{ width: `${Math.max(0, Math.min(100, (timeLeft / QUESTION_DURATION) * 100))}%` }}
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
        <span className="uppercase tracking-widest text-sm font-semibold">BELGINI TOP</span>
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
