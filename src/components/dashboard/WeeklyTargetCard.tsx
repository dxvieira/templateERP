'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target, Rocket, ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WeeklyTargetCardProps {
  pendingCount: number;
}

export function WeeklyTargetCard({ pendingCount }: WeeklyTargetCardProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="
        group relative h-full min-h-[260px] flex flex-col justify-between
        bg-[#09090b] border border-zinc-800 rounded-2xl p-6 overflow-hidden
        transition-all duration-500
        hover:border-yellow-500/80 
        hover:shadow-[0_0_40px_-15px_rgba(234,179,8,0.3)]
        hover:-translate-y-0.5
      "
    >
      <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-yellow-500/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-yellow-500/15" />

      <div>
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

      <div className="flex items-center gap-3 my-3">
         <span className="text-6xl font-black text-white tracking-tighter group-hover:text-yellow-400 transition-colors">
           {pendingCount}
         </span>
         <div className="flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pedidos</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pendentes</span>
         </div>
      </div>

      <button 
        onClick={() => router.push('/goals')}
        className="
          w-full py-3.5 rounded-lg flex items-center justify-center gap-2
          bg-zinc-900 border border-zinc-800 
          text-white font-bold uppercase tracking-widest text-[10px]
          transition-all duration-300
          group-hover:bg-yellow-500 group-hover:text-black group-hover:border-yellow-400
          relative z-10
        "
      >
        Acessar Missão <ArrowUpRight size={14} />
      </button>

      <div className="absolute top-6 right-6 text-zinc-800 group-hover:text-yellow-500/15 transition-colors rotate-12">
        <Rocket size={40} />
      </div>
    </motion.div>
  );
}