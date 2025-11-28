"use client";

import { useState, useEffect } from "react";

interface CalculatorGameProps {
  onBack: () => void;
}

export default function CalculatorGame({ onBack }: CalculatorGameProps) {
  const [score, setScore] = useState(0);
  // Initial equation as per screenshot
  const [equation, setEquation] = useState("9 / 3");
  const [answer, setAnswer] = useState<number>(3);
  const [input, setInput] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  
  // Game timer simulation
  const [timeLeft, setTimeLeft] = useState(60);
  
  useEffect(() => {
    if (isPaused) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isPaused]);


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

  // Check answer when input changes (or could be auto-submit if length matches, but usually users expect immediate feedback or enter)
  // For this UI, there is no "Enter" button, suggesting auto-check or just waiting. 
  // Usually in these games, once the correct answer is typed, it moves to next.
  // "9 / 3" is 3. If user types 3, we should probably accept it.
  useEffect(() => {
    if (input && parseInt(input) === answer) {
        // Correct answer
        setScore(s => s + 1);
        setInput("");
        generateNewEquation();
    }
  }, [input, answer]);

  const generateNewEquation = () => {
    // Simple generator for demo purposes
    const operators = ['+', '-', '*', '/'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    let a = Math.floor(Math.random() * 10) + 1;
    let b = Math.floor(Math.random() * 10) + 1;
    let newAnswer = 0;

    // Ensure clean division
    if (operator === '/') {
      newAnswer = a;
      a = a * b; // a / b = newAnswer
    } else if (operator === '*') {
      newAnswer = a * b;
    } else if (operator === '+') {
      newAnswer = a + b;
    } else {
      if (a < b) [a, b] = [b, a]; // Ensure positive result
      newAnswer = a - b;
    }

    setEquation(`${a} ${operator} ${b}`);
    setAnswer(newAnswer);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white p-4 max-w-md mx-auto">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-2">
        <button 
            onClick={onBack}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:bg-gray-200 transition-colors"
            aria-label="Back"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
            </svg>
        </button>

        <div className="flex items-center gap-2 text-xl font-bold">
            <span>🏆</span>
            <span>{score}</span>
        </div>

        <button 
            onClick={() => setIsPaused(!isPaused)}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Pause"
        >
            {isPaused ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                </svg>
            ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
            )}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-gray-800 rounded-full mb-8 overflow-hidden">
        <div 
            className="h-full bg-blue-500 transition-all duration-100 ease-linear" 
            style={{ width: `${(timeLeft / 60) * 100}%` }}
        ></div>
      </div>

      {/* Game Title */}
      <div className="flex items-center justify-center gap-2 text-gray-500 mb-8">
        <span className="uppercase tracking-widest text-sm font-semibold">CALCULATOR</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </div>

      {/* Problem Display */}
      <div className="flex-1 flex flex-col items-center justify-center mb-8">
        <div className="text-6xl font-bold mb-8 tracking-wider">{equation.replace('/', '÷').replace('*', '×')}</div>
        
        {/* Answer Input Field */}
        <div className="w-full h-20 bg-gray-900 rounded-2xl flex items-center justify-center text-4xl font-bold text-white border border-gray-800">
            {input}
            <span className="animate-pulse text-blue-500">|</span>
        </div>
      </div>

      {/* Number Pad Grid */}
      <div className="grid grid-cols-3 gap-3 pb-6">
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
            <button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="aspect-square rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-3xl font-semibold shadow-lg shadow-blue-900/20 active:scale-95 transition-transform flex items-center justify-center"
            >
                {num}
            </button>
        ))}
        
        {/* Bottom Row */}
        <button
            onClick={handleClear}
            className="aspect-square rounded-2xl bg-gray-900 hover:bg-gray-800 text-white text-xl font-medium active:scale-95 transition-transform flex items-center justify-center"
        >
            Clear
        </button>
        
        <button
            onClick={() => handleNumberClick("0")}
            className="aspect-square rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-3xl font-semibold shadow-lg shadow-blue-900/20 active:scale-95 transition-transform flex items-center justify-center"
        >
            0
        </button>
        
        <button
            onClick={handleDelete}
            className="aspect-square rounded-2xl bg-gray-900 hover:bg-gray-800 text-white text-2xl font-medium active:scale-95 transition-transform flex items-center justify-center"
        >
            ⌫
        </button>
      </div>
    </div>
  );
}

