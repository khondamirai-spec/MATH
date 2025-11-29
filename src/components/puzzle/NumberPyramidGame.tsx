"use client";

import { useState, useEffect, useCallback } from "react";

interface NumberPyramidGameProps {
  onBack: () => void;
}

type Cell = {
  row: number;
  col: number;
  value: number;      // The correct answer
  userInput: string;  // What the user typed ("" if empty)
  isFixed: boolean;   // If true, this is a pre-filled clue
  isCorrect: boolean; // For validation visuals
};

// 4 rows: 1, 2, 3, 4 cells
const ROWS = 4;

export default function NumberPyramidGame({ onBack }: NumberPyramidGameProps) {
  const [pyramid, setPyramid] = useState<Cell[]>([]);
  const [selectedCell, setSelectedCell] = useState<{r: number, c: number} | null>(null);
  const [score, setScore] = useState(0);
  const [isTutorialOpen, setIsTutorialOpen] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [level, setLevel] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(120);

  const generatePuzzle = useCallback(() => {
    // Generate bottom row with larger numbers for harder puzzles
    // Base range 15-50 to ensure 3-digit totals at the top
    const minVal = 15 + Math.floor(level * 2);
    const maxVal = 50 + level * 5;
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
    
    // Identify all positions
    const allPositions: {r: number, c: number}[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= r; c++) {
        allPositions.push({r, c});
      }
    }

    // Shuffle and pick exactly 4 positions to be fixed
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
  }, [level]);

  useEffect(() => {
    generatePuzzle();
    setTimeLeft(120);
  }, [generatePuzzle]);

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

  const handleKeypadClick = (key: string) => {
    if (!selectedCell || isGameOver || isPaused) return;

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
      const baseScore = 50;
      setScore(s => s + baseScore);
      setMessage("Ajoyib!");
      setTimeout(() => {
        setLevel(l => l + 1);
        generatePuzzle();
      }, 1500);
    } else {
        setMessage("Hisobingizni tekshiring!");
        setTimeout(() => setMessage(null), 2000);
    }
  };

  // Cell dimensions for pyramid blocks
  const CELL_W = 50;
  const CELL_H = 42;
  const GAP = 5;

  return (
    <div 
      className="relative flex flex-col h-screen text-white p-3 max-w-md mx-auto overflow-hidden font-sans bg-black"
    >
      {/* Header */}
      <div className="relative z-30 flex items-center justify-between mb-1.5 px-2 py-2">
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center bg-[#1a1a1a] text-white border border-gray-700">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="flex items-center gap-1.5 text-lg font-bold">
          <span>💎</span><span>{score}</span>
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

      {/* Title */}
      <div className="text-center mb-2">
        <button onClick={() => setIsTutorialOpen(true)} className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">
          RAQAMLI PIRAMIDA <span className="inline-block w-3 h-3 rounded-full border border-gray-500 text-[8px] leading-3">i</span>
        </button>
        {message && <div className="text-base font-bold text-[#9333ea] animate-bounce mt-1.5">{message}</div>}
      </div>

      {/* Pyramid - SVG Based for precise trapezoid shapes */}
      <div className="flex-1 flex items-center justify-center">
        <svg 
          viewBox={`0 0 ${ROWS * (CELL_W + GAP)} ${ROWS * (CELL_H + GAP) + 30}`} 
          className="w-full max-w-[280px]"
          style={{ overflow: 'visible' }}
        >
          {/* Connecting lines - the pyramid outline */}
          <defs>
            <linearGradient id="pinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#581c87" />
              <stop offset="55%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
          
          {/* Draw pyramid structure lines */}
          {Array(ROWS).fill(0).map((_, r) => {
            const rowWidth = (r + 1) * CELL_W + r * GAP;
            const xStart = (ROWS * (CELL_W + GAP) - rowWidth) / 2;
            const y = r * (CELL_H + GAP) + 20;
            
            return (
              <g key={`row-${r}`}>
                {/* Horizontal line under row */}
                <line 
                  x1={xStart - 2} 
                  y1={y + CELL_H + 2} 
                  x2={xStart + rowWidth + 2} 
                  y2={y + CELL_H + 2}
                  stroke="#333"
                  strokeWidth="1"
                />
                {/* Vertical dividers */}
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
          
          {/* Diagonal outline removed */}

          {/* Cells */}
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
                {/* Cell background */}
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
                {/* Cell text */}
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

      {/* Tutorial Modal */}
      {isTutorialOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] p-6 pb-8 rounded-t-3xl w-full max-w-md border-t border-gray-800">
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white text-center mb-4">Raqamli Piramida</h2>
            
            <div className="bg-black/50 p-4 rounded-xl mb-4">
              {/* Mini pyramid demo */}
              <svg viewBox="0 0 200 120" className="w-full max-w-[200px] mx-auto mb-3">
                <defs>
                  <linearGradient id="demoPink" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#581c87" />
                    <stop offset="55%" stopColor="#9333ea" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                </defs>
                {/* Top cell */}
                <rect x="75" y="5" width="50" height="30" rx="4" fill="url(#demoPink)" />
                <text x="100" y="26" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">283</text>
                {/* Second row */}
                <rect x="48" y="40" width="50" height="30" rx="4" fill="url(#demoPink)" />
                <text x="73" y="61" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">159</text>
                <rect x="102" y="40" width="50" height="30" rx="4" fill="#1f1f1f" stroke="#333" />
                <text x="127" y="61" textAnchor="middle" fill="#666" fontSize="14" fontWeight="bold">?</text>
                {/* Third row hints */}
                <rect x="21" y="75" width="50" height="30" rx="4" fill="url(#demoPink)" />
                <text x="46" y="96" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">50</text>
                <rect x="75" y="75" width="50" height="30" rx="4" fill="#1f1f1f" stroke="#333" />
                <rect x="129" y="75" width="50" height="30" rx="4" fill="url(#demoPink)" />
                <text x="154" y="96" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">18</text>
              </svg>
              
              <p className="text-white font-bold text-center text-lg">ikki katakchaning yig'indisi<br/>yuqori katakchada</p>
            </div>
            
            <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
              Ketma-ket katakchalarning yig'indisi yuqori katakchaga joylashtirilishi kerak. Raqamli piramidani yechish uchun barcha katakchalarni to'g'ri to'ldirish kerak.
            </p>

            <div className="flex justify-center gap-8 mb-6 text-sm">
              <div><span className="text-white font-bold">5.0</span> <span className="text-gray-500">to'g'ri javob uchun</span></div>
              <div><span className="text-white font-bold">5.0</span> <span className="text-gray-500">noto'g'ri javob uchun</span></div>
            </div>

            <button 
              onClick={() => setIsTutorialOpen(false)}
              className="w-full py-4 rounded-full text-white font-bold text-lg uppercase tracking-wide"
              style={{ background: 'linear-gradient(135deg, #581c87 0%, #9333ea 55%, #e11d48 100%)' }}
            >
              TUSHUNDIM!
            </button>
          </div>
        </div>
      )}

      {/* Game Over */}
      {isGameOver && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
            <div className="text-center text-white p-8">
                <h2 className="text-3xl font-bold mb-4">O'yin tugadi</h2>
                <p className="text-xl mb-6">Ball: {score}</p>
                <button onClick={() => {
                    setScore(0);
                    setLevel(1);
                    generatePuzzle();
                    setIsGameOver(false);
                    setTimeLeft(120);
                }} className="px-8 py-3 rounded-full font-bold" style={{ background: 'linear-gradient(135deg, #581c87 0%, #9333ea 55%, #e11d48 100%)' }}>Qayta o'ynash</button>
                <div className="mt-4"><button onClick={onBack} className="text-gray-400">Chiqish</button></div>
            </div>
         </div>
      )}
      
      {/* Paused */}
      {isPaused && !isGameOver && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
            <div className="text-center text-white p-8">
                <h2 className="text-3xl font-bold mb-8">To'xtatildi</h2>
                <button onClick={() => setIsPaused(false)} className="block w-48 py-3 rounded-full font-bold mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, #581c87 0%, #9333ea 55%, #e11d48 100%)' }}>Davom etish</button>
                <button onClick={onBack} className="block w-48 py-3 bg-[#1f1f1f] rounded-full font-bold mx-auto">Chiqish</button>
            </div>
         </div>
      )}
    </div>
  );
}
