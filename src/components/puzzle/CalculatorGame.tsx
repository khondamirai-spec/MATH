"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { initializeUserSession } from "@/lib/userSession";
import { updateScoreAndGems, getMinigameIdByCode } from "@/lib/gamification";
import { supabase } from "@/lib/supabase";

const QUESTION_DURATION = 5; // seconds per question
const CORRECT_STREAK_FOR_LEVEL_UP = 5; // Correct answers needed to level up
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

// Level configuration type from Supabase
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
    
    // First "tin" - higher pitch
    const playTin = (startTime: number, frequency: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.type = 'sine';
      
      // Bell-like envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    };
    
    const now = audioContext.currentTime;
    playTin(now, 880);        // First "tin" - A5
    playTin(now + 0.15, 1108.73); // Second "tin" - C#6 (higher)
    
    // Clean up audio context after sounds finish
    setTimeout(() => {
      audioContext.close();
    }, 500);
  } catch {
    // Audio not supported, fail silently
  }
};
const PROGRESS_INTERVAL = 100; // ms
const PROGRESS_DECREMENT = PROGRESS_INTERVAL / 1000;

// Build equation based on level config from Supabase
const buildEquation = (minRange: number, maxRange: number) => {
  const operators = ["+", "-", "*", "/"] as const;
  const operator = operators[Math.floor(Math.random() * operators.length)];
  let a = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
  let b = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
  let newAnswer = 0;

  if (operator === "/") {
    // For division, ensure clean division
    b = Math.max(1, Math.min(b, 12)); // Keep divisor reasonable
    newAnswer = Math.floor(Math.random() * Math.min(maxRange / b, 20)) + 1;
    a = newAnswer * b;
  } else if (operator === "*") {
    // For multiplication, keep numbers smaller to avoid huge results
    a = Math.floor(Math.random() * Math.min(maxRange, 20)) + minRange;
    b = Math.floor(Math.random() * Math.min(maxRange, 20)) + minRange;
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

type GamePhase = 'tutorial' | 'playing' | 'finished';

export default function CalculatorGame({ onBack }: CalculatorGameProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>('tutorial');
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);
  
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [equation, setEquation] = useState("9 / 3");
  const [answer, setAnswer] = useState<number>(3);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
  const [correctStreak, setCorrectStreak] = useState(0); // Track consecutive correct answers
  
  const isFirstLoad = useRef(true);
  const hasAnswered = useRef(false);

  // Get current level config
  const currentLevel = levels[currentLevelIndex] || null;

  // Fetch levels from Supabase on mount
  useEffect(() => {
    const fetchLevels = async () => {
      setIsLoadingLevels(true);
      try {
        // First get the minigame ID for 'calculator'
        const { data: minigame, error: minigameError } = await supabase
          .from('minigames')
          .select('id')
          .eq('code', 'calculator')
          .single();

        if (minigameError || !minigame) {
          console.error('Failed to fetch minigame:', minigameError);
          // Use fallback levels
          setLevels([
            { id: '1', level: 1, number_range_min: 1, number_range_max: 10, question_count: 10 },
            { id: '2', level: 2, number_range_min: 1, number_range_max: 100, question_count: 25 },
            { id: '3', level: 3, number_range_min: 1, number_range_max: 500, question_count: 35 },
          ]);
          setIsLoadingLevels(false);
          return;
        }

        // Now fetch levels for this minigame
        const { data: levelData, error: levelError } = await supabase
          .from('minigame_levels')
          .select('id, level, number_range_min, number_range_max, question_count')
          .eq('minigame_id', minigame.id)
          .order('level', { ascending: true });

        if (levelError || !levelData || levelData.length === 0) {
          console.error('Failed to fetch levels:', levelError);
          // Use fallback levels
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
        // Use fallback levels
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
          const minigameId = await getMinigameIdByCode("calculator");
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
    // Save score when going back
    await saveScore();
    onBack();
  };

  const loadNextQuestion = useCallback((playSound: boolean = true) => {
    if (!currentLevel) return;
    
    const { expression, solution } = buildEquation(
      currentLevel.number_range_min,
      currentLevel.number_range_max
    );
    setEquation(expression);
    setAnswer(solution);
    setInput("");
    setTimeLeft(QUESTION_DURATION);
    hasAnswered.current = false;
    
    // Play "tin tin" sound for each new question
    if (playSound) {
      playTinTinSound();
    }
  }, [currentLevel]);

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

  useEffect(() => {
    if (gamePhase !== 'playing' || !currentLevel) return;
    
    if (timeLeft === 0 && !hasAnswered.current) {
      // Time ran out - lose a heart
      hasAnswered.current = true;
      playHeartBreakSound();
      setHearts((h) => {
        const newHearts = h - 1;
        if (newHearts <= 0) {
          // Game over - save score and end game
          setTimeout(() => setGamePhase('finished'), 500);
        }
        return newHearts;
      });
      setCorrectStreak(0); // Reset streak on wrong answer
      if (hearts > 1) {
        loadNextQuestion();
      }
    }
  }, [gamePhase, timeLeft, loadNextQuestion, currentLevel, hearts]);


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

  // Check answer when input changes
  useEffect(() => {
    if (!input || hasAnswered.current || !currentLevel || gamePhase !== 'playing') return;
    
    const inputNum = parseInt(input, 10);
    if (isNaN(inputNum)) return;
    
    if (inputNum === answer) {
        // Correct answer - add 1.0 gems
        hasAnswered.current = true;
        setScore((s) => s + 1.0);
        
        // Increase streak and check for level up
        const newStreak = correctStreak + 1;
        setCorrectStreak(newStreak);
        
        // Auto level up after consecutive correct answers
        if (newStreak >= CORRECT_STREAK_FOR_LEVEL_UP && currentLevelIndex < levels.length - 1) {
          setCurrentLevelIndex((idx) => idx + 1);
          setCorrectStreak(0); // Reset streak after leveling up
        }
        
        loadNextQuestion();
    }
  }, [input, answer, loadNextQuestion, currentLevel, gamePhase, correctStreak, currentLevelIndex, levels.length]);

  // Start game after tutorial
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

  // ============== LOADING SCREEN ==============
  if (isLoadingLevels) {
    return (
      <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  // ============== TUTORIAL SCREEN ==============
  if (gamePhase === 'tutorial') {
    return (
      <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full bg-[var(--surface)] rounded-3xl p-6 pb-8 border border-[var(--foreground-muted)]/10 shadow-2xl">
            <h2 className="text-xl font-bold text-center mb-6 text-foreground">🧮 Kalkulyator</h2>
            
            {/* Mini Game Preview */}
            <div className="bg-background rounded-2xl p-6 mb-6 relative overflow-hidden border border-[var(--foreground-muted)]/20 shadow-inner">
              <div className="flex justify-between items-center mb-4 opacity-50">
                <div className="w-8 h-8 rounded-full bg-[var(--surface)] flex items-center justify-center border border-[var(--foreground-muted)]/10">
                  <span className="text-xs text-foreground">‹</span>
                </div>
                <div className="flex gap-2 text-xs font-bold text-foreground">
                  <span>💎</span> 0
                </div>
              </div>
              
              <div className="w-full h-1 bg-[var(--foreground-muted)]/20 rounded-full mb-6 overflow-hidden">
                <div className="h-full w-3/4 bg-blue-500"></div>
              </div>
              
              <div className="text-center text-2xl font-bold mb-2 text-foreground flex justify-center items-center gap-3">
                6 ÷ 3 = <div className="w-10 h-10 bg-[var(--surface)] rounded-lg border border-[var(--foreground-muted)]/20"></div>
              </div>
            </div>

            <p className="text-center text-[var(--foreground-muted)] text-sm mb-6 leading-relaxed">
              Oddiy tenglamalarni birma-bir yeching.<br/>
              Qanchalik ko&apos;p to&apos;g&apos;ri yechsangiz,<br/>
              savol qiyinlashadi.
            </p>

            <div className="flex flex-col gap-3 mb-6 px-4">
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">+1 💎</span>
                <span className="text-[var(--foreground-muted)] text-sm">to&apos;g&apos;ri javob uchun</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">❤️ → 💔</span>
                <span className="text-[var(--foreground-muted)] text-sm">noto&apos;g&apos;ri javobda yurak sinadi</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">3 ❤️</span>
                <span className="text-[var(--foreground-muted)] text-sm">barcha yuraklar sinsa, o&apos;yin tugaydi</span>
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

  // ============== FINISHED SCREEN ==============
  if (gamePhase === 'finished') {
    return (
      <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full bg-[var(--surface)] rounded-3xl p-8 border border-[var(--foreground-muted)]/10 shadow-2xl text-center">
            <div className="text-6xl mb-4">💔</div>
            <h2 className="text-2xl font-bold mb-2 text-foreground">O&apos;yin tugadi!</h2>
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
                Qayta o&apos;ynash
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

  // ============== PLAYING SCREEN ==============
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
          {/* Difficulty Indicator */}
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

      {/* Timer Progress Bar */}
      <div className="w-full h-2 bg-[var(--foreground-muted)]/20 rounded-full mb-4 overflow-hidden border border-blue-500/30">
        <div 
          className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.65)] transition-[width] duration-75 ease-linear" 
          style={{ width: `${Math.max(0, Math.min(100, (timeLeft / QUESTION_DURATION) * 100))}%` }}
        ></div>
      </div>

      {/* Streak Progress (shows progress toward next level) */}
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

      {/* Problem Display */}
      <div className="flex-1 flex flex-col items-center justify-center mb-4">
        <div className="text-5xl font-bold mb-6 tracking-wider text-foreground">{equation.replace('/', '÷').replace('*', '×')}</div>
        
        {/* Answer Input Field */}
        <div className="w-full h-16 bg-[var(--surface)] rounded-2xl flex items-center justify-center text-4xl font-bold text-foreground border border-[var(--foreground-muted)]/20 shadow-sm">
          {input}
          <span className="animate-pulse text-blue-500">|</span>
        </div>
      </div>

      {/* Number Pad Grid */}
      <div className="grid grid-cols-3 gap-1 pb-2">
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num.toString())}
            className="h-20 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-2xl font-semibold shadow-md shadow-blue-900/20 active:scale-95 transition-transform flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        
        {/* Bottom Row */}
        <button
          onClick={handleClear}
          className="h-20 rounded-lg bg-[var(--surface)] hover:brightness-110 text-foreground text-lg font-medium active:scale-95 transition-transform flex items-center justify-center shadow-sm border border-[var(--foreground-muted)]/10"
        >
          Tozalash
        </button>
        
        <button
          onClick={() => handleNumberClick("0")}
          className="h-20 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-2xl font-semibold shadow-md shadow-blue-900/20 active:scale-95 transition-transform flex items-center justify-center"
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

