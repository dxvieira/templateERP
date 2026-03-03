
'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Fingerprint, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

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

/**
 * Componente do Reator de Produção - Refatorado para ocupar o container pai sem bordas duplicadas.
 * Inclui inteligência responsiva para exibição da logo apenas em desktops.
 */
export function ProductionHub({ stats }: ProductionHubProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const stageData = useMemo(() => [
    { id: 'art', label: 'Arte Final', value: stats.arte, color: '#d946ef' },
    { id: 'imp', label: 'Impressão', value: stats.impressao, color: '#3B82F6' },
    { id: 'serr', label: 'Serralheria', value: stats.serralheria, color: '#EAB308' },
    { id: 'acab', label: 'Acabamento', value: stats.acabamento, color: '#FF5F1F' },
    { id: 'inst', label: 'Instalação', value: stats.instalacao, color: '#8B5CF6' },
  ].filter(s => s.value > 0), [stats]);

  const totalValue = stageData.reduce((acc, item) => acc + item.value, 0);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const fluidSpring = {
    type: "spring",
    stiffness: 250,
    damping: 25,
    mass: 0.8
  };

  const segmentVariants = {
    idle: {
      strokeWidth: 10,
      scale: 1,
      opacity: 0.4,
      transition: { duration: 0.4, ease: "easeInOut" }
    },
    default: {
        strokeWidth: 12,
        scale: 1,
        opacity: 1,
        transition: fluidSpring
    },
    active: (color: string) => ({
      strokeWidth: [14, 18, 14],
      scale: 1.05,
      opacity: 1,
      filter: `drop-shadow(0 0 20px ${color})`,
      transition: {
        strokeWidth: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        scale: fluidSpring,
        filter: { duration: 0.3 }
      }
    })
  };

  return (
    <div className="relative w-full h-full">
      <motion.div 
          animate={{ 
              backgroundColor: activeIndex !== null ? stageData[activeIndex].color : '#FF5F1F',
              opacity: activeIndex !== null ? 0.08 : 0.04
          }}
          transition={{ duration: 1 }}
          className="absolute inset-0 blur-[100px] pointer-events-none" 
      />

      <div className="flex justify-between items-start mb-8 relative z-10 gap-4">
        <div>
          {/* LOGO DO CARD: VISÍVEL APENAS EM DESKTOP PARA EVITAR REDUNDÂNCIA NO MOBILE */}
          <div className="hidden md:block relative w-32 h-8 mb-4 opacity-60">
            <Image 
              src="https://firebasestorage.googleapis.com/v0/b/studio-8015019704-68176.firebasestorage.app/o/logo%20IMPACTO.png?alt=media&token=c481fc0a-08b9-4613-bb67-d4052b3a39dd"
              alt="Logo IMPACTO"
              fill
              className="object-contain object-left"
            />
          </div>

          <div className="flex items-center gap-2 mb-1.5">
             <Activity size={12} className="text-[#FF5F1F] animate-pulse" />
             <span className="text-[#FF5F1F] text-[9px] font-bold uppercase tracking-[0.3em]">
               Monitoramento Ativo
             </span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter leading-none">
            Reator de <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">Produção</span>
          </h2>
        </div>
        <Fingerprint className="text-zinc-700 opacity-30 hidden md:block" size={40} strokeWidth={1} />
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 relative z-10">
        <div className="relative w-[240px] h-[240px] md:w-[280px] md:h-[280px] shrink-0 flex items-center justify-center group/chart">
          <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90 transform overflow-visible">
             <circle cx="120" cy="120" r={radius} stroke="#1a1a1a" strokeWidth="12" fill="transparent" />

             {stageData.map((item, index) => {
               const percentage = (item.value / totalValue) * 100;
               const dashArray = `${(percentage / 100) * circumference} ${circumference}`;
               const dashOffset = -accumulatedOffset;
               accumulatedOffset += (percentage / 100) * circumference;
               
               const isActive = activeIndex === index;
               const currentVariant = activeIndex !== null ? (isActive ? 'active' : 'idle') : 'default';

               return (
                 <motion.circle
                   key={item.id} cx="120" cy="120" r={radius} fill="transparent"
                   stroke={item.color} strokeDasharray={dashArray} strokeDashoffset={dashOffset}
                   strokeLinecap="round" variants={segmentVariants}
                   initial="default" animate={currentVariant} custom={item.color}
                   onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}
                   className="cursor-pointer transition-all" style={{ transformOrigin: 'center' }}
                 />
               );
             })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <AnimatePresence mode='wait'>
               <motion.div
                 key={activeIndex !== null ? activeIndex : 'total'}
                 initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -15, scale: 0.95 }}
                 transition={{ opacity: { duration: 0.2 }, y: fluidSpring }}
                 className="flex flex-col items-center"
               >
                  <span className="text-[9px] uppercase font-bold tracking-[0.3em] mb-0.5 transition-colors" style={{ color: activeIndex !== null ? stageData[activeIndex].color : '#71717a' }}>
                    {activeIndex !== null ? stageData[activeIndex].label : "Total Ativo"}
                  </span>
                  <span className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none" style={{ textShadow: activeIndex !== null ? `0 0 25px ${stageData[activeIndex].color}` : 'none' }}>
                    {activeIndex !== null ? stageData[activeIndex].value : totalValue}
                  </span>
                  {activeIndex === null && (
                    <div className="mt-3 flex items-center gap-1.5 bg-[#FF5F1F]/10 px-2 py-0.5 rounded-full border border-[#FF5F1F]/20">
                      <Zap size={8} className="text-[#FF5F1F]" fill="#FF5F1F" />
                      <span className="text-[8px] text-[#FF5F1F] font-bold font-mono uppercase tracking-widest">Online</span>
                    </div>
                  )}
               </motion.div>
             </AnimatePresence>
          </div>
        </div>

        <div className="flex-1 w-full space-y-1.5">
           {stageData.map((item, index) => {
             const isActive = activeIndex === index;
             return (
               <motion.div
                 key={item.id} onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}
                 animate={{ scale: isActive ? 1.01 : 1, x: isActive ? 5 : 0, backgroundColor: isActive ? "rgba(255,255,255,0.03)" : "transparent" }}
                 transition={fluidSpring}
                 className={cn("cursor-pointer flex items-center justify-between p-3 rounded-xl border border-transparent transition-all", isActive && "border-white/10")}
               >
                  <div className="flex items-center gap-3 pl-1">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }} />
                     <div className="flex flex-col">
                       <span className={cn("text-[10px] font-bold uppercase tracking-wider", isActive ? "text-white" : "text-zinc-500")}>{item.label}</span>
                       <div className="h-0.5 w-16 bg-zinc-900 rounded-full mt-1 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(item.value / totalValue) * 100}%` }} className="h-full rounded-full" style={{ backgroundColor: item.color }} />
                       </div>
                     </div>
                  </div>
                  <span className={cn("text-lg font-mono font-black", isActive ? "text-white" : "text-zinc-600")}>{item.value}</span>
               </motion.div>
             );
           })}
        </div>
      </div>
    </div>
  );
}
