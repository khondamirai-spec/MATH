"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { initializeUserSession } from "@/lib/userSession";
import { updateScoreAndGems, getMinigameIdByCode } from "@/lib/gamification";
import { supabase } from "@/lib/supabase";

const INITIAL_TIME = 60;
const GRID_SIZE = 6;
const TOTAL_CELLS = 36;
const CORRECT_STREAK_FOR_LEVEL_UP = 3;

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

type Cell = {
  id: number;
  value: number;
  state: "default" | "selected" | "used";
};

interface MathGridGameProps {
  onBack: () => void;
}

type GamePhase = 'tutorial' | 'playing' | 'finished';

export default function MathGridGame({ onBack }: MathGridGameProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>('tutorial');
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);
  
  const [grid, setGrid] = useState<Cell[]>([]);
  const [target, setTarget] = useState(0);
  const [currentSum, setCurrentSum] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [message, setMessage] = useState<string | null>(null);
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
          .eq('code', 'math_grid')
          .single();

        if (minigameError || !minigame) {
          console.error('Failed to fetch minigame:', minigameError);
          setLevels([
            { id: '1', level: 1, number_range_min: 1, number_range_max: 9, question_count: 10 },
            { id: '2', level: 2, number_range_min: 1, number_range_max: 20, question_count: 25 },
            { id: '3', level: 3, number_range_min: 1, number_range_max: 50, question_count: 35 },
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
            { id: '1', level: 1, number_range_min: 1, number_range_max: 9, question_count: 10 },
            { id: '2', level: 2, number_range_min: 1, number_range_max: 20, question_count: 25 },
            { id: '3', level: 3, number_range_min: 1, number_range_max: 50, question_count: 35 },
          ]);
        } else {
          setLevels(levelData);
        }
      } catch (error) {
        console.error('Error fetching levels:', error);
        setLevels([
          { id: '1', level: 1, number_range_min: 1, number_range_max: 9, question_count: 10 },
          { id: '2', level: 2, number_range_min: 1, number_range_max: 20, question_count: 25 },
          { id: '3', level: 3, number_range_min: 1, number_range_max: 50, question_count: 35 },
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
          const minigameId = await getMinigameIdByCode("math_grid");
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

  // Initialize grid based on level
  const generateGrid = useCallback((maxVal: number) => {
    const newGrid: Cell[] = [];
    for (let i = 0; i < TOTAL_CELLS; i++) {
      newGrid.push({
        id: i,
        value: Math.floor(Math.random() * maxVal) + 1,
        state: "default",
      });
    }
    return newGrid;
  }, []);

  const generateTarget = useCallback((currentGrid: Cell[]) => {
    const availableCells = currentGrid.filter((c) => c.state !== "used");
    if (availableCells.length === 0) return 0;

    const count = Math.min(availableCells.length, Math.floor(Math.random() * 3) + 2);
    const shuffled = [...availableCells].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    const sum = selected.reduce((acc, c) => acc + c.value, 0);
    return sum;
  }, []);

  // Timer
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          setTimeout(() => setGamePhase('finished'), 100);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [gamePhase]);

  // Check for refill
  useEffect(() => {
    if (gamePhase !== 'playing' || !currentLevel) return;
    
    const availableCount = grid.filter((c) => c.state !== "used").length;
    if (availableCount < 5 && grid.length > 0) {
      const newGrid = generateGrid(currentLevel.number_range_max);
      setGrid(newGrid);
      setTarget(generateTarget(newGrid));
      setCurrentSum(0);
    }
  }, [grid, gamePhase, currentLevel, generateGrid, generateTarget]);

  const handleCellClick = (id: number) => {
    if (gamePhase !== 'playing') return;

    const cell = grid.find((c) => c.id === id);
    if (!cell || cell.state === "used") return;

    let newGrid = [...grid];
    let newSum = currentSum;

    if (cell.state === "selected") {
      newGrid = newGrid.map((c) =>
        c.id === id ? { ...c, state: "default" } : c
      );
      newSum -= cell.value;
    } else {
      newGrid = newGrid.map((c) =>
        c.id === id ? { ...c, state: "selected" } : c
      );
      newSum += cell.value;
    }

    setGrid(newGrid);
    setCurrentSum(newSum);

    // Check logic
    if (newSum === target) {
      // Correct!
      const scoreToAdd = 1;
      setScore((s) => s + scoreToAdd);
      setMessage("+1 💎");
      
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      
      if (newStreak >= CORRECT_STREAK_FOR_LEVEL_UP && currentLevelIndex < levels.length - 1) {
        setCurrentLevelIndex((idx) => idx + 1);
        setCorrectStreak(0);
      }
      
      setTimeout(() => {
        const nextGrid = newGrid.map((c) =>
          c.state === "selected" ? { ...c, state: "used" as const } : c
        );
        setGrid(nextGrid);
        setCurrentSum(0);
        setTarget(generateTarget(nextGrid));
        setMessage(null);
        playTinTinSound();
      }, 200);
    } else if (newSum > target) {
      // Wrong! - just reset selection
      setMessage("❌");
      setCorrectStreak(0);

      setTimeout(() => {
        const nextGrid = newGrid.map((c) =>
          c.state === "selected" ? { ...c, state: "default" as const } : c
        );
        setGrid(nextGrid);
        setCurrentSum(0);
        setMessage(null);
      }, 500);
    }
  };

  const startGame = () => {
    setGamePhase('playing');
    if (isFirstLoad.current && currentLevel) {
      isFirstLoad.current = false;
      const newGrid = generateGrid(currentLevel.number_range_max);
      setGrid(newGrid);
      setTarget(generateTarget(newGrid));
      playTinTinSound();
    }
  };

  const restartGame = () => {
    setScore(0);
    setTimeLeft(INITIAL_TIME);
    setCorrectStreak(0);
    setCurrentLevelIndex(0);
    setCurrentSum(0);
    setGamePhase('tutorial');
    isFirstLoad.current = true;
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
          <div className="w-full bg-[var(--surface)] rounded-3xl p-6 pb-8 border border-[var(--foreground-muted)]/10 shadow-2xl">
            <h2 className="text-xl font-bold text-center mb-6 text-foreground">🔢 Matematik To'r</h2>
            
            <div className="bg-background p-4 rounded-xl mb-6 border border-[var(--foreground-muted)]/20">
              <div className="text-4xl font-bold text-foreground mb-4">21</div>
              <h3 className="text-foreground font-bold text-xl mb-2">Ko'rsatilgan javobga yetish uchun<br/>to'rdan raqamlarni tanlang</h3>
              
              {/* Mini Grid Visual */}
              <div className="grid grid-cols-6 gap-1 w-full max-w-[200px] mx-auto opacity-50 mb-4">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] rounded-sm text-[6px] flex items-center justify-center text-white">
                    {Math.floor(Math.random()*9)+1}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[var(--foreground-muted)] text-sm mb-6 leading-relaxed px-4">
              Yuqorida ko'rsatilgan javobga yetish uchun matematik to'rdan raqamlarni tanlang. Qanchalik ko'p to'g'ri yechsangiz, raqamlar kattalashadi.
            </p>

            <div className="flex flex-col gap-3 mb-8 px-8">
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">+1 💎</span>
                <span className="text-[var(--foreground-muted)] text-sm">to'g'ri javob uchun</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">⏱️ 60s</span>
                <span className="text-[var(--foreground-muted)] text-sm">vaqt tugaganda o'yin tugaydi</span>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full py-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold tracking-wide shadow-lg shadow-orange-900/20 active:scale-95 transition-transform uppercase text-sm"
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
            <div className="text-6xl mb-4">⏱️</div>
            <h2 className="text-2xl font-bold mb-2 text-foreground">Vaqt tugadi!</h2>
            <p className="text-[var(--foreground-muted)] mb-4">O'yin yakunlandi</p>
            
            <div className="bg-background rounded-2xl p-6 mb-6 border border-[var(--foreground-muted)]/20">
              <div className="text-4xl font-bold text-foreground mb-2">💎 {Math.round(score)}</div>
              <p className="text-sm text-[var(--foreground-muted)]">
                Erishilgan daraja: {currentLevelIndex + 1}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={restartGame}
                className="w-full py-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold tracking-wide shadow-lg shadow-orange-900/20 active:scale-95 transition-transform"
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
      </div>
    );
  }

  // Playing
  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden font-sans">
      {/* Header */}
      <div className="relative z-30 flex items-center justify-between mb-4">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--surface)] text-foreground border border-[var(--foreground-muted)]/20 shadow-sm hover:scale-105 transition-all"
          aria-label="Back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

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
            <span>{Math.round(score)}</span>
          </div>
        </div>
      </div>

      {/* Target Display */}
      <div className="flex flex-col items-center justify-center mb-4">
        <div className="text-xs font-bold text-[var(--foreground-muted)] tracking-widest mb-2 uppercase">
          MATEMATIK TO'R
        </div>
        <div className="text-6xl font-bold text-foreground mb-2 transition-all scale-110">{target}</div>
        {message && (
          <div className={`text-lg font-bold ${message.includes('+') ? 'text-green-500' : 'text-red-500'} animate-pulse absolute top-32`}>
            {message}
          </div>
        )}
        <div className="h-2 w-full max-w-[200px] bg-[var(--surface)] rounded-full mt-4 overflow-hidden border border-[var(--foreground-muted)]/20">
          <div 
            className="h-full bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-100 ease-linear"
            style={{ width: `${(timeLeft / INITIAL_TIME) * 100}%` }}
          />
        </div>
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

      {/* Grid */}
      <div className="grid grid-cols-6 gap-1 w-full aspect-square max-w-sm mx-auto bg-[var(--surface)]/50 p-2 rounded-xl border border-[var(--foreground-muted)]/20">
        {grid.map((cell) => (
          <button
            key={cell.id}
            onClick={() => handleCellClick(cell.id)}
            disabled={cell.state === "used"}
            className={`
              aspect-square rounded-md flex items-center justify-center text-2xl font-bold transition-all duration-150
              ${
                cell.state === "used"
                  ? "invisible"
                  : cell.state === "selected"
                  ? "bg-white text-orange-600 scale-95 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                  : "bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] text-white hover:opacity-90 active:scale-90 shadow-lg shadow-orange-900/20"
              }
            `}
          >
            {cell.value}
          </button>
        ))}
      </div>
      
      <div className="mt-4 text-center text-[var(--foreground-muted)] text-sm">
        Joriy yig'indi: <span className={`font-bold ${currentSum > target ? 'text-red-500' : 'text-foreground'}`}>{currentSum}</span>
      </div>
    </div>
  );
}
