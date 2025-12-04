"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { initializeUserSession } from "@/lib/userSession";
import { updateScoreAndGems, getMinigameIdByCode } from "@/lib/gamification";
import { supabase } from "@/lib/supabase";

const INITIAL_TIME = 60;
const PROGRESS_INTERVAL = 100;
const CORRECT_STREAK_FOR_LEVEL_UP = 4;
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

type Card = {
  id: number;
  content: string;
  value: number;
  state: "hidden" | "selected" | "matched";
};

const generatePair = (idStart: number, maxRange: number): Card[] => {
  const target = Math.floor(Math.random() * Math.min(maxRange, 50)) + 1;
  const cards: Card[] = [];

  // Card 1: The number
  cards.push({
    id: idStart,
    content: target.toString(),
    value: target,
    state: "hidden",
  });

  // Card 2: An expression
  const ops = ["+", "-", "*", "/"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let expr = "";
  
  if (op === "+") {
    const a = Math.floor(Math.random() * target); 
    const b = target - a;
    expr = `${a} + ${b}`;
  } else if (op === "-") {
    const b = Math.floor(Math.random() * Math.min(10, maxRange / 5)) + 1;
    const a = target + b;
    expr = `${a} - ${b}`;
  } else if (op === "*") {
    const factors = [];
    for(let i=1; i<=target; i++) {
      if (target % i === 0) factors.push(i);
    }
    const a = factors[Math.floor(Math.random() * factors.length)];
    const b = target / a;
    expr = `${a} * ${b}`;
  } else { // "/"
    const b = Math.floor(Math.random() * 5) + 1;
    const a = target * b;
    expr = `${a} / ${b}`;
  }
  
  cards.push({
    id: idStart + 1,
    content: expr,
    value: target,
    state: "hidden",
  });

  return cards;
};

const generateCards = (maxRange: number): Card[] => {
  const pairsCount = 6; // 3x4 grid
  let cards: Card[] = [];
  let idCounter = 0;

  for (let i = 0; i < pairsCount; i++) {
    cards = [...cards, ...generatePair(idCounter, maxRange)];
    idCounter += 2;
  }
  
  // Shuffle
  return cards.sort(() => Math.random() - 0.5);
};

interface MathPairsGameProps {
  onBack: () => void;
}

type GamePhase = 'tutorial' | 'playing' | 'finished';

export default function MathPairsGame({ onBack }: MathPairsGameProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>('tutorial');
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);
  
  const [cards, setCards] = useState<Card[]>([]);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
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
          .eq('code', 'matching_cards')
          .single();

        if (minigameError || !minigame) {
          console.error('Failed to fetch minigame:', minigameError);
          setLevels([
            { id: '1', level: 1, number_range_min: 1, number_range_max: 20, question_count: 10 },
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
            { id: '1', level: 1, number_range_min: 1, number_range_max: 20, question_count: 10 },
            { id: '2', level: 2, number_range_min: 1, number_range_max: 50, question_count: 25 },
            { id: '3', level: 3, number_range_min: 1, number_range_max: 100, question_count: 35 },
          ]);
        } else {
          setLevels(levelData);
        }
      } catch (error) {
        console.error('Error fetching levels:', error);
        setLevels([
          { id: '1', level: 1, number_range_min: 1, number_range_max: 20, question_count: 10 },
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
          const minigameId = await getMinigameIdByCode("matching_cards");
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

  // Timer
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
          return INITIAL_TIME;
        }
        return prev - (PROGRESS_INTERVAL / 1000);
      });
    }, PROGRESS_INTERVAL);

    return () => clearInterval(timer);
  }, [gamePhase]);

  const handleCardClick = (clickedId: number) => {
    if (isProcessing || gamePhase !== 'playing') return;
    
    const clickedCard = cards.find(c => c.id === clickedId);
    if (!clickedCard || clickedCard.state !== "hidden") return;

    // Reveal card
    setCards(prev => prev.map(c => c.id === clickedId ? { ...c, state: "selected" } : c));
    
    const newSelected = [...selectedIds, clickedId];
    setSelectedIds(newSelected);

    if (newSelected.length === 2) {
      setIsProcessing(true);
      checkMatch(newSelected[0], newSelected[1]);
    }
  };

  const checkMatch = useCallback((id1: number, id2: number) => {
    setCards(prev => {
      const card1 = prev.find(c => c.id === id1);
      const card2 = prev.find(c => c.id === id2);
      
      if (!card1 || !card2) return prev;

      const isMatch = card1.value === card2.value;

      if (isMatch) {
        setTimeout(() => {
          setCards(current => current.map(c => 
            (c.id === id1 || c.id === id2) ? { ...c, state: "matched" } : c
          ));
          setScore(s => s + 10);
          
          const newStreak = correctStreak + 1;
          setCorrectStreak(newStreak);
          
          if (newStreak >= CORRECT_STREAK_FOR_LEVEL_UP && currentLevelIndex < levels.length - 1) {
            setCurrentLevelIndex((idx) => idx + 1);
            setCorrectStreak(0);
          }
          
          setSelectedIds([]);
          setIsProcessing(false);
        }, 500);
      } else {
        setTimeout(() => {
          setCards(current => current.map(c => 
            (c.id === id1 || c.id === id2) ? { ...c, state: "hidden" } : c
          ));
          playHeartBreakSound();
          setHearts(h => {
            const newHearts = h - 1;
            if (newHearts <= 0) {
              setTimeout(() => setGamePhase('finished'), 500);
            }
            return newHearts;
          });
          setCorrectStreak(0);
          setSelectedIds([]);
          setIsProcessing(false);
        }, 1000);
      }
      
      return prev;
    });
  }, [correctStreak, currentLevelIndex, levels.length]);

  // Check if all matched, regenerate board
  const allMatched = cards.length > 0 && cards.every(c => c.state === "matched");
  
  useEffect(() => {
    if (allMatched && gamePhase === 'playing' && currentLevel) {
      setTimeout(() => {
        setCards(generateCards(currentLevel.number_range_max));
      }, 500);
    }
  }, [allMatched, gamePhase, currentLevel]);

  const startGame = () => {
    setGamePhase('playing');
    if (isFirstLoad.current && currentLevel) {
      isFirstLoad.current = false;
      setCards(generateCards(currentLevel.number_range_max));
    }
  };

  const restartGame = () => {
    setScore(0);
    setHearts(MAX_HEARTS);
    setTimeLeft(INITIAL_TIME);
    setCorrectStreak(0);
    setCurrentLevelIndex(0);
    setSelectedIds([]);
    setIsProcessing(false);
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
            <h2 className="text-xl font-bold text-center mb-6 text-foreground">🃏 Matematik Juftliklar</h2>
            
            <div className="bg-background rounded-2xl p-4 mb-5 relative overflow-hidden border border-[var(--foreground-muted)]/20 mx-2 shadow-inner">
              {/* Mini Card Grid - showing match example */}
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                <div className="aspect-[4/5] rounded-lg bg-[var(--surface)] border border-[var(--foreground-muted)]/20 flex items-center justify-center">
                  <span className="text-sm text-[var(--foreground-muted)] opacity-50">?</span>
                </div>
                <div className="aspect-[4/5] rounded-lg bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] flex items-center justify-center shadow-sm">
                  <span className="text-[10px] text-white font-bold">4</span>
                </div>
                <div className="aspect-[4/5] rounded-lg bg-[var(--surface)] border border-[var(--foreground-muted)]/20 flex items-center justify-center">
                  <span className="text-sm text-[var(--foreground-muted)] opacity-50">?</span>
                </div>
                <div className="aspect-[4/5] rounded-lg bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] flex items-center justify-center shadow-sm">
                  <span className="text-[8px] text-white font-bold">2 + 2</span>
                </div>
              </div>
              
              <div className="text-center">
                <span className="text-[10px] text-green-500 font-medium">✓ Mos keldi!</span>
              </div>
            </div>

            <p className="text-center text-[var(--foreground-muted)] text-sm mb-6 leading-relaxed px-4">
              Bir xil qiymatga ega kartochkalarni toping.<br/>
              Raqamni uning matematik tenglamasi bilan moslang.<br/>
              Qanchalik ko'p moslasangiz, raqamlar kattalashadi.
            </p>

            <div className="flex flex-col gap-2 mb-6 px-8">
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">+10 💎</span>
                <span className="text-[var(--foreground-muted)] text-sm">mos kelganda</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">❤️ → 💔</span>
                <span className="text-[var(--foreground-muted)] text-sm">mos kelmaganda yurak sinadi</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">3 ❤️</span>
                <span className="text-[var(--foreground-muted)] text-sm">barcha yuraklar sinsa, o'yin tugaydi</span>
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
      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in">
        <div className="w-full max-w-md bg-[var(--surface)] rounded-3xl p-8 border border-[var(--foreground-muted)]/10 shadow-2xl text-center mx-4">
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
    );
  }

  // Playing
  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden font-sans">
      {/* Top Nav */}
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

      {/* Timer Bar */}
      <div className="w-full h-3 bg-[var(--surface)] rounded-full mb-4 overflow-hidden border border-[var(--foreground-muted)]/20">
        <div 
          className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-[width] duration-100 ease-linear" 
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

      <div className="flex items-center justify-center gap-2 text-[var(--foreground-muted)] mb-4">
        <span className="uppercase tracking-widest text-sm font-semibold">MATEMATIK JUFTLIKLAR</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2 px-4">
        {cards.map((card) => {
          const isHidden = card.state === "hidden";
          const isMatched = card.state === "matched";
          const isSelected = card.state === "selected";
          
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={isProcessing || isMatched}
              className={`aspect-[4/5] rounded-2xl border-2 text-2xl font-bold flex items-center justify-center relative overflow-hidden ${
                isHidden
                  ? "bg-[var(--surface)] border-[var(--foreground-muted)]/20 text-[var(--foreground-muted)] hover:border-[var(--foreground-muted)]/40 transition-all duration-200 hover:scale-105 active:scale-95"
                  : isMatched
                  ? "bg-[var(--surface)]/50 border-[var(--foreground-muted)]/10 text-[var(--foreground-muted)] opacity-50 scale-95 transition-all duration-300"
                  : "bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#ef4444_100%)] border-transparent text-white shadow-[0_0_15px_rgba(245,158,11,0.5)] shadow-lg shadow-orange-900/20 transition-all duration-300 scale-105 animate-in zoom-in-95"
              }`}
            >
              {isHidden ? (
                <span className="text-3xl opacity-50 select-none">?</span>
              ) : (
                <span className="animate-in fade-in zoom-in-95 duration-300">
                  {card.content.replace('*', '×').replace('/', '÷')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
