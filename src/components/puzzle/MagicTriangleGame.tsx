"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { initializeUserSession } from "@/lib/userSession";
import { updateScoreAndGems, getMinigameIdByCode } from "@/lib/gamification";
import { supabase } from "@/lib/supabase";

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

interface LevelConfig {
  id: string;
  level: number;
  number_range_min: number;
  number_range_max: number;
  question_count: number;
}

type NodePosition = {
  id: number;
  x: number;
  y: number;
  value: number | null;
};

const INITIAL_POSITIONS: Omit<NodePosition, "value">[] = [
  { id: 0, x: 50, y: 8 },
  { id: 1, x: 12, y: 85 },
  { id: 2, x: 88, y: 85 },
  { id: 3, x: 31, y: 46 },
  { id: 4, x: 69, y: 46 },
  { id: 5, x: 50, y: 85 },
];

const TRIANGLE_SIDES = [
  [0, 3, 1],
  [0, 4, 2],
  [1, 5, 2],
];

const TRIANGLE_LINES = [
  { from: 0, to: 3 },
  { from: 3, to: 1 },
  { from: 0, to: 4 },
  { from: 4, to: 2 },
  { from: 1, to: 5 },
  { from: 5, to: 2 },
];

// Helper to generate a valid magic triangle solution
// For 6 consecutive numbers starting at `min`: sum = 6*min + 15
// Target formula: 3T = corners_sum + total_sum, so T = (corners_sum + total_sum) / 3
// Valid corner sums must make (corners_sum + total_sum) divisible by 3
const generateValidSolution = (min: number, max: number): { numbers: number[]; targetSum: number; solution: number[] } => {
  // Use 6 consecutive numbers from the range
  const rangeSize = max - min + 1;
  const startOffset = rangeSize > 6 ? Math.floor(Math.random() * (rangeSize - 5)) : 0;
  const baseMin = min + startOffset;
  
  const numbers = [baseMin, baseMin + 1, baseMin + 2, baseMin + 3, baseMin + 4, baseMin + 5];
  const totalSum = numbers.reduce((a, b) => a + b, 0);
  
  // Find all valid corner combinations (sum divisible by 3 when added to totalSum)
  const validCornerSets: number[][] = [];
  
  // Try all combinations of 3 numbers from our 6 as corners
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      for (let k = j + 1; k < 6; k++) {
        const cornerSum = numbers[i] + numbers[j] + numbers[k];
        if ((cornerSum + totalSum) % 3 === 0) {
          validCornerSets.push([i, j, k]); // Store indices
        }
      }
    }
  }
  
  // Pick a random valid corner set
  const chosenCornerIndices = validCornerSets[Math.floor(Math.random() * validCornerSets.length)];
  const cornerValues = chosenCornerIndices.map(i => numbers[i]);
  const midpointIndices = [0, 1, 2, 3, 4, 5].filter(i => !chosenCornerIndices.includes(i));
  const midpointValues = midpointIndices.map(i => numbers[i]);
  
  const cornerSum = cornerValues.reduce((a, b) => a + b, 0);
  const targetSum = (cornerSum + totalSum) / 3;
  
  // Now we need to assign corners to positions 0, 1, 2 and midpoints to 3, 4, 5
  // Such that each side sums to targetSum
  // Sides: [0,3,1], [0,4,2], [1,5,2]
  // We'll try random permutations of corners until we find one that works
  
  const cornerPerms = [
    [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]
  ];
  
  // Shuffle permutations for variety
  const shuffledPerms = [...cornerPerms].sort(() => Math.random() - 0.5);
  
  for (const perm of shuffledPerms) {
    const c0 = cornerValues[perm[0]]; // position 0 (top)
    const c1 = cornerValues[perm[1]]; // position 1 (bottom-left)
    const c2 = cornerValues[perm[2]]; // position 2 (bottom-right)
    
    // Calculate required midpoints
    // Side [0,3,1]: c0 + m3 + c1 = T => m3 = T - c0 - c1
    // Side [0,4,2]: c0 + m4 + c2 = T => m4 = T - c0 - c2
    // Side [1,5,2]: c1 + m5 + c2 = T => m5 = T - c1 - c2
    const m3 = targetSum - c0 - c1;
    const m4 = targetSum - c0 - c2;
    const m5 = targetSum - c1 - c2;
    
    // Check if these midpoints are exactly our available midpoint values
    const requiredMidpoints = [m3, m4, m5].sort((a, b) => a - b);
    const availableMidpoints = [...midpointValues].sort((a, b) => a - b);
    
    if (requiredMidpoints.every((v, i) => v === availableMidpoints[i])) {
      // Valid solution found!
      const solution = new Array(6);
      solution[0] = c0;
      solution[1] = c1;
      solution[2] = c2;
      solution[3] = m3;
      solution[4] = m4;
      solution[5] = m5;
      
      return { numbers, targetSum, solution };
    }
  }
  
  // Fallback (shouldn't happen with valid corner sets)
  return generateValidSolution(min, max);
};

