'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target, Rocket, ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WeeklyTargetCardProps {
  pendingCount: number;
}

/**
 * Card de Meta Semanal - Refatorado para preenchimento vertical e alinhamento central.
 */
export function WeeklyTargetCard({ pendingCount }: WeeklyTargetCardProps) {
  const router = useRouter();

  return (
    <div className="h-full flex flex-col justify-between">
      <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-yellow-500/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-yellow-500/15" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
             <Target size={16} />
          </div>
          <span className="text-yellow-500 text-[9px] font-bold uppercase tracking-[0.2em]">Objetivo Ativo</span>
        </div>
        
        <h2 className="text-3xl font-black text-white uppercase leading-[0.9] tracking-tight mb-1">
          Meta da <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">Semana</span>
        </h2>
      </div>

      <div className="flex flex-row items-baseline gap-2 my-auto relative z-10">
         <span className="text-7xl font-black text-white tracking-tighter group-hover:text-yellow-400 transition-colors">
           {pendingCount}
         </span>
         <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider leading-none">Pedidos</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider leading-none">Pendentes</span>
         </div>
      </div>

      <button 
        onClick={() => router.push('/goals')}
        className="w-full mt-4 py-3 bg-zinc-800/30 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl border border-zinc-700/50 transition-all relative z-10 flex items-center justify-center gap-2"
      >
        Acessar Missão <ArrowUpRight size={14} />
      </button>

      <div className="absolute top-6 right-6 text-zinc-800 group-hover:text-yellow-500/15 transition-colors rotate-12">
        <Rocket size={40} />
      </div>
    </div>
  );
}
