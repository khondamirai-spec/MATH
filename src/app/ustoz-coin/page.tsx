"use client";

import Link from "next/link";
import Image from "next/image";

export default function UstozCoinPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>

      {/* Back Button */}
      <Link href="/" className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all backdrop-blur-md border border-white/10">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        <span>Orqaga</span>
      </Link>

      <div className="z-10 flex flex-col items-center gap-12 max-w-lg w-full text-center">
        {/* Title */}
        <h1 className="flex items-center justify-center gap-3 text-3xl md:text-5xl font-bold animate-in fade-in slide-in-from-top-4 duration-1000">
          <span>💎</span>
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            USTOZ AI COIN
          </span>
        </h1>

        {/* Coin Image Placeholder */}
        <div className="relative group animate-in zoom-in duration-1000 delay-300 fill-mode-both">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
          <div className="relative w-48 h-48 md:w-64 md:h-64 bg-black rounded-full border-4 border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
             <Image 
               src="/USTOZ AI COIN/coin.png" 
               alt="Ustoz AI Coin" 
               width={500} 
               height={500}
               className="w-3/4 h-3/4 object-contain animate-bounce"
             />
          </div>
        </div>

        {/* Tez Kunda Text */}
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-1000 delay-500 fill-mode-both">
          <h2 className="text-4xl md:text-6xl font-black tracking-widest text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse">
            TEZ KUNDA!
          </h2>
          <p className="text-gray-400 text-lg">
            Ajoyib imkoniyatlar tez orada...
          </p>
        </div>
      </div>
    </div>
  );
}