interface MagicTriangleGameProps {
  onBack: () => void;
}

type GamePhase = 'tutorial' | 'playing' | 'finished';

export default function MagicTriangleGame({ onBack }: MagicTriangleGameProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>('tutorial');
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isLoadingLevels, setIsLoadingLevels] = useState(true);

  const [nodes, setNodes] = useState<NodePosition[]>(
    INITIAL_POSITIONS.map((p) => ({ ...p, value: null }))
  );
  const [availableNumbers, setAvailableNumbers] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [targetSum, setTargetSum] = useState(9);
  const [currentSolution, setCurrentSolution] = useState<number[] | null>(null);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [timeLeft, setTimeLeft] = useState(120);
  const [message, setMessage] = useState<string | null>(null);
  const [level, setLevel] = useState(1);
  const [isWin, setIsWin] = useState(false);
  const [correctStreak, setCorrectStreak] = useState(0);

  const isFirstLoad = useRef(true);
  const currentLevel = levels[currentLevelIndex] || null;

  useEffect(() => {
    const fetchLevels = async () => {
      setIsLoadingLevels(true);
      try {
        const { data: minigame } = await supabase
          .from('minigames')
          .select('id')
          .eq('code', 'magic_triangle')
          .single();

        if (!minigame) {
          setLevels([
            { id: '1', level: 1, number_range_min: 1, number_range_max: 6, question_count: 10 },
            { id: '2', level: 2, number_range_min: 1, number_range_max: 9, question_count: 25 },
            { id: '3', level: 3, number_range_min: 1, number_range_max: 12, question_count: 35 },
          ]);
        } else {
          const { data: levelData } = await supabase
            .from('minigame_levels')
            .select('id, level, number_range_min, number_range_max, question_count')
            .eq('minigame_id', minigame.id)
            .order('level', { ascending: true });

          if (!levelData || levelData.length === 0) {
            setLevels([
              { id: '1', level: 1, number_range_min: 1, number_range_max: 6, question_count: 10 },
              { id: '2', level: 2, number_range_min: 1, number_range_max: 9, question_count: 25 },
              { id: '3', level: 3, number_range_min: 1, number_range_max: 12, question_count: 35 },
            ]);
          } else {
            setLevels(levelData);
          }
        }
      } catch {
        setLevels([
          { id: '1', level: 1, number_range_min: 1, number_range_max: 6, question_count: 10 },
          { id: '2', level: 2, number_range_min: 1, number_range_max: 9, question_count: 25 },
          { id: '3', level: 3, number_range_min: 1, number_range_max: 12, question_count: 35 },
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
          const minigameId = await getMinigameIdByCode("magic_triangle");
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
    // Use level configuration to determine number range
    const min = currentLevel?.number_range_min ?? 1;
    const max = currentLevel?.number_range_max ?? 6;
    
    // Generate a guaranteed solvable puzzle
    const { numbers, targetSum: newTarget, solution } = generateValidSolution(min, max);
    
    setTargetSum(newTarget);
    setCurrentSolution(solution);
    setNodes(INITIAL_POSITIONS.map((p) => ({ ...p, value: null })));
    setAvailableNumbers([...numbers].sort((a, b) => a - b));
    setSelectedNumber(null);
    setIsWin(false);
  }, [currentLevel]);

  const checkSolution = useCallback((currentNodes: NodePosition[]) => {
    if (currentNodes.some((n) => n.value === null)) return false;
    for (const side of TRIANGLE_SIDES) {
      const sum = side.reduce((acc, nodeId) => {
        const node = currentNodes.find((n) => n.id === nodeId);
        return acc + (node?.value || 0);
      }, 0);
      if (sum !== targetSum) return false;
    }
    return true;
  }, [targetSum]);

  const handleWin = useCallback(() => {
    setIsWin(true);
    const baseScore = 3;
    const timeBonus = Math.floor(timeLeft / 10);
    const totalScore = baseScore + timeBonus;
    setScore((s) => s + totalScore);
    setMessage(`+${totalScore}`);

    const newStreak = correctStreak + 1;
    setCorrectStreak(newStreak);

    if (newStreak >= CORRECT_STREAK_FOR_LEVEL_UP && currentLevelIndex < levels.length - 1) {
      setCurrentLevelIndex((idx) => idx + 1);
      setCorrectStreak(0);
    }

    setTimeout(() => {
      setMessage(null);
      setLevel((l) => l + 1);
      generatePuzzle();
    }, 1500);
  }, [timeLeft, generatePuzzle, correctStreak, currentLevelIndex, levels.length]);

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
          return 120; // Reset timer
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [gamePhase]);

  const handleNumberSelect = (num: number) => {
    if (gamePhase !== 'playing') return;
    setSelectedNumber(selectedNumber === num ? null : num);
  };

  const handleNodeClick = (nodeId: number) => {
    if (gamePhase !== 'playing') return;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (node.value !== null) {
      const valueToReturn = node.value;
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, value: null } : n)));
      // Add back to available numbers in sorted order
      setAvailableNumbers((prev) => {
        const newArr = [...prev, valueToReturn];
        return newArr.sort((a, b) => a - b);
      });
      // If clicked number was selected, deselect it
      if (selectedNumber === valueToReturn) {
        setSelectedNumber(null);
      }
      return;
    }

    if (selectedNumber !== null && node.value === null) {
      const newNodes = nodes.map((n) => n.id === nodeId ? { ...n, value: selectedNumber } : n);
      setNodes(newNodes);
      // Remove from available numbers
      setAvailableNumbers((prev) => prev.filter((n) => n !== selectedNumber));
      setSelectedNumber(null);

      if (checkSolution(newNodes)) {
        handleWin();
      }
    }
  };

  const startGame = () => {
    setGamePhase('playing');
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      generatePuzzle();
      setTimeLeft(120);
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

  const getSideSum = (sideIndex: number): number | null => {
    const side = TRIANGLE_SIDES[sideIndex];
    let hasAllValues = true;
    let sum = 0;
    for (const nodeId of side) {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.value === null) {
        hasAllValues = false;
        break;
      }
      sum += node.value;
    }
    return hasAllValues ? sum : null;
  };

  if (isLoadingLevels) {
    return (
      <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'tutorial') {
    return (
      <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden font-sans">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full bg-[var(--surface)] rounded-3xl p-6 pb-8 border border-[var(--foreground-muted)]/10 shadow-2xl">
            <h2 className="text-xl font-bold text-center mb-4 text-foreground">🔺 Sehrli Uchburchak</h2>
            
            <div className="bg-background p-4 rounded-xl mb-4 border border-[var(--foreground-muted)]/20">
              <div className="text-4xl font-bold text-foreground mb-3">🎯</div>
              <h3 className="text-foreground font-bold text-lg mb-2">6 ta raqamni uchburchakka joylashtiring</h3>
              
              <div className="relative w-24 h-24 mx-auto my-4">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <polygon points="50,10 10,90 90,90" fill="none" stroke="rgba(109,40,217,0.4)" strokeWidth="2"/>
                  {[
                    { x: 50, y: 10 },
                    { x: 10, y: 90 },
                    { x: 90, y: 90 },
                    { x: 30, y: 50 },
                    { x: 70, y: 50 },
                    { x: 50, y: 90 },
                  ].map((pos, i) => (
                    <circle key={i} cx={pos.x} cy={pos.y} r="8" fill="rgba(109,40,217,0.3)" />
                  ))}
                </svg>
              </div>
            </div>

            <p className="text-[var(--foreground-muted)] text-sm mb-4 leading-relaxed px-2">
              Har bir tomon yig'indisi <span className="text-[#c026d3] font-bold">maqsad raqamiga</span> teng bo'ladigan qilib joylashtiring. Daraja oshgani sari raqamlar kattaroq bo'ladi.
            </p>

            <div className="flex flex-col gap-2 mb-6 px-8">
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">+3 💎</span>
                <span className="text-[var(--foreground-muted)] text-sm">har bir yechim uchun</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">+bonus</span>
                <span className="text-[var(--foreground-muted)] text-sm">qolgan vaqt uchun</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">❤️ → 💔</span>
                <span className="text-[var(--foreground-muted)] text-sm">vaqt tugaganda yurak sinadi</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">3 ❤️</span>
                <span className="text-[var(--foreground-muted)] text-sm">barcha yuraklar sinsa, o'yin tugaydi</span>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full py-4 rounded-full text-white font-bold tracking-wide shadow-lg active:scale-95 transition-transform uppercase text-sm"
              style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #c026d3 100%)' }}
            >
              Boshlash
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'finished') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/90 backdrop-blur-md">
        <div className="bg-[var(--surface)] border border-[var(--foreground-muted)]/20 p-8 rounded-3xl w-full max-w-sm text-center">
          <div className="text-6xl mb-4">💔</div>
          <h2 className="text-3xl font-bold text-foreground mb-2">O'yin tugadi!</h2>
          <p className="text-[var(--foreground-muted)] mb-4">Barcha yuraklar tugadi</p>
          <p className="text-xl text-[var(--foreground-muted)] mb-2">Yakuniy ball: {score}</p>
          <p className="text-lg text-[var(--foreground-muted)] mb-8">Erishilgan daraja: {currentLevelIndex + 1}</p>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={restartGame}
              className="w-full py-3 text-white font-bold rounded-full hover:opacity-90 transition-opacity shadow-lg"
              style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #c026d3 100%)' }}
            >
              Qayta o'ynash
            </button>
            <button 
              onClick={handleBack}
              className="w-full py-3 bg-transparent border border-[var(--foreground-muted)]/20 text-foreground font-bold rounded-full hover:bg-[var(--surface)]/50 transition-colors"
            >
              Chiqish
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden font-sans">
      <div className="relative z-30 flex items-center justify-between mb-2 px-4 py-3">
        <button onClick={handleBack} className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--surface)] text-foreground border border-[var(--foreground-muted)]/20 shadow-sm hover:scale-105 transition-all" aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
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
          <div className="flex items-center gap-1">
            {levels.map((_, idx) => (
              <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx <= currentLevelIndex ? 'bg-purple-500' : 'bg-[var(--foreground-muted)]/30'}`}/>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xl font-bold text-foreground">
            <span>💎</span><span>{score}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center mb-4">
        <div className="text-xs font-bold text-[var(--foreground-muted)] tracking-widest mb-2 uppercase">SEHRLI UCHBURCHAK</div>
        <div className="text-5xl font-bold text-foreground mb-1 transition-all">{targetSum}</div>
        <div className="text-sm text-[var(--foreground-muted)]">Daraja {level}</div>
        {message && <div className="text-lg font-bold text-green-500 animate-pulse mt-2">{message}</div>}
      </div>

      {currentLevelIndex < levels.length - 1 && (
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex gap-1">
            {Array.from({ length: CORRECT_STREAK_FOR_LEVEL_UP }).map((_, idx) => (
              <div key={idx} className={`w-3 h-3 rounded-full transition-all ${idx < correctStreak ? 'bg-green-500 scale-110' : 'bg-[var(--foreground-muted)]/20'}`}/>
            ))}
          </div>
        </div>
      )}

      <div className="relative w-full aspect-square max-w-[340px] mx-auto mb-4">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {TRIANGLE_LINES.map((line, idx) => {
            const fromNode = INITIAL_POSITIONS.find((p) => p.id === line.from)!;
            const toNode = INITIAL_POSITIONS.find((p) => p.id === line.to)!;
            return <line key={idx} x1={fromNode.x} y1={fromNode.y} x2={toNode.x} y2={toNode.y} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>;
          })}
        </svg>

        {nodes.map((node) => {
          const hasValue = node.value !== null;
          return (
            <button
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              className={`absolute w-14 h-14 -ml-7 -mt-7 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all duration-200 transform
                ${hasValue ? 'bg-[var(--surface)] text-foreground border-2 border-[#6d28d9]/50 shadow-[0_0_20px_rgba(109,40,217,0.3)] hover:scale-110 active:scale-95' : 'bg-[var(--surface)]/60 border border-[var(--foreground-muted)]/30 hover:border-[#6d28d9]/50 hover:bg-[var(--surface)]'}
                ${!hasValue && selectedNumber !== null ? 'animate-pulse border-[#6d28d9]/50' : ''}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {node.value}
            </button>
          );
        })}

        {[{ x: 18, y: 30 }, { x: 78, y: 30 }, { x: 50, y: 95 }].map((pos, idx) => {
          const sum = getSideSum(idx);
          const isCorrect = sum === targetSum;
          return sum !== null ? (
            <div key={idx} className={`absolute text-sm font-bold -translate-x-1/2 -translate-y-1/2 ${isCorrect ? 'text-green-400' : 'text-[#c026d3]'}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>= {sum}</div>
          ) : null;
        })}
      </div>

      <div className="mt-auto">
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
          {availableNumbers.map((num) => {
            const isSelected = selectedNumber === num;
            return (
              <button
                key={num}
                onClick={() => handleNumberSelect(num)}
                className={`h-16 rounded-2xl text-2xl font-bold transition-all duration-200
                  ${isSelected ? 'bg-[#6d28d9] text-white scale-95 shadow-[0_0_25px_rgba(109,40,217,0.5)] border-2 border-[#c026d3]' : 'bg-transparent border-2 border-[#6d28d9]/60 text-[#c026d3] hover:border-[#c026d3] hover:text-[#6d28d9] active:scale-95'}`}
              >
                {num}
              </button>
            );
          })}
        </div>
        
        {selectedNumber !== null && (
          <p className="text-center text-[var(--foreground-muted)] text-sm mt-4">
            <span className="text-[#c026d3] font-bold">{selectedNumber}</span> ni joylashtirish uchun doirani bosing
          </p>
        )}
      </div>

      {isWin && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="text-6xl animate-bounce">✨</div>
        </div>
      )}
    </div>
  );
}
