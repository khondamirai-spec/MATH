"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface MagicTriangleGameProps {
  onBack: () => void;
}

type NodePosition = {
  id: number;
  x: number;
  y: number;
  value: number | null;
};

// Triangle node positions (6 positions: 3 corners + 3 midpoints)
// Layout:
//       0 (top)
//      / \
//     3   4
//    /     \
//   1---5---2
const INITIAL_POSITIONS: Omit<NodePosition, "value">[] = [
  { id: 0, x: 50, y: 8 },   // Top corner
  { id: 1, x: 12, y: 85 },   // Bottom left corner
  { id: 2, x: 88, y: 85 },   // Bottom right corner
  { id: 3, x: 31, y: 46 },   // Left edge midpoint (0-1)
  { id: 4, x: 69, y: 46 },   // Right edge midpoint (0-2)
  { id: 5, x: 50, y: 85 },   // Bottom edge midpoint (1-2)
];

// Define the three sides of the triangle
const TRIANGLE_SIDES = [
  [0, 3, 1], // Left side: top -> left mid -> bottom left
  [0, 4, 2], // Right side: top -> right mid -> bottom right
  [1, 5, 2], // Bottom side: bottom left -> bottom mid -> bottom right
];

// Lines connecting nodes for visual representation
const TRIANGLE_LINES = [
  { from: 0, to: 3 },
  { from: 3, to: 1 },
  { from: 0, to: 4 },
  { from: 4, to: 2 },
  { from: 1, to: 5 },
  { from: 5, to: 2 },
];

const CORNER_SETS: Record<number, number[]> = {
  9: [1, 2, 3],
  10: [1, 3, 5],
  11: [2, 4, 6],
  12: [4, 5, 6],
};

