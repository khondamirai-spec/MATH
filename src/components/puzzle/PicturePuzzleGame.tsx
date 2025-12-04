"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { initializeUserSession } from "@/lib/userSession";
import { updateScoreAndGems, getMinigameIdByCode } from "@/lib/gamification";
import { supabase } from "@/lib/supabase";

const TIMER_DURATION = 40;
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

type Shape = "square" | "circle" | "triangle";

interface Puzzle {
  equations: {
    shapes: Shape[];
    result: number;
  }[];
  finalEquation: {
    shapes: Shape[];
  };
  solution: {
    square: number;
    circle: number;
    triangle: number;
    finalAnswer: number;
  };
}

const generatePuzzle = (maxRange: number): Puzzle => {
  const maxVal = Math.min(maxRange, 15);
  const square = Math.floor(Math.random() * maxVal) + 1;
  const circle = Math.floor(Math.random() * maxVal) + 1;
  const triangle = Math.floor(Math.random() * maxVal) + 1;

  const equations = [
    {
      shapes: ["square", "square", "square"] as Shape[],
      result: square * 3,
    },
    {
      shapes: ["square", "circle", "circle"] as Shape[],
      result: square + circle * 2,
    },
    {
      shapes: ["circle", "triangle", "triangle"] as Shape[],
      result: circle + triangle * 2,
    },
  ];

  const finalEquation = {
    shapes: ["square", "circle", "triangle"] as Shape[],
  };

  return {
    equations,
    finalEquation,
    solution: {
      square,
      circle,
      triangle,
      finalAnswer: square + circle + triangle,
    },
  };
};

const ShapeIcon = ({ shape, size = 40 }: { shape: Shape; size?: number }) => {
  const className = "stroke-[#7c3aed] stroke-[2.5] fill-none";
  
  if (shape === "square") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <rect x="3" y="3" width="18" height="18" rx="1" />
      </svg>
    );
  } else if (shape === "circle") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  } else {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <path d="M12 3L3 21h18L12 3z" />
      </svg>
    );
  }
};

interface PicturePuzzleGameProps {
  onBack: () => void;
}

type GamePhase = 'tutorial' | 'playing' | 'finished';

