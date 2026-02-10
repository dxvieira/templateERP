
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
        group relative h-full min-h-[300px] flex flex-col justify-between
        bg-[#09090b] border border-zinc-800 rounded-[2.5rem] p-8 overflow-hidden
        transition-all duration-500
        /* HOVER: Amarelo Neon Intenso */
        hover:border-yellow-500/80 
        hover:shadow-[0_0_60px_-15px_rgba(234,179,8,0.4)]
        hover:-translate-y-1
      "
    >
      {/* Luz de Fundo (Amarelo Ouro) */}
      <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-yellow-500/10 blur-[80px] rounded-full pointer-events-none transition-all duration-700 group-hover:bg-yellow-500/20" />

      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 group-hover:scale-110 transition-transform duration-300">
             <Target size={20} />
          </div>
          <span className="text-yellow-500 text-[10px] font-bold uppercase tracking-[0.2em]">Objetivo Ativo</span>
        </div>
        
        <h2 className="text-4xl font-black text-white uppercase leading-[0.9] tracking-tight mb-2">
          Meta da <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 group-hover:to-yellow-300 transition-all">
            Semana
          </span>
        </h2>
      </div>

      {/* Contador Central */}
      <div className="flex items-center gap-3 my-4">
         <span className="text-7xl font-black text-white tracking-tighter group-hover:text-yellow-400 transition-colors duration-300">
           {pendingCount}
         </span>
         <div className="flex flex-col justify-center">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pedidos</span>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pendentes</span>
         </div>
      </div>

      {/* Botão de Ação */}
      <button 
        onClick={() => router.push('/goals')}
        className="
          w-full py-4 rounded-xl flex items-center justify-center gap-2
          bg-zinc-900 border border-zinc-800 
          text-white font-bold uppercase tracking-widest text-xs
          transition-all duration-300
          group-hover:bg-yellow-500 group-hover:text-black group-hover:border-yellow-400
          group-hover:shadow-[0_0_20px_rgba(234,179,8,0.5)]
          relative z-10
        "
      >
        Acessar Missão <ArrowUpRight size={16} />
      </button>

      {/* Ícone Decorativo Flutuante */}
      <div className="absolute top-8 right-8 text-zinc-800 group-hover:text-yellow-500/20 transition-colors duration-500 rotate-12">
        <Rocket size={48} />
      </div>

    </motion.div>
  );
}