export default function MagicTriangleGame({ onBack }: MagicTriangleGameProps) {
  const [nodes, setNodes] = useState<NodePosition[]>(
    INITIAL_POSITIONS.map((p) => ({ ...p, value: null }))
  );
  const [availableNumbers, setAvailableNumbers] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [targetSum, setTargetSum] = useState(9);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isTutorialOpen, setIsTutorialOpen] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [level, setLevel] = useState(1);
  const [isWin, setIsWin] = useState(false);

  // Generate all valid solutions for the current target
  const generateSolutions = useCallback((target: number) => {
    const corners = CORNER_SETS[target];
    if (!corners) return [];

    // Permute corners (3! = 6 permutations)
    const perms = [
      [corners[0], corners[1], corners[2]],
      [corners[0], corners[2], corners[1]],
      [corners[1], corners[0], corners[2]],
      [corners[1], corners[2], corners[0]],
      [corners[2], corners[0], corners[1]],
      [corners[2], corners[1], corners[0]],
    ];

    return perms.map((p) => {
      const c0 = p[0]; // Top
      const c1 = p[1]; // Bottom Left
      const c2 = p[2]; // Bottom Right
      
      // Calculate mids
      // Side 0-1 (nodes 0,3,1): c0 + m3 + c1 = target => m3 = target - c0 - c1
      const m3 = target - c0 - c1;
      
      // Side 0-2 (nodes 0,4,2): c0 + m4 + c2 = target => m4 = target - c0 - c2
      const m4 = target - c0 - c2;
      
      // Side 1-2 (nodes 1,5,2): c1 + m5 + c2 = target => m5 = target - c1 - c2
      const m5 = target - c1 - c2;

      return {
        0: c0,
        1: c1,
        2: c2,
        3: m3,
        4: m4,
        5: m5,
      };
    });
  }, []);

  // Generate a new puzzle with a valid solution
  const generatePuzzle = useCallback(() => {
    // Magic triangles have specific valid sums: 9, 10, 11, 12
    // For numbers 1-6, the possible magic sums are 9, 10, 11, 12
    const possibleSums = [9, 10, 11, 12];
    const newTarget = possibleSums[Math.floor(Math.random() * possibleSums.length)];
    
    setTargetSum(newTarget);
    setNodes(INITIAL_POSITIONS.map((p) => ({ ...p, value: null })));
    setAvailableNumbers([1, 2, 3, 4, 5, 6]);
    setSelectedNumber(null);
    setIsWin(false);
  }, []);

  const checkSolution = useCallback((currentNodes: NodePosition[]) => {
    // Check if all nodes have values
    if (currentNodes.some((n) => n.value === null)) return false;

    // Check each side sums to target
    for (const side of TRIANGLE_SIDES) {
      const sum = side.reduce((acc, nodeId) => {
        const node = currentNodes.find((n) => n.id === nodeId);
        return acc + (node?.value || 0);
      }, 0);
      if (sum !== targetSum) return false;
    }
    return true;
  }, [targetSum]);

  const handleWin = useCallback((currentNodes: NodePosition[]) => {
    setIsWin(true);
    const baseScore = 10;
    const timeBonus = Math.floor(timeLeft / 10);
    const totalScore = baseScore + timeBonus;
    setScore((s) => s + totalScore);
    setMessage(`+${totalScore}`);
    
    setTimeout(() => {
      setMessage(null);
      setLevel((l) => l + 1);
      generatePuzzle();
    }, 1500);
  }, [timeLeft, generatePuzzle]);

  const handleHint = () => {
    if (isGameOver || isPaused || isTutorialOpen) return;
    
    const solutions = generateSolutions(targetSum);
    const currentMap = new Map<number, number>();
    nodes.forEach(n => {
      if (n.value !== null) currentMap.set(n.id, n.value);
    });
    
    // Find compatible solutions (subset match)
    const compatible = solutions.filter(sol => {
      for (const [id, val] of currentMap.entries()) {
        if (sol[id as keyof typeof sol] !== val) return false;
      }
      return true;
    });
    
    let targetSolution: Record<number, number>;
    let isCorrection = false;
    
    if (compatible.length > 0) {
      targetSolution = compatible[0];
    } else {
      // Find solution with most matches
      targetSolution = solutions.reduce((best, curr) => {
        let matches = 0;
        for (const [id, val] of currentMap.entries()) {
          if (curr[id as keyof typeof curr] === val) matches++;
        }
        return matches > best.matches ? { sol: curr, matches } : best;
      }, { sol: solutions[0], matches: -1 }).sol;
      isCorrection = true;
    }
    
    let nodeToFixId = -1;
    
    if (isCorrection) {
       // Find first conflict
       nodeToFixId = nodes.find(n => n.value !== null && targetSolution[n.id as keyof typeof targetSolution] !== n.value)?.id ?? -1;
    } 
    
    // If no conflict (or corrected), find empty
    if (nodeToFixId === -1) {
       nodeToFixId = nodes.find(n => n.value === null)?.id ?? -1;
    }
    
    if (nodeToFixId !== -1) {
       const correctValue = targetSolution[nodeToFixId as keyof typeof targetSolution];
       const oldVal = nodes.find(n => n.id === nodeToFixId)?.value;
       
       // Update nodes
       const newNodes = nodes.map(n => n.id === nodeToFixId ? { ...n, value: correctValue } : n);
       setNodes(newNodes);
       
       // Update available numbers: return oldVal, remove correctValue
       setAvailableNumbers(prev => {
         let next = [...prev];
         if (oldVal !== null) next.push(oldVal);
         // Filter out ONLY the correctValue instance we just placed
         // But since numbers are unique 1-6, simple filter is fine
         next = next.filter(n => n !== correctValue);
         return next.sort((a,b) => a-b);
       });
       
       // If we overwrote a selected number, deselect
       if (selectedNumber === correctValue) {
         setSelectedNumber(null);
       }

       if (checkSolution(newNodes)) {
         handleWin(newNodes);
       }
    }
  };

  const handleResetBoard = () => {
    if (isGameOver || isPaused || isTutorialOpen) return;
    setNodes(INITIAL_POSITIONS.map(p => ({ ...p, value: null })));
    setAvailableNumbers([1, 2, 3, 4, 5, 6]);
    setSelectedNumber(null);
  };

  // Initialize game
  useEffect(() => {
    generatePuzzle();
  }, [generatePuzzle]);

  // Timer
  useEffect(() => {
    if (isTutorialOpen || isGameOver || isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          setIsGameOver(true);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isTutorialOpen, isGameOver, isPaused]);


  // Handle clicking on a number in the pool
  const handleNumberSelect = (num: number) => {
    if (isGameOver || isPaused || isTutorialOpen) return;
    
    if (selectedNumber === num) {
      setSelectedNumber(null);
    } else {
      setSelectedNumber(num);
    }
  };

  // Handle clicking on a node position
  const handleNodeClick = (nodeId: number) => {
    if (isGameOver || isPaused || isTutorialOpen) return;

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // If node has a value, remove it back to pool
    if (node.value !== null) {
      const valueToReturn = node.value;
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, value: null } : n))
      );
      setAvailableNumbers((prev) => [...prev, valueToReturn].sort((a, b) => a - b));
      return;
    }

    // If a number is selected and node is empty, place it
    if (selectedNumber !== null && node.value === null) {
      const newNodes = nodes.map((n) =>
        n.id === nodeId ? { ...n, value: selectedNumber } : n
      );
      setNodes(newNodes);
      setAvailableNumbers((prev) => prev.filter((n) => n !== selectedNumber));
      setSelectedNumber(null);

      // Check for solution after placement
      if (checkSolution(newNodes)) {
        handleWin(newNodes);
      }
    }
  };

  const handleRestart = () => {
    generatePuzzle();
    setScore(0);
    setTimeLeft(120);
    setIsGameOver(false);
    setIsPaused(false);
    setLevel(1);
  };

  // Get the sum of each side for display
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

  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground p-4 max-w-md mx-auto overflow-hidden font-sans">
      {/* Header */}
      <div className="relative z-30 flex items-center justify-between mb-2 px-4 py-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--surface)] text-foreground border border-[var(--foreground-muted)]/20 shadow-sm hover:scale-105 transition-all"
          aria-label="Back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-xl font-bold text-foreground">
          <span>💎</span>
          <span>{score}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-[var(--surface)] rounded-full overflow-hidden mb-4 border border-[var(--foreground-muted)]/20">
        <div 
          className="h-full rounded-full transition-all duration-100 ease-linear"
          style={{ 
            width: `${(timeLeft / 120) * 100}%`,
            background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #c026d3 100%)'
          }}
        />
      </div>

      {/* Target Display */}
      <div className="flex flex-col items-center justify-center mb-4">
        <button 
          onClick={() => setIsTutorialOpen(true)}
          className="text-xs font-bold text-[var(--foreground-muted)] tracking-widest mb-2 uppercase hover:text-foreground transition-colors cursor-pointer"
        >
          SEHRLI UCHBURCHAK ℹ
        </button>
        <div className="text-5xl font-bold text-foreground mb-1 transition-all">{targetSum}</div>
        <div className="text-sm text-[var(--foreground-muted)]">Daraja {level}</div>
        {message && (
          <div className="text-lg font-bold text-green-500 animate-pulse mt-2">
            {message}
          </div>
        )}
      </div>

      {/* Triangle Area */}
      <div className="relative w-full aspect-square max-w-[340px] mx-auto mb-4">
        {/* SVG for lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {TRIANGLE_LINES.map((line, idx) => {
            const fromNode = INITIAL_POSITIONS.find((p) => p.id === line.from)!;
            const toNode = INITIAL_POSITIONS.find((p) => p.id === line.to)!;
            return (
              <line
                key={idx}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.5"
              />
            );
          })}
        </svg>

        {/* Node positions */}
        {nodes.map((node) => {
          const hasValue = node.value !== null;
          return (
            <button
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              className={`
                absolute w-14 h-14 -ml-7 -mt-7 rounded-2xl flex items-center justify-center text-2xl font-bold
                transition-all duration-200 transform
                ${hasValue 
                  ? 'bg-[var(--surface)] text-foreground border-2 border-[#6d28d9]/50 shadow-[0_0_20px_rgba(109,40,217,0.3)] hover:scale-110 active:scale-95' 
                  : 'bg-[var(--surface)]/60 border border-[var(--foreground-muted)]/30 hover:border-[#6d28d9]/50 hover:bg-[var(--surface)]'
                }
                ${!hasValue && selectedNumber !== null ? 'animate-pulse border-[#6d28d9]/50' : ''}
              `}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
              }}
              aria-label={hasValue ? `Qiymat ${node.value} bo'lgan tugun, o'chirish uchun bosing` : `Bo'sh tugun, raqam qo'yish uchun bosing`}
            >
              {node.value}
            </button>
          );
        })}

        {/* Side sum indicators */}
        {[
          { x: 18, y: 30 },  // Left side
          { x: 78, y: 30 },  // Right side  
          { x: 50, y: 95 },  // Bottom side
        ].map((pos, idx) => {
          const sum = getSideSum(idx);
          const isCorrect = sum === targetSum;
          return sum !== null ? (
            <div
              key={idx}
              className={`absolute text-sm font-bold -translate-x-1/2 -translate-y-1/2 ${isCorrect ? 'text-green-400' : 'text-[#c026d3]'}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              = {sum}
            </div>
          ) : null;
        })}
      </div>

      {/* Number Pool */}
      <div className="mt-auto">
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
          {[1, 2, 3, 4, 5, 6].map((num) => {
            const isAvailable = availableNumbers.includes(num);
            const isSelected = selectedNumber === num;
            return (
              <button
                key={num}
                onClick={() => isAvailable && handleNumberSelect(num)}
                disabled={!isAvailable}
                className={`
                  h-16 rounded-2xl text-2xl font-bold transition-all duration-200
                  ${!isAvailable 
                    ? 'opacity-0 pointer-events-none' 
                    : isSelected
                      ? 'bg-[#6d28d9] text-white scale-95 shadow-[0_0_25px_rgba(109,40,217,0.5)] border-2 border-[#c026d3]'
                      : 'bg-transparent border-2 border-[#6d28d9]/60 text-[#c026d3] hover:border-[#c026d3] hover:text-[#6d28d9] active:scale-95'
                  }
                `}
                aria-label={`Raqam ${num}${isSelected ? ', tanlangan' : ''}`}
              >
                {isAvailable ? num : ''}
              </button>
            );
          })}
        </div>
        
        {selectedNumber !== null && (
          <p className="text-center text-[var(--foreground-muted)] text-sm mt-4">
            <span className="text-[#c026d3] font-bold">{selectedNumber}</span> ni joylashtirish uchun doirani bosing
          </p>
        )}
        
        {selectedNumber === null && availableNumbers.length > 0 && (
          <p className="text-center text-[var(--foreground-muted)] text-sm mt-4">
            Joylashtirish uchun raqam tanlang
          </p>
        )}

        <div className="flex justify-center gap-4 mt-6 pb-4">
          <button
            onClick={handleResetBoard}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--surface)] text-[var(--foreground-muted)] font-bold rounded-full hover:bg-[var(--surface)]/80 hover:text-foreground transition-all border border-[var(--foreground-muted)]/20"
            aria-label="Qayta o'rnatish"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Qayta o'rnatish
          </button>
          
          <button
            onClick={handleHint}
            className="flex items-center gap-2 px-6 py-3 bg-[#6d28d9]/10 text-[#6d28d9] font-bold rounded-full hover:bg-[#6d28d9]/20 transition-all border border-[#6d28d9]/20"
            aria-label="Maslahat olish"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
              <path d="M9 18h6" />
              <path d="M10 22h4" />
            </svg>
            Maslahat
          </button>
        </div>
      </div>

      {/* Tutorial Modal */}
      <div className={`fixed inset-0 z-50 flex items-end justify-center ${isTutorialOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div 
          className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${isTutorialOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsTutorialOpen(false)}
        />
        
        <div className={`relative z-10 w-full max-w-md bg-[var(--surface)] rounded-t-[2rem] p-6 pb-8 transition-transform duration-300 ease-out transform ${isTutorialOpen ? 'translate-y-0' : 'translate-y-full'} border-t border-[var(--foreground-muted)]/10 shadow-2xl`}>
          <div className="w-12 h-1 bg-[var(--foreground-muted)] rounded-full mx-auto mb-6 opacity-30" />
          
          <h2 className="text-xl font-bold text-center mb-4 text-foreground">Sehrli Uchburchak</h2>
          
          <div className="bg-background p-4 rounded-xl mb-4 border border-[var(--foreground-muted)]/20">
            <div className="text-4xl font-bold text-foreground mb-3">{targetSum}</div>
            <h3 className="text-foreground font-bold text-lg mb-2">1-6 raqamlarini uchburchakka joylashtiring</h3>
            
            {/* Mini Triangle Visual */}
            <div className="relative w-24 h-24 mx-auto my-4">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <polygon 
                  points="50,10 10,90 90,90" 
                  fill="none" 
                  stroke="rgba(109,40,217,0.4)" 
                  strokeWidth="2"
                />
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
            1-6 raqamlarini uchburchakka har bir tomon yig'indisi <span className="text-[#c026d3] font-bold">{targetSum}</span> bo'ladigan qilib joylashtiring.
            <br/><br/>
            • Tanlash uchun pastdagi raqamni bosing<br/>
            • Joylashtirish uchun doirani bosing<br/>
            • O'chirish uchun joylashtirilgan raqamni bosing
          </p>

          <div className="flex flex-col gap-2 mb-6 px-8">
            <div className="flex justify-between items-center">
              <span className="text-foreground font-medium">+10</span>
              <span className="text-[var(--foreground-muted)] text-sm">har bir yechim uchun asosiy ball</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground font-medium">+bonus</span>
              <span className="text-[var(--foreground-muted)] text-sm">qolgan vaqt uchun</span>
            </div>
          </div>

          <button 
            onClick={() => setIsTutorialOpen(false)}
            className="w-full py-4 rounded-full text-white font-bold tracking-wide shadow-lg active:scale-95 transition-transform uppercase text-sm"
            style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #c026d3 100%)' }}
          >
            Tushundim!
          </button>
        </div>
      </div>

      {/* Pause Modal */}
      {isPaused && !isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[var(--surface)] border border-[var(--foreground-muted)]/20 p-8 rounded-3xl w-full max-w-sm text-center">
            <h2 className="text-3xl font-bold text-foreground mb-2">To'xtatildi</h2>
            <p className="text-xl text-[var(--foreground-muted)] mb-8">Daraja {level} • Ball: {score}</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setIsPaused(false)}
                className="w-full py-3 text-white font-bold rounded-full hover:opacity-90 transition-opacity shadow-lg"
                style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #c026d3 100%)' }}
              >
                Davom etish
              </button>
              <button 
                onClick={handleRestart}
                className="w-full py-3 bg-[var(--surface)]/80 text-foreground border border-[var(--foreground-muted)]/20 font-bold rounded-full hover:bg-[var(--surface)] transition-colors"
              >
                Yangi o'yin
              </button>
              <button 
                onClick={onBack}
                className="w-full py-3 bg-transparent border border-[var(--foreground-muted)]/20 text-foreground font-bold rounded-full hover:bg-[var(--surface)]/50 transition-colors"
              >
                Chiqish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[var(--surface)] border border-[var(--foreground-muted)]/20 p-8 rounded-3xl w-full max-w-sm text-center">
            <h2 className="text-3xl font-bold text-foreground mb-2">Vaqt tugadi!</h2>
            <p className="text-xl text-[var(--foreground-muted)] mb-2">Yakuniy ball: {score}</p>
            <p className="text-lg text-[var(--foreground-muted)] mb-8">Tugatilgan darajalar: {level - 1}</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleRestart}
                className="w-full py-3 text-white font-bold rounded-full hover:opacity-90 transition-opacity shadow-lg"
                style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #c026d3 100%)' }}
              >
                Qayta o'ynash
              </button>
              <button 
                onClick={onBack}
                className="w-full py-3 bg-transparent border border-[var(--foreground-muted)]/20 text-foreground font-bold rounded-full hover:bg-[var(--surface)]/50 transition-colors"
              >
                Chiqish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Win animation overlay */}
      {isWin && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="text-6xl animate-bounce">✨</div>
        </div>
      )}
    </div>
  );
}

