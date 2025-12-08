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

const buildLevel = (minRange: number, maxRange: number) => {
  // Generate a root based on level range
  // Level 1: 2-10, Level 2: 2-20, Level 3: 2-30
  const maxRoot = Math.min(Math.floor(Math.sqrt(maxRange)), 30);
  const minRoot = Math.max(2, Math.floor(Math.sqrt(minRange)));
  const root = Math.floor(Math.random() * (maxRoot - minRoot + 1)) + minRoot;
  const square = root * root;
  
  // Generate distractors
  const options = new Set<number>();
  options.add(root);
  
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 5) + 1;
    const sign = Math.random() > 0.5 ? 1 : -1;
    const distractor = root + (offset * sign);
    
    if (distractor > 0 && !options.has(distractor)) {
      options.add(distractor);
    }
  }

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

type GamePhase = 'tutorial' | 'playing' | 'finished';

export default function SquareRootGame({ onBack }: SquareRootGameProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>('tutorial');
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);
  
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [equation, setEquation] = useState("√64");
  const [answer, setAnswer] = useState<number>(8);
  const [options, setOptions] = useState<number[]>([8, 4, 12, 6]);
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
          .eq('code', 'square_root')
          .single();

        if (minigameError || !minigame) {
          console.error('Failed to fetch minigame:', minigameError);
          setLevels([
            { id: '1', level: 1, number_range_min: 4, number_range_max: 100, question_count: 10 },
            { id: '2', level: 2, number_range_min: 4, number_range_max: 400, question_count: 25 },
            { id: '3', level: 3, number_range_min: 4, number_range_max: 900, question_count: 35 },
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
            { id: '1', level: 1, number_range_min: 4, number_range_max: 100, question_count: 10 },
            { id: '2', level: 2, number_range_min: 4, number_range_max: 400, question_count: 25 },
            { id: '3', level: 3, number_range_min: 4, number_range_max: 900, question_count: 35 },
          ]);
        } else {
          setLevels(levelData);
        }
      } catch (error) {
        console.error('Error fetching levels:', error);
        setLevels([
          { id: '1', level: 1, number_range_min: 4, number_range_max: 100, question_count: 10 },
          { id: '2', level: 2, number_range_min: 4, number_range_max: 400, question_count: 25 },
          { id: '3', level: 3, number_range_min: 4, number_range_max: 900, question_count: 35 },
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
          const minigameId = await getMinigameIdByCode("square_root");
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
    
    const { expression, solution, options: newOptions } = buildLevel(
      currentLevel.number_range_min,
      currentLevel.number_range_max
    );
    setEquation(expression);
    setAnswer(solution);
    setOptions(newOptions);
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

  const handleOptionClick = (selected: number) => {
    if (hasAnswered.current || gamePhase !== 'playing') return;

    hasAnswered.current = true;

    if (selected === answer) {
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
          <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full"></div>
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
            <h2 className="text-lg font-bold text-center mb-4 text-foreground">√ Kvadrat Ildiz</h2>
            
            <div className="bg-background rounded-2xl p-4 mb-4 relative overflow-hidden border border-[var(--foreground-muted)]/20 mx-3 shadow-inner">
              <div className="text-center text-2xl font-bold mb-4 text-foreground">
                √64
              </div>
              <div className="grid grid-cols-2 gap-2 px-6">
                <div className="h-10 bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] rounded-xl flex items-center justify-center text-white font-bold text-sm">8</div>
                <div className="h-10 bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] opacity-30 rounded-xl flex items-center justify-center text-foreground/50 text-sm">4</div>
              </div>
            </div>

            <p className="text-center text-[var(--foreground-muted)] text-xs mb-4 leading-relaxed px-3">
              To'g'ri kvadrat ildizni tanlang.<br/>
              Qanchalik ko'p to'g'ri yechsangiz,<br/>
              savol qiyinlashadi.
            </p>

            <div className="flex flex-col gap-2 mb-4 px-6">
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
              className="w-full py-3 rounded-full bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] text-white font-bold tracking-wide shadow-lg shadow-orange-900/20 active:scale-95 transition-transform uppercase text-xs"
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
                className="w-full py-4 rounded-full bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] text-white font-bold tracking-wide shadow-lg shadow-orange-900/20 active:scale-95 transition-transform"
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

  // Playing
  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="relative z-30 flex items-center justify-between mb-6">
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
                    ? 'bg-orange-500' 
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
      <div className="w-full h-2 bg-[var(--foreground-muted)]/20 rounded-full mb-4 overflow-hidden border border-orange-500/30">
        <div 
          className="h-full bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] shadow-[0_0_12px_rgba(239,68,68,0.65)] transition-[width] duration-75 ease-linear" 
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
      <div className="flex items-center justify-center gap-2 text-[var(--foreground-muted)] mb-12">
        <span className="uppercase tracking-widest text-sm font-semibold">KVADRAT ILDIZ</span>
      </div>

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
    </div>
  );
}
