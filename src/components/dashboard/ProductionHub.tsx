'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductionHubProps {
  stats: {
    total: number;
    arte: number;
    impressao: number;
    serralheria: number;
    acabamento: number;
    instalacao: number;
    concluido: number;
  };
  orders: any[];
}

export function ProductionHub({ stats }: ProductionHubProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Mapeia os dados reais do Firestore para o formato do HUD
  const segments = useMemo(() => [
    { id: 'art', label: 'Arte Final', value: stats.arte, color: '#d946ef' },
    { id: 'print', label: 'Impressão', value: stats.impressao, color: '#06b6d4' },
    { id: 'metal', label: 'Serralheria', value: stats.serralheria, color: '#facc15' },
    { id: 'finish', label: 'Acabamento', value: stats.acabamento, color: '#FF5F1F' },
    { id: 'install', label: 'Instalação', value: stats.instalacao, color: '#22c55e' },
  ].filter(s => s.value > 0), [stats]);

  const activeOrdersCount = useMemo(() => segments.reduce((acc, item) => acc + item.value, 0), [segments]);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="w-full flex justify-center">
      <div className="group relative w-full max-w-4xl bg-[#09090b] border border-zinc-800 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-12 overflow-hidden transition-all duration-500 hover:border-[#FF5F1F] hover:shadow-[0_0_50px_-10px_rgba(255,95,31,0.2)]">
        
        {/* LUZES DE FUNDO */}
        <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none transition-opacity duration-700 group-hover:opacity-50" />
        <div className="absolute bottom-[-50%] right-[-20%] w-[150%] h-[150%] bg-[#FF5F1F]/5 blur-[120px] rounded-full pointer-events-none transition-opacity duration-700 group-hover:bg-[#FF5F1F]/10 group-hover:opacity-100" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 relative z-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <Activity size={14} className="text-[#FF5F1F] animate-pulse" />
               <span className="text-[#FF5F1F] text-[10px] font-bold uppercase tracking-[0.3em]">Monitoramento Online</span>
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              Reator de <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-600">Produção</span>
            </h2>
          </div>
          <div className="hidden md:block p-3 rounded-full bg-white/5 border border-white/5 group-hover:border-[#FF5F1F]/30 transition-colors">
            <Fingerprint className="text-zinc-500 group-hover:text-[#FF5F1F] transition-colors" />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-20 relative z-10">
          {/* GRÁFICO / REATOR */}
          <div className="relative w-[260px] h-[260px] md:w-[320px] md:h-[320px] shrink-0 flex items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border border-zinc-800/50 rounded-full border-dashed"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="absolute inset-6 border border-zinc-800/30 rounded-full border-dotted"
            />

            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90 transform overflow-visible filter drop-shadow-2xl">
               <circle cx="100" cy="100" r={radius} stroke="#18181b" strokeWidth="12" fill="transparent" />
               {segments.map((item, index) => {
                 const percentage = (item.value / activeOrdersCount) * 100;
                 const dashArray = `${(percentage / 100) * circumference} ${circumference}`;
                 const dashOffset = -accumulatedOffset;
                 accumulatedOffset += (percentage / 100) * circumference;
                 const isActive = activeIndex === index;

                 return (
                   <motion.circle
                     key={item.id}
                     cx="100"
                     cy="100"
                     r={radius}
                     fill="transparent"
                     stroke={item.color}
                     strokeWidth={isActive ? 18 : 12}
                     strokeDasharray={dashArray}
                     strokeDashoffset={dashOffset}
                     strokeLinecap="round"
                     animate={{ 
                        opacity: activeIndex !== null && !isActive ? 0.3 : 1,
                        filter: isActive ? `drop-shadow(0 0 10px ${item.color})` : "none"
                     }}
                     transition={{ duration: 0.4 }}
                     onMouseEnter={() => setActiveIndex(index)}
                     onMouseLeave={() => setActiveIndex(null)}
                     onTouchStart={() => setActiveIndex(index)}
                     className="cursor-pointer transition-all"
                   />
                 );
               })}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <motion.div
                 key={activeIndex !== null ? 'active' : 'total'}
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="flex flex-col items-center"
               >
                  <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">
                    {activeIndex !== null ? segments[activeIndex].label : "Ordens Ativas"}
                  </span>
                  <span className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">
                    {activeIndex !== null ? segments[activeIndex].value : activeOrdersCount}
                  </span>
                  {activeIndex === null && (
                    <div className="mt-2 flex items-center gap-1 bg-[#FF5F1F]/10 px-2 py-1 rounded border border-[#FF5F1F]/20">
                       <Zap size={10} className="text-[#FF5F1F]" fill="#FF5F1F" />
                       <span className="text-[10px] text-[#FF5F1F] font-bold font-mono">ONLINE</span>
                    </div>
                  )}
               </motion.div>
            </div>
          </div>

          {/* LEGENDA */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
             {segments.map((item, index) => {
               const isActive = activeIndex === index;
               return (
                 <motion.div
                   key={item.id}
                   onMouseEnter={() => setActiveIndex(index)}
                   onMouseLeave={() => setActiveIndex(null)}
                   onTouchStart={() => setActiveIndex(index)}
                   animate={{
                     scale: isActive ? 1.02 : 1,
                     x: isActive ? 5 : 0,
                     backgroundColor: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                   }}
                   className={cn(
                     "cursor-pointer relative flex items-center justify-between p-3 rounded-xl border border-transparent transition-all",
                     !isActive && "hover:bg-white/5"
                   )}
                 >
                    {isActive && (
                      <motion.div 
                        layoutId="reactorGlow"
                        className="absolute left-0 w-1 h-8 rounded-r-full"
                        style={{ backgroundColor: item.color, boxShadow: `0 0 15px ${item.color}` }}
                      />
                    )}
                    <div className="flex items-center gap-3 pl-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                       <span className={cn("text-xs font-bold uppercase tracking-wider transition-colors", isActive ? 'text-white' : 'text-zinc-500')}>
                         {item.label}
                       </span>
                    </div>
                    <span className={cn("text-lg font-mono font-bold transition-colors", isActive ? 'text-white' : 'text-zinc-600')}>
                      {item.value}
                    </span>
                 </motion.div>
               );
             })}
          </div>
        </div>
      </div>
    </div>
  );
}