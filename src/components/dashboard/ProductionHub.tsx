
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Fingerprint, MousePointer2, Sparkles, Zap } from 'lucide-react';

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
    { id: 'art', label: 'Arte Final', value: stats.arte, color: '#e879f9' },
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

  // --- VARIANTES DE ANIMAÇÃO (Plasma Breathing) ---
  const segmentVariants = {
    idle: {
      strokeWidth: 12,
      filter: "drop-shadow(0 0 0px transparent)",
      opacity: 1,
      scale: 1,
    },
    dimmed: {
       opacity: 0.2,
       strokeWidth: 10,
       scale: 0.98,
       transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    },
    active: (color: string) => ({
      strokeWidth: [16, 20, 16], // Pulso de respiração
      filter: `drop-shadow(0 0 25px ${color}) brightness(1.3)`,
      opacity: 1,
      scale: 1.05,
      transition: {
        strokeWidth: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        filter: { duration: 0.4, ease: "easeOut" },
        scale: { duration: 0.4, ease: "easeOut" }
      }
    })
  };

  return (
    <div className="w-full flex justify-center p-2 md:p-6">
      
      {/* --- CONTAINER "RADIOATIVO" --- */}
      <div 
        className="
          group relative w-full max-w-4xl bg-[#09090b] 
          border border-zinc-800/80 rounded-[2.5rem] md:rounded-[3.5rem] 
          p-8 md:p-12 overflow-hidden transition-all duration-700 ease-out
          hover:border-primary 
          hover:shadow-[0_0_0_2px_rgba(255,95,31,0.3),0_0_60px_rgba(255,95,31,0.4),inset_0_0_40px_rgba(255,95,31,0.1)]
          hover:-translate-y-2
        "
      >
        
        {/* Luzes Volumétricas */}
        <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none mix-blend-screen transition-opacity duration-1000 group-hover:opacity-70" />
        <div className="absolute bottom-[-50%] right-[-20%] w-[150%] h-[150%] bg-primary/10 blur-[130px] rounded-full pointer-events-none mix-blend-screen transition-opacity duration-1000 group-hover:bg-primary/20 group-hover:opacity-100" />
        
        {/* Ruído Textural */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-0 group-hover:opacity-5 transition-opacity duration-1000 pointer-events-none mix-blend-overlay" />

        {/* --- CABEÇALHO --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 relative z-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <div className="relative">
                 <Activity size={16} className="text-primary relative z-10" />
                 <div className="absolute inset-0 bg-primary blur-sm animate-pulse z-0" />
               </div>
               <span className="text-primary text-xs font-bold uppercase tracking-[0.25em] drop-shadow-[0_0_10px_rgba(255,95,31,0.8)]">
                 Sistema Operacional Online
               </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-none">
              Reator de <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
                Produção
                <span className="absolute -bottom-2 left-0 w-1/3 h-1 bg-gradient-to-r from-primary to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500" />
              </span>
            </h2>
          </div>
          
          <div className="hidden md:flex p-4 rounded-full bg-white/5 border border-white/5 group-hover:border-primary/50 group-hover:bg-primary/10 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
            <Fingerprint className="text-zinc-500 group-hover:text-primary transition-colors" size={24} />
          </div>
        </div>

        {/* --- CONTEÚDO HUD --- */}
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-20 relative z-10">
          
          {/* O REATOR (GRÁFICO) */}
          <div className="relative w-[280px] h-[280px] md:w-[340px] md:h-[340px] shrink-0 flex items-center justify-center group/chart">
            
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border border-zinc-800/60 rounded-full border-dashed transition-all duration-500 group-hover/chart:border-primary/30 group-hover/chart:shadow-[0_0_30px_rgba(255,95,31,0.1)]"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-8 border border-zinc-800/40 rounded-full border-dotted transition-all duration-500 group-hover/chart:border-white/20"
            />

            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90 transform overflow-visible">
               <circle cx="100" cy="100" r={radius} stroke="#1a1a1a" strokeWidth="12" fill="transparent" className="transition-all duration-500 group-hover/chart:stroke-[#2a2a2a]" />

               {segments.map((item, index) => {
                 const percentage = (item.value / activeOrdersCount) * 100;
                 const dashArray = `${(percentage / 100) * circumference} ${circumference}`;
                 const dashOffset = -accumulatedOffset;
                 accumulatedOffset += (percentage / 100) * circumference;
                 
                 const isActive = activeIndex === index;
                 const variant = isActive ? 'active' : (activeIndex !== null ? 'dimmed' : 'idle');

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
                     animate={variant}
                     custom={item.color}
                     onMouseEnter={() => setActiveIndex(index)}
                     onMouseLeave={() => setActiveIndex(null)}
                     onTouchStart={() => setActiveIndex(index)}
                     style={{ transformOrigin: 'center' }}
                     className="cursor-pointer"
                   />
                 );
               })}
            </svg>

            {/* CENTRO DO HUD */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <AnimatePresence mode='wait'>
                 <motion.div
                   key={activeIndex !== null ? 'active' : 'total'}
                   initial={{ opacity: 0, scale: 0.9, y: 10 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 1.1, y: -10 }}
                   transition={{ duration: 0.3, ease: "easeOut" }}
                   className="flex flex-col items-center"
                 >
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-2">
                      {activeIndex !== null ? segments[activeIndex].label : "Protocolos Ativos"}
                    </span>
                    <span 
                      className="text-6xl md:text-7xl font-black text-white tracking-tighter leading-none"
                      style={{ 
                        textShadow: activeIndex !== null 
                          ? `0 0 30px ${segments[activeIndex].color}` 
                          : '0 0 30px rgba(255,255,255,0.1)'
                      }}
                    >
                      {activeIndex !== null ? segments[activeIndex].value : activeOrdersCount}
                    </span>
                    
                    {activeIndex === null && (
                      <motion.div 
                        initial={{ width: 0 }} animate={{ width: 'auto' }}
                        className="mt-3 flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/30"
                      >
                         <Sparkles size={12} className="text-primary" fill="currentColor" />
                         <span className="text-[10px] text-primary font-bold font-mono tracking-wider">SYNC ON</span>
                      </motion.div>
                    )}
                 </motion.div>
               </AnimatePresence>
            </div>
          </div>

          {/* LEGENDA HUD */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
             {segments.map((item, index) => {
               const isActive = activeIndex === index;
               
               return (
                 <motion.div
                   key={item.id}
                   onMouseEnter={() => setActiveIndex(index)}
                   onMouseLeave={() => setActiveIndex(null)}
                   onTouchStart={() => setActiveIndex(index)}
                   animate={{
                     scale: isActive ? 1.05 : 1,
                     x: isActive ? 15 : 0,
                     backgroundColor: isActive ? "rgba(255,255,255,0.03)" : "transparent",
                   }}
                   transition={{ duration: 0.4, ease: "easeOut" }}
                   className={`
                     cursor-pointer relative flex items-center justify-between p-4 rounded-2xl border border-transparent transition-all duration-500
                     ${!isActive ? 'hover:bg-white/5' : 'border-white/10 shadow-xl'}
                   `}
                 >
                    {isActive && (
                      <motion.div 
                        layoutId="activeGlowHub"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full"
                        style={{ backgroundColor: item.color, boxShadow: `0 0 20px ${item.color}` }}
                      />
                    )}

                    <div className="flex items-center gap-4 pl-4">
                       <div className="relative">
                          <div 
                            className="w-3 h-3 rounded-full transition-all duration-500 z-10 relative"
                            style={{ backgroundColor: item.color, boxShadow: isActive ? `0 0 20px ${item.color}` : `0 0 5px ${item.color}` }} 
                          />
                          {isActive && <div className="absolute inset-0 rounded-full animate-ping opacity-50" style={{ backgroundColor: item.color }} />}
                       </div>
                       <div>
                         <p className={`text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                           {item.label}
                         </p>
                       </div>
                    </div>

                    <div className="text-right">
                       <span 
                         className={`text-2xl font-mono font-black transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-zinc-700'}`}
                         style={isActive ? { textShadow: `0 0 15px ${item.color}` } : {}}
                       >
                         {item.value}
                       </span>
                    </div>
                 </motion.div>
               );
             })}

             {segments.length === 0 && (
               <div className="flex flex-col items-center justify-center py-10 opacity-20">
                 <MousePointer2 className="w-12 h-12 mb-4 text-zinc-500" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Aguardando Lançamentos</p>
               </div>
             )}
          </div>
        </div>

        <div className="absolute bottom-4 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
           <p className="text-[10px] text-zinc-600 uppercase tracking-widest flex justify-center items-center gap-2">
             <Zap size={12} className="text-primary" /> Interaja com o Reator para detalhes
           </p>
        </div>
      </div>
    </div>
  );
}
