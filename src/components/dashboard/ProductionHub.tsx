'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Fingerprint } from 'lucide-react';

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
  const segments = [
    { id: 'art', label: 'Arte Final', value: stats.arte, color: '#d946ef' },
    { id: 'print', label: 'Impressão', value: stats.impressao, color: '#22d3ee' },
    { id: 'metal', label: 'Serralheria', value: stats.serralheria, color: '#facc15' },
    { id: 'finish', label: 'Acabamento', value: stats.acabamento, color: '#FF5F1F' },
    { id: 'install', label: 'Instalação', value: stats.instalacao, color: '#4ade80' },
  ].filter(s => s.value > 0);

  const activeOrdersCount = segments.reduce((acc, item) => acc + item.value, 0);

  // Configurações do SVG
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  // Variantes de Animação do Gráfico (Plasma Breathing mais vibrante)
  const segmentVariants = {
    idle: {
      strokeWidth: 12,
      filter: "drop-shadow(0 0 0px transparent)",
      opacity: 1,
      scale: 1,
    },
    dimmed: {
       opacity: 0.25,
       strokeWidth: 10,
       scale: 0.98,
       transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    },
    active: (color: string) => ({
      strokeWidth: [14, 18, 14], 
      filter: `drop-shadow(0 0 20px ${color}) brightness(1.2)`, 
      opacity: 1,
      scale: 1.04,
      transition: {
        strokeWidth: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        scale: { duration: 0.3, ease: "easeOut" },
        filter: { duration: 0.3 }
      }
    })
  };

  return (
    <div className="w-full flex justify-center">
      
      {/* --- O CARD PRINCIPAL (Estilo Clean & VIBRANT Outer Glow) --- */}
      <div 
        className="
          group relative w-full max-w-4xl bg-[#09090b] 
          border border-zinc-800 rounded-[2.5rem] md:rounded-[3rem] 
          p-6 md:p-12 overflow-visible transition-all duration-700 ease-out
          
          /* Glow Externo Potencializado */
          hover:border-[#FF5F1F]/60 
          hover:shadow-[0_20px_100px_-20px_rgba(255,95,31,0.35)] 
          hover:-translate-y-2
        "
      >
        
        {/* Luzes de Fundo (Mais vibrantes e externas) */}
        <div className="absolute -z-10 top-[-25%] left-[-15%] w-[130%] h-[130%] bg-blue-600/10 blur-[120px] rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-1000" />
        <div className="absolute -z-10 bottom-[-25%] right-[-15%] w-[130%] h-[130%] bg-[#FF5F1F]/10 blur-[120px] rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-1000" />

        {/* --- CABEÇALHO --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 relative z-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <div className="relative">
                 <Activity size={14} className="text-[#FF5F1F] relative z-10" />
                 <div className="absolute inset-0 bg-[#FF5F1F] blur-md animate-pulse z-0 opacity-50"></div>
               </div>
               <span className="text-[#FF5F1F] text-xs font-bold uppercase tracking-[0.25em] drop-shadow-[0_0_12px_rgba(255,95,31,0.8)]">
                 Monitoramento Ativo
               </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-none">
              Reator de <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-500">Produção</span>
            </h2>
          </div>
          
          <div className="hidden md:flex p-3 rounded-full border border-zinc-800 text-zinc-600 group-hover:text-[#FF5F1F] group-hover:border-[#FF5F1F]/40 group-hover:bg-[#FF5F1F]/10 transition-all duration-500">
            <Fingerprint size={24} />
          </div>
        </div>

        {/* --- CONTEÚDO HUD --- */}
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-20 relative z-10">
          
          {/* 1. O GRÁFICO (REATOR) */}
          <div className="relative w-[280px] h-[280px] md:w-[340px] md:h-[340px] shrink-0 flex items-center justify-center group/chart">
            
            {/* HUD Rings (Elegantes e Sutis) */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border border-zinc-800/40 rounded-full border-dashed"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="absolute inset-8 border border-zinc-800/30 rounded-full border-dotted"
            />

            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90 transform overflow-visible">
               {/* Trilho Base */}
               <circle cx="100" cy="100" r={radius} stroke="#121212" strokeWidth="12" fill="transparent" />

               {/* Segmentos */}
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
                     strokeDasharray={dashArray}
                     strokeDashoffset={dashOffset}
                     strokeLinecap="round"
                     variants={segmentVariants}
                     initial="idle"
                     animate={isActive ? 'active' : (activeIndex !== null ? 'dimmed' : 'idle')}
                     custom={item.color}
                     onMouseEnter={() => setActiveIndex(index)}
                     onMouseLeave={() => setActiveIndex(null)}
                     onTouchStart={() => setActiveIndex(index)}
                     className="cursor-pointer transition-all duration-300"
                     style={{ transformOrigin: 'center' }}
                   />
                 );
               })}
            </svg>

            {/* TEXTO CENTRAL DINÂMICO */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <AnimatePresence mode='wait'>
                 <motion.div
                   key={activeIndex !== null ? 'active' : 'total'}
                   initial={{ opacity: 0, y: 8 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -8 }}
                   transition={{ duration: 0.25, ease: "easeOut" }}
                   className="flex flex-col items-center"
                 >
                    <span className="text-zinc-500 text-[10px] md:text-xs uppercase font-bold tracking-widest mb-2 text-center">
                      {activeIndex !== null ? segments[activeIndex].label : "Total em Produção"}
                    </span>
                    <span 
                      className="text-6xl md:text-7xl font-black text-white tracking-tighter leading-none"
                      style={{ 
                        textShadow: activeIndex !== null 
                          ? `0 0 25px ${segments[activeIndex].color}` 
                          : '0 0 25px rgba(255,255,255,0.1)'
                      }}
                    >
                      {activeIndex !== null ? segments[activeIndex].value : activeOrdersCount}
                    </span>
                    
                    {activeIndex === null && (
                      <div className="mt-4 flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                         <div className="w-1.5 h-1.5 rounded-full bg-[#FF5F1F] animate-pulse shadow-[0_0_10px_#FF5F1F]" />
                         <span className="text-[10px] text-zinc-400 font-bold font-mono tracking-wider">SYNC</span>
                      </div>
                    )}
                 </motion.div>
               </AnimatePresence>
            </div>
          </div>

          {/* 2. A LEGENDA (Clean HUD List) */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
             {segments.map((item, index) => {
               const isActive = activeIndex === index;
               
               return (
                 <motion.div
                   key={item.id}
                   onMouseEnter={() => setActiveIndex(index)}
                   onMouseLeave={() => setActiveIndex(null)}
                   onTouchStart={() => setActiveIndex(index)}
                   animate={{
                     x: isActive ? 8 : 0,
                     backgroundColor: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                   }}
                   className={`
                     cursor-pointer flex items-center justify-between p-3 rounded-xl border border-transparent transition-all duration-300
                     ${!isActive ? 'hover:bg-zinc-900/50' : 'border-white/5 shadow-lg'}
                   `}
                 >
                    <div className="flex items-center gap-4 pl-2">
                       <div 
                         className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                         style={{ 
                           backgroundColor: item.color, 
                           boxShadow: isActive ? `0 0 15px ${item.color}` : 'none',
                           opacity: isActive ? 1 : 0.6
                         }} 
                       />
                       
                       <div className="flex flex-col">
                         <span className={`text-sm font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                           {item.label}
                         </span>
                       </div>
                    </div>

                    <div className="text-right">
                       <span 
                         className={`text-xl font-mono font-bold transition-colors ${isActive ? 'text-white scale-110' : 'text-zinc-600'}`}
                         style={isActive ? { textShadow: `0 0 15px ${item.color}` } : {}}
                       >
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
