
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, PieChart, ArrowUpRight } from 'lucide-react';

// --- COMPONENTE: GRÁFICO DONUT ANIMADO (SVG PURO) ---
const AnimatedDonut = ({ data, total }: { data: any[], total: number }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercentage = 0;

  if (total === 0) return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full" />
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} stroke="#1f1f1f" strokeWidth="12" fill="transparent" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-zinc-500 text-[10px] font-bold uppercase">Zera</span>
      </div>
    </div>
  );

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
      
      <svg width="100%" height="100%" viewBox="0 0 100 100" className="-rotate-90 transform">
        <circle cx="50" cy="50" r={radius} stroke="#1f1f1f" strokeWidth="12" fill="transparent" />
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const strokeDashoffset = circumference - (percentage / 100) * circumference;
          const rotation = (accumulatedPercentage / 100) * 360;
          accumulatedPercentage += percentage;

          return (
            <motion.circle
              key={index}
              cx="50"
              cy="50"
              r={radius}
              stroke={item.color}
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: strokeDashoffset }}
              transition={{ duration: 1.5, delay: 0.2 + (index * 0.1), ease: "easeOut" }}
              strokeLinecap="round"
              style={{ transformOrigin: '50% 50%', rotate: `${rotation}deg` }}
              className="drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]"
            />
          );
        })}
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Total</span>
        <motion.span 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, type: "spring" }}
          className="text-2xl font-black text-white"
        >
          {total}
        </motion.span>
      </div>
    </div>
  );
};

export function ProductionHub({ stats, orders }: { stats: any, orders: any[] }) {
  const activeOrdersCount = orders.filter(o => !['Concluído', 'Entregue'].includes(o.status)).length;
  
  // Capacidade nominal baseada em 50 ordens (ajustável)
  const capacityPercentage = Math.min(Math.round((activeOrdersCount / 50) * 100), 100);

  const breakdown = [
    { label: 'Arte', value: stats.arte, color: '#D026FF' },
    { label: 'Impressão', value: stats.impressao, color: '#3B82F6' },
    { label: 'Serralheria', value: stats.serralheria, color: '#FACC15' },
    { label: 'Acabamento', value: stats.acabamento, color: '#FF5F1F' },
    { label: 'Instalação', value: stats.instalacao, color: '#EF4444' },
  ].filter(i => i.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full"
    >
      <div className="
        group relative overflow-hidden rounded-[2.5rem] bg-[#0A0A0A] border border-zinc-800
        p-8 md:p-10 transition-all duration-500
        hover:border-primary/50 hover:shadow-[0_0_60px_-15px_rgba(255,95,31,0.15)]
      ">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none transition-all duration-700 group-hover:bg-blue-600/10" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none transition-all duration-700 group-hover:bg-primary/10" />

        <div className="flex justify-between items-start mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <Activity size={16} className="text-primary animate-pulse" />
               <h3 className="text-primary font-bold text-xs uppercase tracking-[0.3em]">Tempo Real</h3>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Inteligência de <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 to-zinc-500">Fluxo</span>
            </h2>
          </div>
          <button className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
            Fila Ativa <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-zinc-500 text-sm font-medium mb-2 uppercase tracking-widest">Produção Ativa</p>
              <div className="flex items-baseline gap-2">
                <motion.span 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-7xl font-black text-white leading-none tracking-tighter"
                >
                  {activeOrdersCount}
                </motion.span>
                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Protocolos</span>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex justify-between mb-2 text-[10px] font-bold uppercase tracking-[0.2em]">
                <span className="text-zinc-400">Ocupação da Esteira</span>
                <span className="text-primary">{capacityPercentage}%</span>
              </div>
              <div className="h-4 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-[2px]">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${capacityPercentage}%` }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="h-full bg-gradient-to-r from-primary to-orange-600 rounded-full relative"
                >
                  <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite]" />
                </motion.div>
              </div>
              <p className="text-[10px] text-zinc-600 mt-3 flex items-center gap-2 uppercase font-black tracking-widest">
                <Zap size={12} className="text-yellow-500" /> Fluxo de Dados Sincronizado
              </p>
            </div>
          </div>

          <div className="bg-white/5 rounded-[2rem] p-8 border border-white/5 backdrop-blur-sm flex items-center gap-10 group/chart hover:bg-white/[0.07] transition-colors">
            <div className="shrink-0">
               <AnimatedDonut data={breakdown} total={activeOrdersCount} />
            </div>

            <div className="flex-1 space-y-4">
               <h4 className="text-white font-black text-[10px] uppercase tracking-[0.3em] mb-4 flex items-center gap-2 opacity-50">
                 <PieChart size={14} /> Distribuição
               </h4>
               
               <div className="grid grid-cols-1 gap-2">
                 {breakdown.map((item, idx) => (
                   <motion.div 
                     key={idx}
                     initial={{ opacity: 0, x: 10 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.5 + (idx * 0.1) }}
                     className="flex items-center justify-between group/item cursor-pointer"
                   >
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: item.color, color: item.color }} />
                        <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest group-hover/item:text-white transition-colors">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-white font-mono font-bold text-xs">
                        {item.value}
                      </span>
                   </motion.div>
                 ))}
                 {breakdown.length === 0 && (
                   <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Sem dados ativos</p>
                 )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
