'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

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
 * ProductionHub — Tier-1 Redesign.
 *
 * Mudanças:
 * - Removido: logo + "Monitoramento Ativo" piscante (ruído de branding)
 * - Removido: ícone Fingerprint decorativo (clutter)
 * - Adicionado: header limpo com hierarquia tipográfica clara
 * - Mantido: gráfico radial SVG interativo (já era Tier-1)
 * - Mantido: legenda lateral com mini progress bars
 */
export function ProductionHub({ stats }: ProductionHubProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const stageData = useMemo(() => [
    { id: 'art',  label: 'Arte Final',   value: stats.arte,       color: '#d946ef' },
    { id: 'imp',  label: 'Impressão',    value: stats.impressao,  color: '#3B82F6' },
    { id: 'serr', label: 'Serralheria',  value: stats.serralheria,color: '#EAB308' },
    { id: 'acab', label: 'Acabamento',   value: stats.acabamento, color: '#FF5F1F' },
    { id: 'inst', label: 'Instalação',   value: stats.instalacao, color: '#8B5CF6' },
  ].filter(s => s.value > 0), [stats]);

  const totalValue = stageData.reduce((acc, item) => acc + item.value, 0);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="relative w-full h-full">
      {/* Glow dinâmico suave baseado na etapa ativa */}
      <motion.div
        animate={{
          backgroundColor: activeIndex !== null ? stageData[activeIndex]?.color : '#FF5F1F',
          opacity: activeIndex !== null ? 0.06 : 0.03,
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        className="absolute inset-0 blur-[120px] pointer-events-none"
      />

      {/* ── Header limpo — sem logo, sem badge piscante ── */}
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="space-y-0.5">
          <p className="text-[9px] font-black uppercase tracking-[0.35em] text-muted-foreground">
            Fluxo Operacional
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-tighter leading-none">
            Reator de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-600">
              Produção
            </span>
          </h2>
        </div>

        {/* Status pill — simples, não invasivo */}
        <div className="flex items-center gap-1.5 bg-white/[0.03] border border-border px-3 py-1.5 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] font-black uppercase tracking-[0.25em] text-muted-foreground">
            Online
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 relative z-10">
        {/* ── Gráfico Radial (preservado — já é Tier-1) ── */}
        <div className="relative w-[220px] h-[220px] md:w-[260px] md:h-[260px] shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90 transform overflow-visible">
            <circle cx="120" cy="120" r={radius} stroke="var(--secondary)" strokeWidth="10" fill="transparent" />

            {stageData.map((item, index) => {
              const percentage = (item.value / totalValue) * 100;
              const dashArray = `${(percentage / 100) * circumference} ${circumference}`;
              const dashOffset = -accumulatedOffset;
              accumulatedOffset += (percentage / 100) * circumference;
              const isActive = activeIndex === index;

              return (
                <motion.circle
                  key={item.id}
                  cx="120" cy="120" r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  initial={{ strokeWidth: 10, opacity: 0.7 }}
                  animate={{
                    strokeWidth: isActive ? 16 : 10,
                    opacity: activeIndex !== null ? (isActive ? 1 : 0.3) : 0.85,
                    filter: isActive ? `drop-shadow(0 0 12px ${item.color})` : 'none',
                  }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className="cursor-pointer"
                  style={{ transformOrigin: 'center' }}
                />
              );
            })}
          </svg>

          {/* Valor Central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex !== null ? activeIndex : 'total'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex flex-col items-center"
              >
                <span
                  className="text-[8px] uppercase font-black tracking-[0.35em] mb-1"
                  style={{ color: activeIndex !== null ? stageData[activeIndex]?.color : '#3f3f46' }}
                >
                  {activeIndex !== null ? stageData[activeIndex]?.label : 'Total Ativo'}
                </span>
                <span className="text-5xl md:text-6xl font-black text-foreground tracking-tighter leading-none">
                  {activeIndex !== null ? stageData[activeIndex]?.value : totalValue}
                </span>
                {activeIndex === null && (
                  <div className="mt-3 flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full border border-[#FF5F1F]/15">
                    <Zap size={8} className="text-[#FF5F1F]" fill="#FF5F1F" />
                    <span className="text-[7px] text-[#FF5F1F] font-black font-mono uppercase tracking-widest">
                      em produção
                    </span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Legenda Interativa (preservada) ── */}
        <div className="flex-1 w-full space-y-1">
          {stageData.map((item, index) => {
            const isActive = activeIndex === index;
            return (
              <motion.div
                key={item.id}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                animate={{
                  x: isActive ? 4 : 0,
                  backgroundColor: isActive ? 'rgba(255,255,255,0.02)' : 'transparent',
                }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={cn(
                  'cursor-pointer flex items-center justify-between p-3 rounded-xl border transition-colors duration-150',
                  isActive ? 'border-white/8' : 'border-transparent',
                )}
              >
                <div className="flex items-center gap-3 pl-1">
                  <div
                    className="w-2 h-2 rounded-full shrink-0 transition-all duration-200"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: isActive ? `0 0 8px ${item.color}` : 'none',
                    }}
                  />
                  <div className="flex flex-col">
                    <span className={cn(
                      'text-[10px] font-bold uppercase tracking-wider transition-colors duration-150',
                      isActive ? 'text-foreground' : 'text-muted-foreground',
                    )}>
                      {item.label}
                    </span>
                    <div className="h-[2px] w-20 bg-secondary rounded-full mt-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.value / totalValue) * 100}%` }}
                        transition={{ duration: 0.8, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                </div>
                <span className={cn(
                  'text-lg font-mono font-black transition-colors duration-150',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )}>
                  {item.value}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