export default function PicturePuzzleGame({ onBack }: PicturePuzzleGameProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>('tutorial');
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);
  
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
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
          .eq('code', 'picture_equation')
          .single();

        if (minigameError || !minigame) {
          console.error('Failed to fetch minigame:', minigameError);
          setLevels([
            { id: '1', level: 1, number_range_min: 1, number_range_max: 5, question_count: 10 },
            { id: '2', level: 2, number_range_min: 1, number_range_max: 10, question_count: 25 },
            { id: '3', level: 3, number_range_min: 1, number_range_max: 15, question_count: 35 },
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
            { id: '1', level: 1, number_range_min: 1, number_range_max: 5, question_count: 10 },
            { id: '2', level: 2, number_range_min: 1, number_range_max: 10, question_count: 25 },
            { id: '3', level: 3, number_range_min: 1, number_range_max: 15, question_count: 35 },
          ]);
        } else {
          setLevels(levelData);
        }
      } catch (error) {
        console.error('Error fetching levels:', error);
        setLevels([
          { id: '1', level: 1, number_range_min: 1, number_range_max: 5, question_count: 10 },
          { id: '2', level: 2, number_range_min: 1, number_range_max: 10, question_count: 25 },
          { id: '3', level: 3, number_range_min: 1, number_range_max: 15, question_count: 35 },
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
          const minigameId = await getMinigameIdByCode("picture_equation");
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

  const loadNewPuzzle = useCallback((playSound: boolean = true) => {
    if (!currentLevel) return;
    
    setPuzzle(generatePuzzle(currentLevel.number_range_max));
    setUserAnswer("");
    setFeedback(null);
    if (playSound) {
      playTinTinSound();
    }
  }, [currentLevel]);

  // Timer countdown
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          playHeartBreakSound();
          setHearts((h) => {
            const newHearts = h - 1;
            if (newHearts <= 0) {
              setTimeout(() => setGamePhase('finished'), 500);
              return 0;
            }
            return newHearts;
          });
          if (hearts > 1) {
            loadNewPuzzle();
          }
          return TIMER_DURATION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase, loadNewPuzzle, hearts]);

  const handleNumberClick = (num: string) => {
    if (feedback === "correct") return;
    
    if (num === "clear") {
      setUserAnswer("");
      setFeedback(null);
    } else if (num === "backspace") {
      setUserAnswer((prev) => prev.slice(0, -1));
      setFeedback(null);
    } else {
      const newAnswer = userAnswer + num;
      if (newAnswer.length <= 2) {
        setUserAnswer(newAnswer);
        setFeedback(null);
        
        // Auto-check answer
        if (puzzle) {
          const answer = parseInt(newAnswer, 10);
          if (answer === puzzle.solution.finalAnswer) {
            setFeedback("correct");
            setScore((s) => s + 2);
            
            const newStreak = correctStreak + 1;
            setCorrectStreak(newStreak);
            
            if (newStreak >= CORRECT_STREAK_FOR_LEVEL_UP && currentLevelIndex < levels.length - 1) {
              setCurrentLevelIndex((idx) => idx + 1);
              setCorrectStreak(0);
            }
            
            setTimeout(() => {
              loadNewPuzzle();
            }, 1000);
          } else if (newAnswer.length === 2) {
            // Wrong answer after 2 digits
            setFeedback("wrong");
            playHeartBreakSound();
            setHearts((h) => {
              const newHearts = h - 1;
              if (newHearts <= 0) {
                setTimeout(() => setGamePhase('finished'), 800);
              }
              return newHearts;
            });
            setCorrectStreak(0);
            setTimeout(() => {
              setUserAnswer("");
              setFeedback(null);
            }, 800);
          }
        }
      }
    }
  };

  const startGame = () => {
    setGamePhase('playing');
    if (isFirstLoad.current && currentLevel) {
      isFirstLoad.current = false;
      loadNewPuzzle(true);
    }
  };

  const restartGame = () => {
    setScore(0);
    setHearts(MAX_HEARTS);
    setTimeLeft(TIMER_DURATION);
    setCorrectStreak(0);
    setCurrentLevelIndex(0);
    setUserAnswer("");
    setFeedback(null);
    setGamePhase('tutorial');
    isFirstLoad.current = true;
  };

  // Loading
  if (isLoadingLevels) {
    return (
      <div className="relative flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)] p-4 max-w-md mx-auto overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  // Finished
  if (gamePhase === 'finished') {
    return (
      <div className="relative flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)] p-4 max-w-md mx-auto overflow-hidden">
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
                className="w-full py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold tracking-wide shadow-lg shadow-purple-900/20 active:scale-95 transition-transform"
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
  if (gamePhase === 'tutorial') {
    return (
      <div className="relative flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)] p-4 max-w-md mx-auto overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-[#1a1a1a] p-6 pb-8 rounded-3xl w-full border-t border-gray-800">
            <h2 className="text-2xl font-bold text-white text-center mb-4">🖼️ Rasm Boshqotirma</h2>
            
            <div className="bg-black/50 p-4 rounded-xl mb-4">
              <div className="flex flex-col gap-3 items-center mb-3">
                <div className="flex items-center gap-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-[#7c3aed] stroke-[2.5] fill-none">
                    <rect x="3" y="3" width="18" height="18" rx="1" />
                  </svg>
                  <span className="text-gray-400 text-sm">+</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-[#7c3aed] stroke-[2.5] fill-none">
                    <rect x="3" y="3" width="18" height="18" rx="1" />
                  </svg>
                  <span className="text-gray-400 text-sm">+</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-[#7c3aed] stroke-[2.5] fill-none">
                    <rect x="3" y="3" width="18" height="18" rx="1" />
                  </svg>
                  <span className="text-gray-400 text-sm mx-1">=</span>
                  <span className="text-white font-bold">9</span>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-[#7c3aed] stroke-[2.5] fill-none">
                    <rect x="3" y="3" width="18" height="18" rx="1" />
                  </svg>
                  <span className="text-gray-400 text-sm">+</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-[#7c3aed] stroke-[2.5] fill-none">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  <span className="text-gray-400 text-sm mx-1">=</span>
                  <div className="w-8 h-8 rounded-full bg-[#4a4a4a] flex items-center justify-center">
                    <span className="text-gray-400 text-sm">?</span>
                  </div>
                </div>
              </div>
              
              <p className="text-white font-bold text-center text-lg">Har bir shaklning<br/>qiymatini toping</p>
            </div>
            
            <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
              Berilgan tenglamalardan har bir shakl raqamini toping va oxirgi tenglamani yeching. Qanchalik ko'p to'g'ri yechsangiz, raqamlar kattalashadi.
            </p>

            <div className="flex flex-col gap-2 mb-6 px-8 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">+2 💎</span>
                <span className="text-gray-500">to'g'ri javob uchun</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">❤️ → 💔</span>
                <span className="text-gray-500">noto'g'ri javobda yurak sinadi</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">3 ❤️</span>
                <span className="text-gray-500">barcha yuraklar sinsa, o'yin tugaydi</span>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold tracking-wide shadow-lg shadow-blue-900/20 active:scale-95 transition-transform uppercase text-sm"
            >
              BOSHLASH
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div className="relative flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)] max-w-md mx-auto overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="relative z-30 flex items-center justify-between mb-2 px-4 py-3">
        <button 
          onClick={handleBack}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--surface)] text-[var(--foreground)] border border-[var(--foreground-muted)]/20 shadow-md hover:scale-105 transition-all"
          aria-label="Back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                    ? 'bg-purple-500' 
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

      {/* Progress Bar / Timer */}
      <div className="w-full h-2.5 bg-[var(--foreground-muted)]/30 relative overflow-hidden rounded-full border border-[var(--foreground-muted)]/40">
        <div 
          className="h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(139,92,246,0.5)]"
          style={{ 
            width: `${(timeLeft / TIMER_DURATION) * 100}%`,
            background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 55%, #db2777 100%)'
          }}
        />
      </div>

      {/* Streak Progress */}
      {currentLevelIndex < levels.length - 1 && (
        <div className="flex items-center justify-center gap-2 py-3">
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
      <div className="flex items-center justify-center gap-2 py-2">
        <span className="uppercase tracking-[0.2em] text-sm font-medium text-[var(--foreground-muted)]">Rasm Boshqotirma</span>
      </div>

      {/* Puzzle Display */}
      <div className="flex-1 flex flex-col justify-center gap-5 px-6">
        {puzzle && (
          <>
            {/* Equations */}
            {puzzle.equations.map((eq, idx) => (
              <div key={idx} className="flex items-center justify-center gap-3">
                {eq.shapes.map((shape, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <ShapeIcon shape={shape} size={40} />
                    {i < eq.shapes.length - 1 && (
                      <span className="text-white text-xl font-light">+</span>
                    )}
                  </div>
                ))}
                <span className="text-white text-xl font-light mx-2">=</span>
                <span className="text-white text-2xl font-medium w-8 text-center">{eq.result}</span>
              </div>
            ))}

            {/* Final Equation */}
            <div className="flex items-center justify-center gap-3 mt-2">
              {puzzle.finalEquation.shapes.map((shape, i) => (
                <div key={i} className="flex items-center gap-3">
                  <ShapeIcon shape={shape} size={40} />
                  {i < puzzle.finalEquation.shapes.length - 1 && (
                    <span className="text-white text-xl font-light">+</span>
                  )}
                </div>
              ))}
              <span className="text-white text-xl font-light mx-2">=</span>
              <div className="w-14 h-14 rounded-full bg-[#4a4a4a] flex items-center justify-center">
                {feedback === "correct" ? (
                  <span className="text-2xl text-green-400">✓</span>
                ) : feedback === "wrong" ? (
                  <span className="text-2xl text-red-400">✗</span>
                ) : userAnswer ? (
                  <span className="text-2xl text-white font-medium">{userAnswer}</span>
                ) : (
                  <span className="text-2xl text-gray-400">?</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="px-4 pb-6">
        <div className="grid grid-cols-3 gap-2">
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              disabled={feedback === "correct"}
              className="h-14 rounded-2xl text-white text-xl font-semibold shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 55%, #db2777 100%)' }}
            >
              {num}
            </button>
          ))}
          
          <button
            onClick={() => handleNumberClick("clear")}
            disabled={feedback === "correct"}
            className="h-14 rounded-2xl bg-[#2a2a2a] text-white text-sm font-medium hover:bg-[#3a3a3a] active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Tozalash
          </button>
          <button
            onClick={() => handleNumberClick("0")}
            disabled={feedback === "correct"}
            className="h-14 rounded-2xl text-white text-xl font-semibold shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 55%, #db2777 100%)' }}
          >
            0
          </button>
          <button
            onClick={() => handleNumberClick("backspace")}
            disabled={feedback === "correct"}
            className="h-14 rounded-2xl bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
