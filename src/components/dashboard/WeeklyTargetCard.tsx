'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WeeklyTargetCardProps {
  pendingCount: number;
}

/**
 * WeeklyTargetCard — Tier-1 Redesign.
 *
 * Mudanças:
 * - Botão CTA redesenhado com identidade visual premium
 * - Número principal com animação de entrada suave
 * - Glow de fundo mais sutil e refinado
 * - Tipografia hierárquica reforçada
 */
export function WeeklyTargetCard({ pendingCount }: WeeklyTargetCardProps) {
  const router = useRouter();

  return (
    <div className="h-full flex flex-col justify-between">
      {/* Glow de fundo sutil */}
      <div className="absolute top-[-15%] right-[-15%] w-[70%] h-[70%] bg-primary/[0.04] blur-[80px] rounded-full pointer-events-none" />

      {/* ── Header ── */}
      <div className="relative z-10">
        <p className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-600 mb-2">
          Objetivo Ativo
        </p>
        <h2 className="text-3xl font-black text-white uppercase leading-[0.9] tracking-tight">
          Meta da{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
            Semana
          </span>
        </h2>
      </div>

      {/* ── Número principal com entrada suave ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-row items-baseline gap-3 my-auto relative z-10"
      >
        <span className="text-7xl font-black text-white tracking-tighter leading-none">
          {pendingCount}
        </span>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider leading-none">
            Pedidos
          </span>
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-wider leading-none mt-0.5">
            Pendentes
          </span>
        </div>
      </motion.div>

      {/* ── CTA Button Premium ── */}
      <button
        onClick={() => router.push('/goals')}
        className="
          group w-full mt-4 py-3.5 rounded-xl border border-white/8
          bg-white/[0.02] hover:bg-primary/10 hover:border-primary/30
          text-zinc-500 hover:text-primary
          font-black text-[10px] uppercase tracking-[0.2em]
          transition-all duration-300 ease-out
          relative z-10 flex items-center justify-center gap-2
          overflow-hidden
        "
      >
        {/* Shimmer no hover */}
        <span
          className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
        />
        <span className="relative">Acessar Missão</span>
        <ArrowUpRight
          size={14}
          className="relative group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200"
        />
      </button>
    </div>
  );
}
