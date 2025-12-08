"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { initializeUserSession } from "@/lib/userSession";
import { updateScoreAndGems, getMinigameIdByCode } from "@/lib/gamification";
import { supabase } from "@/lib/supabase";

const ROWS = 4;
const CORRECT_STREAK_FOR_LEVEL_UP = 2;
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

type Cell = {
  row: number;
  col: number;
  value: number;
  userInput: string;
  isFixed: boolean;
  isCorrect: boolean;
};

interface NumberPyramidGameProps {
  onBack: () => void;
}

type GamePhase = 'tutorial' | 'playing' | 'finished';

export default function NumberPyramidGame({ onBack }: NumberPyramidGameProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>('tutorial');
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);
  
  const [pyramid, setPyramid] = useState<Cell[]>([]);
  const [selectedCell, setSelectedCell] = useState<{r: number, c: number} | null>(null);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [level, setLevel] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(120);
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
          .eq('code', 'number_pyramid')
          .single();

        if (minigameError || !minigame) {
          console.error('Failed to fetch minigame:', minigameError);
          setLevels([
            { id: '1', level: 1, number_range_min: 10, number_range_max: 30, question_count: 10 },
            { id: '2', level: 2, number_range_min: 20, number_range_max: 60, question_count: 25 },
            { id: '3', level: 3, number_range_min: 30, number_range_max: 99, question_count: 35 },
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
            { id: '1', level: 1, number_range_min: 10, number_range_max: 30, question_count: 10 },
            { id: '2', level: 2, number_range_min: 20, number_range_max: 60, question_count: 25 },
            { id: '3', level: 3, number_range_min: 30, number_range_max: 99, question_count: 35 },
          ]);
        } else {
          setLevels(levelData);
        }
      } catch (error) {
        console.error('Error fetching levels:', error);
        setLevels([
          { id: '1', level: 1, number_range_min: 10, number_range_max: 30, question_count: 10 },
          { id: '2', level: 2, number_range_min: 20, number_range_max: 60, question_count: 25 },
          { id: '3', level: 3, number_range_min: 30, number_range_max: 99, question_count: 35 },
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
          const minigameId = await getMinigameIdByCode("number_pyramid");
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

  const formatTime = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const generatePuzzle = useCallback(() => {
    if (!currentLevel) return;
    
    const minVal = currentLevel.number_range_min + Math.floor(level * 2);
    const maxVal = currentLevel.number_range_max + level * 5;
    const bottomRowValues: number[] = [];
    for (let i = 0; i < ROWS; i++) {
      bottomRowValues.push(Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal);
    }

    const grid: number[][] = Array(ROWS).fill(null).map(() => []);
    grid[ROWS - 1] = bottomRowValues;

    for (let r = ROWS - 2; r >= 0; r--) {
      for (let c = 0; c <= r; c++) {
        grid[r][c] = grid[r+1][c] + grid[r+1][c+1];
      }
    }

    const newPyramid: Cell[] = [];
    
    const allPositions: {r: number, c: number}[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= r; c++) {
        allPositions.push({r, c});
      }
    }

    const shuffled = [...allPositions].sort(() => Math.random() - 0.5);
    const fixedSet = new Set(shuffled.slice(0, 4).map(p => `${p.r},${p.c}`));

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= r; c++) {
        const isFixed = fixedSet.has(`${r},${c}`);
        
        newPyramid.push({
          row: r,
          col: c,
          value: grid[r][c],
          userInput: isFixed ? grid[r][c].toString() : "",
          isFixed: isFixed,
          isCorrect: isFixed,
        });
      }
    }

    setPyramid(newPyramid);
    setSelectedCell(null);
    setMessage(null);
  }, [level, currentLevel]);

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
          return 120;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [gamePhase]);

  const handleKeypadClick = (key: string) => {
    if (!selectedCell || gamePhase !== 'playing') return;

    setPyramid(prev => prev.map(cell => {
      if (cell.row === selectedCell.r && cell.col === selectedCell.c) {
        let newVal = cell.userInput;
        if (key === "Backspace") {
          newVal = newVal.slice(0, -1);
        } else if (key === "Done") {
          return cell;
        } else {
          if (newVal.length < 4) {
            newVal += key;
          }
        }
        return { ...cell, userInput: newVal };
      }
      return cell;
    }));

    if (key === "Done") {
      checkCompletion();
      setSelectedCell(null);
    }
  };

  const checkCompletion = () => {
    const allFilled = pyramid.every(c => c.isFixed || c.userInput !== "");
    if (!allFilled) return;

    const allCorrect = pyramid.every(c => c.isFixed || parseInt(c.userInput) === c.value);
    
    if (allCorrect) {
      const baseScore = 3;
      setScore(s => s + baseScore);
      setMessage("Ajoyib!");
      
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      
      if (newStreak >= CORRECT_STREAK_FOR_LEVEL_UP && currentLevelIndex < levels.length - 1) {
        setCurrentLevelIndex((idx) => idx + 1);
        setCorrectStreak(0);
      }
      
      setTimeout(() => {
        setLevel(l => l + 1);
        generatePuzzle();
        playTinTinSound();
      }, 1500);
    } else {
      setMessage("Hisobingizni tekshiring!");
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const startGame = () => {
    setGamePhase('playing');
    if (isFirstLoad.current && currentLevel) {
      isFirstLoad.current = false;
      generatePuzzle();
      setTimeLeft(120);
      playTinTinSound();
    }
  };

  const restartGame = () => {
    setScore(0);
    setHearts(MAX_HEARTS);
    setLevel(1);
    setCorrectStreak(0);
    setCurrentLevelIndex(0);
    setTimeLeft(120);
    setGamePhase('tutorial');
    isFirstLoad.current = true;
  };

  const CELL_W = 50;
  const CELL_H = 42;
  const GAP = 5;

  // Loading
  if (isLoadingLevels) {
    return (
      <div className="relative flex flex-col h-screen bg-black text-white p-4 max-w-md mx-auto overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  // Tutorial
  if (gamePhase === 'tutorial') {
    return (
      <div className="relative flex flex-col h-screen bg-black text-white p-3 max-w-md mx-auto overflow-hidden font-sans">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-[#1a1a1a] p-4 pb-5 rounded-3xl w-full border-t border-gray-800">
            <h2 className="text-lg font-bold text-white text-center mb-3">🔺 Raqamli Piramida</h2>
            
            <div className="bg-black/50 p-3 rounded-xl mb-3">
              <svg viewBox="0 0 200 120" className="w-full max-w-[160px] mx-auto mb-2">
                <defs>
                  <linearGradient id="demoPink" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#581c87" />
                    <stop offset="55%" stopColor="#9333ea" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                </defs>
                <rect x="75" y="5" width="50" height="30" rx="4" fill="url(#demoPink)" />
                <text x="100" y="26" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">283</text>
                <rect x="48" y="40" width="50" height="30" rx="4" fill="url(#demoPink)" />
                <text x="73" y="61" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">159</text>
                <rect x="102" y="40" width="50" height="30" rx="4" fill="#1f1f1f" stroke="#333" />
                <text x="127" y="61" textAnchor="middle" fill="#666" fontSize="12" fontWeight="bold">?</text>
                <rect x="21" y="75" width="50" height="30" rx="4" fill="url(#demoPink)" />
                <text x="46" y="96" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">50</text>
                <rect x="75" y="75" width="50" height="30" rx="4" fill="#1f1f1f" stroke="#333" />
                <rect x="129" y="75" width="50" height="30" rx="4" fill="url(#demoPink)" />
                <text x="154" y="96" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">18</text>
              </svg>
              
              <p className="text-white font-bold text-center text-sm">ikki katakchaning yig'indisi<br/>yuqori katakchada</p>
            </div>
            
            <p className="text-gray-400 text-xs text-center mb-4 leading-relaxed">
              Ketma-ket katakchalarning yig'indisi yuqori katakchaga joylashtirilishi kerak. Qanchalik ko'p to'g'ri yechsangiz, raqamlar kattalashadi.
            </p>

            <div className="flex flex-col gap-1.5 mb-4 px-6 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">+3 💎</span>
                <span className="text-gray-500 text-[10px]">har bir to'g'ri piramida</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">❤️ → 💔</span>
                <span className="text-gray-500 text-[10px]">vaqt tugaganda yurak sinadi</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">3 ❤️</span>
                <span className="text-gray-500 text-[10px]">barcha yuraklar sinsa, o'yin tugaydi</span>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold tracking-wide shadow-lg shadow-blue-900/20 active:scale-95 transition-transform uppercase text-xs"
            >
              BOSHLASH
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Finished
  if (gamePhase === 'finished') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="text-center text-white p-8">
          <div className="text-6xl mb-4">💔</div>
          <h2 className="text-3xl font-bold mb-2">O'yin tugadi!</h2>
          <p className="text-gray-400 mb-4">Barcha yuraklar tugadi</p>
          <p className="text-xl mb-2">Ball: {score}</p>
          <p className="text-lg mb-6 text-gray-400">Erishilgan daraja: {currentLevelIndex + 1}</p>
          <button onClick={restartGame} className="px-8 py-3 rounded-full font-bold mb-4" style={{ background: 'linear-gradient(135deg, #581c87 0%, #9333ea 55%, #e11d48 100%)' }}>Qayta o'ynash</button>
          <div><button onClick={handleBack} className="text-gray-400">Chiqish</button></div>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div className="relative flex flex-col h-screen text-white p-3 max-w-md mx-auto overflow-hidden font-sans bg-black">
      {/* Header */}
      <div className="relative z-30 flex items-center justify-between mb-1.5 px-2 py-2">
        <button onClick={handleBack} className="w-8 h-8 rounded-full flex items-center justify-center bg-[#1a1a1a] text-white border border-gray-700">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>

        {/* Hearts Display */}
        <div className="flex items-center gap-1 ml-8">
          {Array.from({ length: MAX_HEARTS }).map((_, idx) => (
            <span 
              key={idx} 
              className={`text-xl transition-all duration-300 ${
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
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-lg font-bold">
            <span>💎</span><span>{score}</span>
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="h-2.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden mb-2">
        <div 
          className="h-full rounded-full transition-all duration-100" 
          style={{ 
            width: `${(timeLeft / 120) * 100}%`, 
            background: 'linear-gradient(90deg, #581c87, #9333ea, #e11d48)' 
          }} 
        />
      </div>

      {/* Streak Progress */}
      {currentLevelIndex < levels.length - 1 && (
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex gap-1">
            {Array.from({ length: CORRECT_STREAK_FOR_LEVEL_UP }).map((_, idx) => (
              <div 
                key={idx}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx < correctStreak 
                    ? 'bg-green-500 scale-110' 
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Title */}
      <div className="text-center mb-2">
        <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">
          RAQAMLI PIRAMIDA
        </div>
        {message && <div className="text-base font-bold text-[#9333ea] animate-bounce mt-1.5">{message}</div>}
      </div>

      {/* Pyramid */}
      <div className="flex-1 flex items-center justify-center">
        <svg 
          viewBox={`0 0 ${ROWS * (CELL_W + GAP)} ${ROWS * (CELL_H + GAP) + 30}`} 
          className="w-full max-w-[280px]"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="pinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#581c87" />
              <stop offset="55%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
          
          {Array(ROWS).fill(0).map((_, r) => {
            const rowWidth = (r + 1) * CELL_W + r * GAP;
            const xStart = (ROWS * (CELL_W + GAP) - rowWidth) / 2;
            const y = r * (CELL_H + GAP) + 20;
            
            return (
              <g key={`row-${r}`}>
                <line 
                  x1={xStart - 2} 
                  y1={y + CELL_H + 2} 
                  x2={xStart + rowWidth + 2} 
                  y2={y + CELL_H + 2}
                  stroke="#333"
                  strokeWidth="1"
                />
                {Array(r + 2).fill(0).map((_, c) => (
                  <line
                    key={`vline-${r}-${c}`}
                    x1={xStart + c * (CELL_W + GAP) - GAP/2}
                    y1={y}
                    x2={xStart + c * (CELL_W + GAP) - GAP/2}
                    y2={y + CELL_H + 2}
                    stroke="#333"
                    strokeWidth="1"
                  />
                ))}
              </g>
            );
          })}

          {pyramid.map((cell) => {
            const rowWidth = (cell.row + 1) * CELL_W + cell.row * GAP;
            const xStart = (ROWS * (CELL_W + GAP) - rowWidth) / 2;
            const x = xStart + cell.col * (CELL_W + GAP);
            const y = cell.row * (CELL_H + GAP) + 20;
            
            const isSelected = selectedCell?.r === cell.row && selectedCell?.c === cell.col;
            const hasValue = cell.userInput !== "";
            
            return (
              <g 
                key={`${cell.row}-${cell.col}`} 
                onClick={() => !cell.isFixed && setSelectedCell({ r: cell.row, c: cell.col })}
                style={{ cursor: cell.isFixed ? 'default' : 'pointer' }}
              >
                <rect
                  x={x}
                  y={y}
                  width={CELL_W}
                  height={CELL_H}
                  rx={4}
                  fill={cell.isFixed 
                    ? 'url(#pinkGrad)' 
                    : isSelected 
                      ? '#581c87' 
                      : hasValue 
                        ? '#1f1f1f' 
                        : '#0a0a0a'
                  }
                  stroke={isSelected ? '#9333ea' : cell.isFixed ? 'transparent' : '#333'}
                  strokeWidth={isSelected ? 2 : 1}
                />
                <text
                  x={x + CELL_W / 2}
                  y={y + CELL_H / 2 + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize={cell.value > 99 ? "10" : "13"}
                  fontWeight="bold"
                  fontFamily="system-ui, sans-serif"
                >
                  {cell.isFixed ? cell.value : cell.userInput}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto w-full pb-3">
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(num => (
          <button
            key={num}
            onClick={() => handleKeypadClick(num.toString())}
            className="h-14 rounded-xl text-white text-lg font-bold transition-all active:scale-95"
            style={{ 
              background: 'linear-gradient(135deg, #581c87 0%, #9333ea 55%, #e11d48 100%)',
              boxShadow: '0 3px 0 #3b0764'
            }}
          >
            {num}
          </button>
        ))}
        <button 
          onClick={() => handleKeypadClick("Done")} 
          className="h-14 rounded-xl bg-[#1f1f1f] text-gray-300 text-xs font-bold flex items-center justify-center transition-all active:scale-95"
          style={{ boxShadow: '0 3px 0 #000' }}
        >
          Tayyor
        </button>
        <button 
          onClick={() => handleKeypadClick("0")} 
          className="h-14 rounded-xl text-white text-lg font-bold transition-all active:scale-95"
          style={{ 
            background: 'linear-gradient(135deg, #581c87 0%, #9333ea 55%, #e11d48 100%)',
            boxShadow: '0 3px 0 #3b0764'
          }}
        >
          0
        </button>
        <button 
          onClick={() => handleKeypadClick("Backspace")} 
          className="h-14 rounded-xl bg-[#1f1f1f] text-white flex items-center justify-center transition-all active:scale-95"
          style={{ boxShadow: '0 3px 0 #000' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
