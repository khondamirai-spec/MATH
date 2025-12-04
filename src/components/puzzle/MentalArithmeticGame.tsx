"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { initializeUserSession } from "@/lib/userSession";
import { updateScoreAndGems, getMinigameIdByCode } from "@/lib/gamification";
import { supabase } from "@/lib/supabase";

const DISPLAY_DURATION = 2000;
const INITIAL_SEQUENCE_LENGTH = 3;
const CORRECT_STREAK_FOR_LEVEL_UP = 3;
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

type SequenceItem = {
  value: number;
  operator: "+" | "-" | "*" | "/" | "";
  display: string;
};

const generateSequence = (length: number, maxRange: number): { sequence: SequenceItem[], answer: number } => {
  const items: SequenceItem[] = [];
  let currentResult = 0;

  // First number
  const firstNum = Math.floor(Math.random() * Math.min(maxRange, 20)) + 1;
  currentResult = firstNum;
  items.push({ value: firstNum, operator: "", display: `${firstNum}` });

  const operators = ["+", "-", "*", "/"] as const;

  for (let i = 1; i < length; i++) {
    const op = operators[Math.floor(Math.random() * operators.length)];
    let val = Math.floor(Math.random() * Math.min(maxRange, 15)) + 1;
    
    if (op === "/") {
      if (currentResult === 0) {
        val = Math.floor(Math.random() * 9) + 1;
      } else {
        const factors = [];
        for(let k=1; k<=Math.abs(currentResult); k++) {
          if (currentResult % k === 0) factors.push(k);
        }
        if (factors.length > 0) {
          val = factors[Math.floor(Math.random() * factors.length)];
        } else {
          val = 1;
        }
      }
      currentResult = currentResult / val;
    } else if (op === "*") {
      val = Math.floor(Math.random() * 5) + 1;
      currentResult = currentResult * val;
    } else if (op === "-") {
      currentResult = currentResult - val;
    } else {
      currentResult = currentResult + val;
    }

    items.push({ value: val, operator: op, display: `${op} ${val}` });
  }

  return { sequence: items, answer: currentResult };
};

interface MentalArithmeticGameProps {
  onBack: () => void;
}

type GameState = 'tutorial' | 'ready' | 'showing' | 'input' | 'feedback' | 'finished';

