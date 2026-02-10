'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Activity, Fingerprint, MousePointer2 } from 'lucide-react';

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
    { id: 'print', label: 'Impressão', value: stats.impressao, color: '#06b6d4' },
    { id: 'metal', label: 'Serralheria', value: stats.serralheria, color: '#facc15' },
    { id: 'finish', label: 'Acabamento', value: stats.acabamento, color: '#FF5F1F' },
    { id: 'install', label: 'Instalação', value: stats.instalacao, color: '#22c55e' },
  ].filter(s => s.value > 0);

  const activeOrdersCount = segments.reduce((acc, item) => acc + item.value, 0);

  // Configurações do Reator (SVG)
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="w-full flex justify-center p-2 md:p-6">
      
      {/* --- O CARD PRINCIPAL (Container HUD) --- */}
      <div 
        className="
          group relative w-full max-w-4xl bg-[#0a0a0a] 
          border border-zinc-800 rounded-[2.5rem] md:rounded-[3rem] 
          p-8 md:p-12 overflow-hidden transition-all duration-500
          hover:border-[#FF5F1F] hover:shadow-[0_0_80px_-20px_rgba(255,95,31,0.25)]
          hover:-translate-y-1
        "
      >
        
        {/* LUZES DE AMBIENTE (Aurora Background) */}
        <div className="absolute top-[-50%] left-[-20%] w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-1000" />
        <div className="absolute bottom-[-50%] right-[-20%] w-[500px] h-[500px] bg-[#FF5F1F]/5 blur-[120px] rounded-full pointer-events-none group-hover:bg-[#FF5F1F]/10 transition-colors duration-1000" />

        {/* --- CABEÇALHO DO HUD --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 relative z-10 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <Activity size={16} className="text-[#FF5F1F] animate-pulse" />
               <span className="text-[#FF5F1F] text-[10px] font-black uppercase tracking-[0.4em] drop-shadow-[0_0_8px_rgba(255,95,31,0.5)]">
                 Monitoramento VisComm Online
               </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
              Reator de <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-600">Produção</span>
            </h2>
          </div>
          <Fingerprint className="text-zinc-800 w-16 h-16 opacity-30 md:opacity-50" strokeWidth={1} />
        </div>

        {/* --- CORPO PRINCIPAL (HUD) --- */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20 relative z-10">
          
          {/* O REATOR CENTRAL (Gráfico) */}
          <div className="relative w-[280px] h-[280px] md:w-[350px] md:h-[350px] flex items-center justify-center shrink-0">
            
            {/* Anéis HUD Giratórios */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border border-white/5 rounded-full border-dashed opacity-40 scale-110"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 border border-white/5 rounded-full border-dotted opacity-20 scale-105"
            />
            <div className="absolute inset-10 border border-zinc-900 rounded-full opacity-50 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]" />

            {/* SVG DO DONUT */}
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90 transform overflow-visible z-10 drop-shadow-2xl">
               {/* Trilho Base */}
               <circle cx="100" cy="100" r={radius} stroke="#111111" strokeWidth="14" fill="transparent" />

               {activeOrdersCount > 0 ? (
                 segments.map((item, index) => {
                   const percentage = (item.value / activeOrdersCount) * 100;
                   const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                   const strokeDashoffset = -accumulatedOffset;
                   accumulatedOffset += (percentage / 100) * circumference;
                   
                   const isActive = activeIndex === index;
                   const isDimmed = activeIndex !== null && !isActive;

                   return (
                     <motion.circle
                       key={item.id}
                       cx="100"
                       cy="100"
                       r={radius}
                       fill="transparent"
                       stroke={item.color}
                       strokeWidth={isActive ? 20 : 14}
                       strokeDasharray={strokeDasharray}
                       strokeDashoffset={strokeDashoffset}
                       strokeLinecap="round"
                       initial={{ strokeDasharray: `0 ${circumference}` }}
                       animate={{ 
                          strokeDasharray,
                          opacity: isDimmed ? 0.2 : 1,
                          filter: isActive ? `drop-shadow(0 0 12px ${item.color})` : "none"
                       }}
                       transition={{ duration: 1, type: "spring", bounce: 0 }}
                       onMouseEnter={() => setActiveIndex(index)}
                       onMouseLeave={() => setActiveIndex(null)}
                       onTouchStart={() => setActiveIndex(index)}
                       className="cursor-pointer transition-all"
                     />
                   );
                 })
               ) : (
                 <circle cx="100" cy="100" r={radius} stroke="#1f1f1f" strokeWidth="14" fill="transparent" strokeDasharray="5,10" />
               )}
            </svg>

            {/* CENTRO DINÂMICO */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
               <AnimatePresence mode="wait">
                 <motion.div
                   key={activeIndex !== null ? 'item' : 'total'}
                   initial={{ opacity: 0, y: 10, scale: 0.9 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, y: -10, scale: 0.9 }}
                   transition={{ duration: 0.2 }}
                   className="flex flex-col items-center"
                 >
                    <span className="text-zinc-500 text-[10px] uppercase font-black tracking-[0.3em] mb-2">
                      {activeIndex !== null ? segments[activeIndex].label : "Protocolos Ativos"}
                    </span>
                    <span className="text-6xl md:text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                      {activeIndex !== null ? segments[activeIndex].value : activeOrdersCount}
                    </span>
                    {activeIndex === null && (
                      <div className="mt-4 flex items-center gap-2 bg-[#FF5F1F]/10 px-4 py-1.5 rounded-full border border-[#FF5F1F]/20">
                         <Zap size={12} className="text-[#FF5F1F]" fill="currentColor" />
                         <span className="text-[10px] text-[#FF5F1F] font-black uppercase tracking-widest">Sincronizado</span>
                      </div>
                    )}
                 </motion.div>
               </AnimatePresence>
            </div>
          </div>

          {/* LEGENDA HUD (Lista Dinâmica) */}
          <div className="flex-1 w-full flex flex-col gap-4">
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
                     backgroundColor: isActive ? "rgba(255,255,255,0.03)" : "transparent"
                   }}
                   className={`
                     cursor-pointer relative flex items-center justify-between p-4 rounded-2xl border border-transparent transition-all duration-300
                     ${isActive ? 'border-white/10 shadow-xl' : 'hover:bg-white/5'}
                   `}
                 >
                    {isActive && (
                      <motion.div 
                        layoutId="activeGlowHub"
                        className="absolute left-0 w-1 h-10 rounded-r-full shadow-[0_0_15px_currentColor]"
                        style={{ backgroundColor: item.color, color: item.color }}
                      />
                    )}

                    <div className="flex items-center gap-5 pl-3">
                       <div 
                         className="w-4 h-4 rounded-full shadow-[0_0_12px_currentColor] transition-all"
                         style={{ 
                           backgroundColor: item.color, 
                           color: item.color,
                           opacity: isActive ? 1 : 0.6 
                         }} 
                       />
                       <div>
                         <p className={`text-[11px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                           {item.label}
                         </p>
                         <div className="h-1.5 w-32 md:w-48 bg-zinc-900 rounded-full mt-2.5 overflow-hidden border border-white/5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.value / activeOrdersCount) * 100}%` }}
                              transition={{ duration: 1.5, ease: "circOut" }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                         </div>
                       </div>
                    </div>

                    <div className="text-right">
                       <span className={`text-2xl font-black font-mono transition-colors ${isActive ? 'text-white' : 'text-zinc-700'}`}>
                         {item.value}
                       </span>
                    </div>
                 </motion.div>
               );
             })}

             {segments.length === 0 && (
               <div className="flex flex-col items-center justify-center py-10 opacity-20">
                 <Fingerprint className="w-12 h-12 mb-4 text-zinc-500" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Aguardando Lançamentos</p>
               </div>
             )}
          </div>
        </div>

        {/* --- RODAPÉ DECORATIVO --- */}
        <div className="absolute bottom-4 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
           <p className="text-[10px] text-zinc-600 uppercase tracking-widest flex justify-center items-center gap-2">
             <MousePointer2 size={12} className="text-[#FF5F1F]" /> Interaja com o Reator para detalhes
           </p>
        </div>
      </div>
    </div>
  );
}
