"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { initializeUserSession } from "@/lib/userSession";
import { updateScoreAndGems, getMinigameIdByCode } from "@/lib/gamification";
import { supabase } from "@/lib/supabase";

const INITIAL_TIME = 60;
const TIME_BONUS = 1;
const CORRECT_STREAK_FOR_LEVEL_UP = 5;
const PROGRESS_INTERVAL = 100;
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
  const operators = ["+", "-", "*"] as const;
  const operator = operators[Math.floor(Math.random() * operators.length)];
  let a = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
  let b = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
  let answer = 0;

  if (operator === "*") {
    a = Math.floor(Math.random() * Math.min(maxRange, 12)) + minRange;
    b = Math.floor(Math.random() * Math.min(maxRange, 12)) + minRange;
    answer = a * b;
  } else if (operator === "+") {
    answer = a + b;
  } else {
    if (a < b) [a, b] = [b, a];
    answer = a - b;
  }

  return {
    expression: `${a} ${operator} ${b}`,
    answer
  };
};

interface QuickCalculationGameProps {
  onBack: () => void;
}

type GamePhase = 'tutorial' | 'playing' | 'finished';

export default function QuickCalculationGame({ onBack }: QuickCalculationGameProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>('tutorial');
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);
  
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [input, setInput] = useState("");
  const [currentQ, setCurrentQ] = useState<{ expression: string; answer: number } | null>(null);
  const [nextQ, setNextQ] = useState<{ expression: string; answer: number } | null>(null);
  const [correctStreak, setCorrectStreak] = useState(0);
  
  const isFirstLoad = useRef(true);

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
          .eq('code', 'fast_calc')
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
          const minigameId = await getMinigameIdByCode("fast_calc");
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

  const generateQuestion = useCallback(() => {
    if (!currentLevel) return null;
    return buildEquation(currentLevel.number_range_min, currentLevel.number_range_max);
  }, [currentLevel]);

  // Timer - time running out loses a heart
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          playHeartBreakSound();
          setHearts((h) => {
            const newHearts = h - 1;
            if (newHearts <= 0) {
              setTimeout(() => setGamePhase('finished'), 500);
            }
            return newHearts;
          });
          return INITIAL_TIME; // Reset timer
        }
        return prev - (PROGRESS_INTERVAL / 1000);
      });
    }, PROGRESS_INTERVAL);

    return () => clearInterval(timer);
  }, [gamePhase]);

  // Auto-check input
  useEffect(() => {
    if (!currentQ || gamePhase !== 'playing') return;
    
    const val = parseInt(input, 10);
    if (!isNaN(val) && val === currentQ.answer) {
      // Correct
      setScore(s => s + 1);
      setTimeLeft(t => t + TIME_BONUS);
      setInput("");
      
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      
      if (newStreak >= CORRECT_STREAK_FOR_LEVEL_UP && currentLevelIndex < levels.length - 1) {
        setCurrentLevelIndex((idx) => idx + 1);
        setCorrectStreak(0);
      }
      
      setCurrentQ(nextQ);
      setNextQ(generateQuestion());
      playTinTinSound();
    }
  }, [input, currentQ, nextQ, gamePhase, correctStreak, currentLevelIndex, levels.length, generateQuestion]);

  const handleNumberClick = (num: string) => {
    if (input.length < 5) { 
      setInput((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    setInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setInput("");
  };

  const startGame = () => {
    setGamePhase('playing');
    if (isFirstLoad.current && currentLevel) {
      isFirstLoad.current = false;
      setCurrentQ(buildEquation(currentLevel.number_range_min, currentLevel.number_range_max));
      setNextQ(buildEquation(currentLevel.number_range_min, currentLevel.number_range_max));
      playTinTinSound();
    }
  };
  
  const restartGame = () => {
    setScore(0);
    setHearts(MAX_HEARTS);
    setTimeLeft(INITIAL_TIME);
    setCorrectStreak(0);
    setCurrentLevelIndex(0);
    setGamePhase('tutorial');
    setInput("");
    isFirstLoad.current = true;
  };

  // Loading
  if (isLoadingLevels) {
    return (
      <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  // Tutorial
  if (gamePhase === 'tutorial') {
    return (
      <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full bg-[var(--surface)] rounded-3xl p-4 pb-5 border border-[var(--foreground-muted)]/10 shadow-2xl">
            <h2 className="text-lg font-bold text-center mb-4 text-foreground">⚡ Tez Hisoblash</h2>
            
            <div className="bg-background rounded-2xl p-4 mb-4 relative overflow-hidden border border-[var(--foreground-muted)]/20 mx-2 shadow-inner">
              <div className="flex justify-between items-center mb-2 opacity-50">
                <div className="w-6 h-6 rounded-full bg-[var(--surface)] flex items-center justify-center border border-[var(--foreground-muted)]/10">
                  <span className="text-[10px] text-foreground">‹</span>
                </div>
                <div className="flex gap-1.5 text-[10px] font-bold text-foreground">
                  <span>💎</span> 0
                </div>
              </div>
              
              <div className="w-full h-0.5 bg-[var(--foreground-muted)]/20 rounded-full mb-2 overflow-hidden">
                <div className="h-full w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500"></div>
              </div>
              
              <div className="text-center text-[9px] font-mono text-[var(--foreground-muted)] mb-2">60s</div>
              
              {/* Next Question Preview */}
              <div className="mb-2 opacity-50 scale-90 origin-left">
                <div className="text-[7px] uppercase tracking-wider text-[var(--foreground-muted)] mb-0.5">Keyingi</div>
                <div className="text-[10px] font-mono text-[var(--foreground-muted)]">3 + 7</div>
              </div>
              
              {/* Sample Equation Display */}
              <div className="text-center text-lg font-bold text-foreground flex justify-center items-center gap-2">
                <span>8 × 5</span>
                <span>=</span>
                <div className="w-8 h-7 bg-[var(--surface)] rounded-lg border border-[var(--foreground-muted)]/20 flex items-center justify-center">
                  <span className="text-sm text-cyan-500 animate-pulse">|</span>
                </div>
              </div>
            </div>

            <p className="text-center text-[var(--foreground-muted)] text-xs mb-4 leading-relaxed px-3">
              Tenglamalarni iloji boricha tez yeching.<br/>
              Qanchalik ko'p to'g'ri yechsangiz,<br/>
              savol qiyinlashadi.
            </p>
            
            <div className="flex flex-col gap-2 mb-4 px-6">
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium text-xs">+1s</span>
                <span className="text-[var(--foreground-muted)] text-[10px]">har bir to'g'ri javob uchun</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium text-xs">+1 💎</span>
                <span className="text-[var(--foreground-muted)] text-[10px]">to'g'ri javob uchun</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium text-xs">❤️ → 💔</span>
                <span className="text-[var(--foreground-muted)] text-[10px]">vaqt tugaganda yurak sinadi</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium text-xs">3 ❤️</span>
                <span className="text-[var(--foreground-muted)] text-[10px]">barcha yuraklar sinsa, o'yin tugaydi</span>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold tracking-wide shadow-lg shadow-cyan-900/20 active:scale-95 transition-transform uppercase text-xs"
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
      <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-4">
        <div className="w-full max-w-md bg-[var(--surface)] rounded-3xl p-8 border border-[var(--foreground-muted)]/10 shadow-2xl text-center">
          <div className="text-6xl mb-4">💔</div>
          <h1 className="text-2xl font-bold mb-2 text-foreground">O'yin tugadi!</h1>
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
              className="w-full py-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold tracking-wide shadow-lg active:scale-95 transition-transform"
            >
              Qayta o'ynash
            </button>
            <button 
              onClick={handleBack}
              className="w-full py-4 rounded-full text-[var(--foreground-muted)] font-medium active:scale-95 transition-transform"
            >
              Chiqish
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.65)] transition-[width] duration-100 ease-linear" 
          style={{ width: `${Math.min(100, (timeLeft / INITIAL_TIME) * 100)}%` }}
        ></div>
      </div>
      
      <div className="text-center text-sm font-mono text-[var(--foreground-muted)] mb-2">
        {Math.ceil(timeLeft)}s
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
      <div className="flex items-center justify-center gap-2 text-[var(--foreground-muted)] mb-4">
        <span className="uppercase tracking-widest text-sm font-semibold">TEZ HISOBLASH</span>
      </div>

      {/* Problem Display */}
      <div className="flex-1 flex flex-col items-center justify-center mb-4 relative">
        {/* Next Question Preview */}
        <div className="absolute -top-8 left-4 text-left opacity-50 scale-90 origin-top-left">
          <div className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)] mb-1">Keyingi</div>
          <div className="text-lg font-mono text-[var(--foreground-muted)]">
            {nextQ ? nextQ.expression.replace('/', '÷').replace('*', '×') : "..."}
          </div>
        </div>

        <div className="text-5xl font-bold mb-4 tracking-wider text-foreground">
          {currentQ ? (
            <div className="flex items-center gap-4">
              <span>{currentQ.expression.replace('/', '÷').replace('*', '×')}</span>
              <span>=</span>
              <div className="min-w-[2ch] h-16 bg-[var(--surface)] rounded-2xl flex items-center justify-center text-4xl font-bold text-foreground border border-[var(--foreground-muted)]/20 shadow-sm px-4">
                {input}
                <span className="animate-pulse text-cyan-500 ml-1">|</span>
              </div>
            </div>
          ) : (
            "..."
          )}
        </div>
      </div>

      {/* Number Pad Grid */}
      <div className="grid grid-cols-3 gap-1 pb-2">
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num.toString())}
            className="h-20 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-2xl font-semibold shadow-md shadow-cyan-900/20 active:scale-95 transition-transform flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        
        <button
          onClick={handleClear}
          className="h-20 rounded-lg bg-[var(--surface)] hover:brightness-110 text-foreground text-lg font-medium active:scale-95 transition-transform flex items-center justify-center shadow-sm border border-[var(--foreground-muted)]/10"
        >
          Tozalash
        </button>
        
        <button
          onClick={() => handleNumberClick("0")}
          className="h-20 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-2xl font-semibold shadow-md shadow-cyan-900/20 active:scale-95 transition-transform flex items-center justify-center"
        >
          0
        </button>
        
        <button
          onClick={handleDelete}
          className="h-20 rounded-lg bg-[var(--surface)] hover:brightness-110 text-foreground text-xl font-medium active:scale-95 transition-transform flex items-center justify-center shadow-sm border border-[var(--foreground-muted)]/10"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
