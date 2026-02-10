
'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Fingerprint, Zap } from 'lucide-react';
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
}

export function ProductionHub({ stats }: ProductionHubProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Mapeia os dados reais para o formato do Ultra-Fluid Reactor
  const stageData = useMemo(() => [
    { id: 'art', label: 'Arte Final', value: stats.arte, color: '#d946ef' },
    { id: 'imp', label: 'Impressão', value: stats.impressao, color: '#3B82F6' },
    { id: 'serr', label: 'Serralheria', value: stats.serralheria, color: '#EAB308' },
    { id: 'acab', label: 'Acabamento', value: stats.acabamento, color: '#FF5F1F' },
    { id: 'inst', label: 'Instalação', value: stats.instalacao, color: '#22c55e' },
  ].filter(s => s.value > 0), [stats]);

  const totalValue = stageData.reduce((acc, item) => acc + item.value, 0);

  // Configurações do SVG
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  // --- FÍSICA DE MOLA PERSONALIZADA ---
  const fluidSpring = {
    type: "spring",
    stiffness: 250,
    damping: 25,
    mass: 0.8
  };

  const segmentVariants = {
    idle: {
      strokeWidth: 12,
      scale: 1,
      opacity: 0.4,
      filter: "drop-shadow(0 0 0px rgba(0,0,0,0))",
      transition: { duration: 0.4, ease: "easeInOut" }
    },
    default: {
        strokeWidth: 14,
        scale: 1,
        opacity: 1,
        filter: "drop-shadow(0 0 0px rgba(0,0,0,0))",
        transition: fluidSpring
    },
    active: (color: string) => ({
      strokeWidth: [18, 22, 18], // Respiração
      scale: 1.05,
      opacity: 1,
      filter: `drop-shadow(0 0 25px ${color}) brightness(1.3)`,
      transition: {
        strokeWidth: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        scale: fluidSpring,
        filter: { duration: 0.3 },
        opacity: { duration: 0.3 }
      }
    })
  };

  return (
    <div className="w-full flex justify-center">
      <div className="relative w-full max-w-4xl bg-[#09090b] border border-zinc-800/50 rounded-[3rem] p-8 md:p-12 overflow-hidden transition-all duration-500 hover:border-[#FF5F1F]/30 hover:shadow-[0_0_50px_-10px_rgba(255,95,31,0.15)]">
        
        {/* Luz de fundo reativa */}
        <motion.div 
            animate={{ 
                backgroundColor: activeIndex !== null ? stageData[activeIndex].color : '#FF5F1F',
                opacity: activeIndex !== null ? 0.1 : 0.05
            }}
            transition={{ duration: 1 }}
            className="absolute inset-0 blur-[120px] pointer-events-none" 
        />

        {/* HEADER */}
        <div className="flex justify-between items-start mb-10 relative z-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <Activity size={14} className="text-[#FF5F1F] animate-pulse" />
               <span className="text-[#FF5F1F] text-[10px] font-bold uppercase tracking-[0.3em]">
                 Monitoramento Ativo
               </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
              Reator de <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">Produção</span>
            </h2>
          </div>
          <Fingerprint className="text-zinc-700 opacity-50 hidden md:block" size={48} strokeWidth={1} />
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20 relative z-10">
          
          {/* 1. O GRÁFICO (REATOR) */}
          <div className="relative w-[280px] h-[280px] md:w-[320px] md:h-[320px] shrink-0 flex items-center justify-center group/chart">
            
            {/* Anéis decorativos de fundo */}
            <div className="absolute inset-0 border border-zinc-800/20 rounded-full border-dashed animate-[spin_60s_linear_infinite]" />
            <div className="absolute inset-4 border border-zinc-800/10 rounded-full border-dotted animate-[spin_40s_linear_infinite_reverse]" />

            <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90 transform overflow-visible">
               <circle cx="120" cy="120" r={radius} stroke="#1a1a1a" strokeWidth="14" fill="transparent" />

               {stageData.map((item, index) => {
                 const percentage = (item.value / totalValue) * 100;
                 const dashArray = `${(percentage / 100) * circumference} ${circumference}`;
                 const dashOffset = -accumulatedOffset;
                 accumulatedOffset += (percentage / 100) * circumference;
                 
                 const isActive = activeIndex === index;
                 const currentVariant = activeIndex !== null ? (isActive ? 'active' : 'idle') : 'default';

                 return (
                   <motion.circle
                     key={item.id}
                     cx="120" cy="120" r={radius}
                     fill="transparent"
                     stroke={item.color}
                     strokeDasharray={dashArray}
                     strokeDashoffset={dashOffset}
                     strokeLinecap="round"
                     variants={segmentVariants}
                     initial="default"
                     animate={currentVariant}
                     custom={item.color}
                     onMouseEnter={() => setActiveIndex(index)}
                     onMouseLeave={() => setActiveIndex(null)}
                     onTouchStart={() => setActiveIndex(index)}
                     style={{ transformOrigin: 'center' }}
                     className="cursor-pointer transition-all"
                   />
                 );
               })}
            </svg>

            {/* TEXTO CENTRAL */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden">
               <AnimatePresence mode='wait'>
                 <motion.div
                   key={activeIndex !== null ? activeIndex : 'total'}
                   initial={{ opacity: 0, y: 20, scale: 0.9 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, y: -20, scale: 0.9 }}
                   transition={{ 
                     opacity: { duration: 0.2 },
                     y: fluidSpring,
                     scale: fluidSpring
                   }}
                   className="flex flex-col items-center"
                 >
                    <span 
                        className="text-[10px] uppercase font-bold tracking-[0.3em] mb-1 transition-colors duration-300"
                        style={{ color: activeIndex !== null ? stageData[activeIndex].color : '#71717a' }}
                    >
                      {activeIndex !== null ? stageData[activeIndex].label : "Total Ativo"}
                    </span>
                    <span 
                      className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none transition-all duration-300"
                      style={{ 
                        textShadow: activeIndex !== null 
                          ? `0 0 30px ${stageData[activeIndex].color}` 
                          : 'none'
                      }}
                    >
                      {activeIndex !== null ? stageData[activeIndex].value : totalValue}
                    </span>
                    {activeIndex === null && (
                      <div className="mt-4 flex items-center gap-1.5 bg-[#FF5F1F]/10 px-2.5 py-1 rounded-full border border-[#FF5F1F]/20">
                        <Zap size={10} className="text-[#FF5F1F]" fill="#FF5F1F" />
                        <span className="text-[10px] text-[#FF5F1F] font-bold font-mono uppercase tracking-widest">Online</span>
                      </div>
                    )}
                 </motion.div>
               </AnimatePresence>
            </div>
          </div>

          {/* 2. A LEGENDA (Lado Direito) */}
          <div className="flex-1 w-full space-y-2">
             {stageData.map((item, index) => {
               const isActive = activeIndex === index;
               
               return (
                 <motion.div
                   key={item.id}
                   onMouseEnter={() => setActiveIndex(index)}
                   onMouseLeave={() => setActiveIndex(null)}
                   onTouchStart={() => setActiveIndex(index)}
                   animate={{
                     scale: isActive ? 1.02 : 1,
                     x: isActive ? 10 : 0,
                     backgroundColor: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                     borderColor: isActive ? "rgba(255,255,255,0.1)" : "transparent"
                   }}
                   transition={fluidSpring}
                   className={cn(
                     "cursor-pointer relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
                     isActive ? "border-white/10" : "border-transparent hover:bg-zinc-900/50"
                   )}
                 >
                    <div className="flex items-center gap-4 pl-2">
                       <div className="relative flex items-center justify-center">
                          <motion.div 
                            animate={{
                                scale: isActive ? [1, 1.5, 1] : 1,
                                opacity: isActive ? 0.5 : 0
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute w-full h-full rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <div 
                            className="w-2.5 h-2.5 rounded-full relative z-10 transition-all duration-300"
                            style={{ backgroundColor: item.color, boxShadow: isActive ? `0 0 15px ${item.color}` : `0 0 5px ${item.color}` }} 
                          />
                       </div>
                       
                       <div className="flex flex-col">
                         <span className={cn(
                           "text-xs font-bold uppercase tracking-wider transition-colors duration-300",
                           isActive ? "text-white" : "text-zinc-500"
                         )}>
                           {item.label}
                         </span>
                         {/* Mini barra de progresso */}
                         <div className="h-1 w-24 bg-zinc-900 rounded-full mt-1.5 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.value / totalValue) * 100}%` }}
                              transition={{ duration: 1.5 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                         </div>
                       </div>
                    </div>

                    <div className="text-right">
                       <span className={cn(
                         "text-xl md:text-2xl font-mono font-black transition-colors duration-300",
                         isActive ? "text-white" : "text-zinc-600"
                       )}>
                         {item.value}
                       </span>
                    </div>
                 </motion.div>
               );
             })}
          </div>

        </div>
      </div>
    </div>
  );
}