export default function MentalArithmeticGame({ onBack }: MentalArithmeticGameProps) {
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);
  
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [sequence, setSequence] = useState<SequenceItem[]>([]);
  const [targetAnswer, setTargetAnswer] = useState(0);
  const [gameState, setGameState] = useState<GameState>('tutorial');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [displayContent, setDisplayContent] = useState("");
  const [correctStreak, setCorrectStreak] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
          .eq('code', 'mental_sequence')
          .single();

        if (minigameError || !minigame) {
          console.error('Failed to fetch minigame:', minigameError);
          setLevels([
            { id: '1', level: 1, number_range_min: 1, number_range_max: 10, question_count: 10 },
            { id: '2', level: 2, number_range_min: 1, number_range_max: 50, question_count: 25 },
            { id: '3', level: 3, number_range_min: 1, number_range_max: 100, question_count: 35 },
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
            { id: '2', level: 2, number_range_min: 1, number_range_max: 50, question_count: 25 },
            { id: '3', level: 3, number_range_min: 1, number_range_max: 100, question_count: 35 },
          ]);
        } else {
          setLevels(levelData);
        }
      } catch (error) {
        console.error('Error fetching levels:', error);
        setLevels([
          { id: '1', level: 1, number_range_min: 1, number_range_max: 10, question_count: 10 },
          { id: '2', level: 2, number_range_min: 1, number_range_max: 50, question_count: 25 },
          { id: '3', level: 3, number_range_min: 1, number_range_max: 100, question_count: 35 },
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
          const minigameId = await getMinigameIdByCode("mental_sequence");
          if (minigameId) {
            await updateScoreAndGems(userId, minigameId, score);
          }
        }
      } catch (error) {
        console.error("Failed to save score:", error);
      }
    }
  }, [score]);

  const handleBack = async () => {
    await saveScore();
    onBack();
  };

  const restartGame = () => {
    setScore(0);
    setHearts(MAX_HEARTS);
    setCorrectStreak(0);
    setCurrentLevelIndex(0);
    setGameState('tutorial');
    setUserInput("");
    setDisplayContent("");
  };

  const startGame = useCallback((playSound: boolean = true) => {
    if (!currentLevel) return;
    
    const seqLength = INITIAL_SEQUENCE_LENGTH + Math.floor(score / 5) + currentLevelIndex;
    const { sequence: newSeq, answer } = generateSequence(seqLength, currentLevel.number_range_max);
    setSequence(newSeq);
    setTargetAnswer(answer);
    setCurrentStepIndex(0);
    setGameState('ready');
    setUserInput("");
    
    if (playSound) {
      playTinTinSound();
    }
    
    setTimeout(() => {
      setGameState('showing');
    }, 1000);
  }, [score, currentLevel, currentLevelIndex]);

  // Handle the sequence showing logic
  useEffect(() => {
    if (gameState === 'showing') {
      if (currentStepIndex < sequence.length) {
        const item = sequence[currentStepIndex];
        setDisplayContent(item.display);
        
        timerRef.current = setTimeout(() => {
          setCurrentStepIndex(prev => prev + 1);
        }, DISPLAY_DURATION);
      } else {
        setGameState('input');
        setDisplayContent("?");
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gameState, currentStepIndex, sequence]);

  const handleNumberClick = (num: string) => {
    if (gameState !== 'input') return;
    
    if (num === '-' && userInput === "") {
      setUserInput("-");
      return;
    }
    
    if (userInput.length < 8) {
      setUserInput((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    if (gameState !== 'input') return;
    setUserInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (gameState !== 'input') return;
    setUserInput("");
  };

  const checkAnswer = () => {
    const val = parseInt(userInput, 10);
    if (isNaN(val)) return;

    if (val === targetAnswer) {
      setScore(s => s + 2);
      
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      
      if (newStreak >= CORRECT_STREAK_FOR_LEVEL_UP && currentLevelIndex < levels.length - 1) {
        setCurrentLevelIndex((idx) => idx + 1);
        setCorrectStreak(0);
      }
      
      setDisplayContent("To'g'ri!");
      setTimeout(startGame, 1000);
    } else {
      playHeartBreakSound();
      setHearts(h => {
        const newHearts = h - 1;
        if (newHearts <= 0) {
          setDisplayContent(`Noto'g'ri! (${targetAnswer})`);
          setTimeout(() => setGameState('finished'), 2000);
          return 0;
        }
        return newHearts;
      });
      setCorrectStreak(0);
      setDisplayContent(`Noto'g'ri! (${targetAnswer})`);
      if (hearts > 1) {
        setTimeout(startGame, 2000);
      }
    }
  };

  // Auto-save score when game finishes
  useEffect(() => {
    if (gameState === 'finished') {
      saveScore();
    }
  }, [gameState, saveScore]);

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

  // Finished
  if (gameState === 'finished') {
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

  // Tutorial
  if (gameState === 'tutorial') {
    return (
      <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full bg-[var(--surface)] rounded-3xl p-6 pb-8 border border-[var(--foreground-muted)]/10 shadow-2xl">
            <h2 className="text-xl font-bold text-center mb-6 text-foreground">🧠 Og'zaki Hisob</h2>
            
            <div className="bg-background rounded-2xl p-6 mb-6 border border-[var(--foreground-muted)]/20 mx-4 text-center">
              <div className="text-4xl font-bold mb-2">4</div>
              <div className="text-sm text-[var(--foreground-muted)]">Ketma-ketlikni eslab qoling</div>
            </div>

            <p className="text-center text-[var(--foreground-muted)] text-sm mb-6 leading-relaxed px-4">
              Raqam va amal birma-bir ko'rsatiladi.<br/>
              Eslab qoling va oxirgi javobni yozing.<br/>
              Qanchalik ko'p to'g'ri yechsangiz,<br/>
              raqamlar kattalashadi.
            </p>

            <div className="flex flex-col gap-3 mb-6 px-8">
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">+2 💎</span>
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
              onClick={() => startGame()}
              className="w-full py-4 rounded-full bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] text-white font-bold tracking-wide shadow-lg shadow-orange-900/20 active:scale-95 transition-transform uppercase text-sm"
            >
              Boshlash
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden">
      {/* Top Nav */}
      <div className="relative z-30 flex items-center justify-between mb-2">
        <button 
          onClick={handleBack}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--surface)] text-foreground border border-[var(--foreground-muted)]/20 shadow-sm hover:scale-105 transition-all"
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

      {/* Title */}
      <div className="flex items-center justify-center gap-2 text-[var(--foreground-muted)] mb-4 w-full">
        <span className="uppercase tracking-widest text-sm font-semibold">OG'ZAKI HISOB</span>
      </div>

      {/* Game Display */}
      <div className="flex-1 flex flex-col items-center justify-center mb-4 relative">
        {gameState === 'ready' && (
          <div className="text-2xl text-[var(--foreground-muted)] animate-pulse">Tayyorlaning...</div>
        )}
        
        {(gameState === 'showing' || gameState === 'input' || gameState === 'feedback') && (
          <div className={`text-6xl font-bold tracking-wider text-foreground transition-all duration-300 ${gameState === 'showing' ? 'scale-110' : 'scale-100'}`}>
            {displayContent}
          </div>
        )}
        
        {gameState === 'input' && (
          <div className="mt-8 h-16 min-w-[120px] px-6 bg-[var(--surface)] rounded-2xl flex items-center justify-center text-4xl font-bold text-foreground border border-[var(--foreground-muted)]/20 shadow-sm">
            {userInput}
            <span className="animate-pulse text-orange-500">|</span>
          </div>
        )}
      </div>

      {/* Numpad */}
      <div className={`grid grid-cols-3 gap-1 pb-2 transition-opacity duration-300 ${gameState === 'input' ? 'opacity-100 pointer-events-auto' : 'opacity-50 pointer-events-none'}`}>
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num.toString())}
            className="h-20 rounded-lg bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] hover:opacity-90 text-white text-2xl font-semibold shadow-md shadow-orange-900/20 active:scale-95 transition-transform flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        
        <button
          onClick={handleClear}
          className="h-20 rounded-lg bg-[var(--surface)] text-foreground text-lg font-medium active:scale-95 transition-transform flex items-center justify-center shadow-sm border border-[var(--foreground-muted)]/10"
        >
          Tozalash
        </button>
        
        <button
          onClick={() => handleNumberClick("0")}
          className="h-20 rounded-lg bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] hover:opacity-90 text-white text-2xl font-semibold shadow-md shadow-orange-900/20 active:scale-95 transition-transform flex items-center justify-center"
        >
          0
        </button>
        
        <button
          onClick={checkAnswer}
          className="h-20 rounded-lg bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] hover:opacity-90 text-white text-xl font-medium active:scale-95 transition-transform flex items-center justify-center shadow-md shadow-orange-900/20"
        >
          ✓
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-2 pb-4 pt-0">
        <button
          onClick={() => handleNumberClick("-")}
          className={`p-4 rounded-xl bg-[var(--surface)] text-foreground text-xl font-medium active:scale-95 transition-transform flex items-center justify-center shadow-sm border border-[var(--foreground-muted)]/10 ${userInput === "" ? "opacity-100" : "opacity-50"}`}
        >
          -
        </button>
        <button
          onClick={handleDelete}
          className="p-4 rounded-xl bg-[var(--surface)] text-foreground text-xl font-medium active:scale-95 transition-transform flex items-center justify-center shadow-sm border border-[var(--foreground-muted)]/10"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
