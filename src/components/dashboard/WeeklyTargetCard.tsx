
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target, Rocket, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface WeeklyTargetCardProps {
  pendingCount: number;
}

export function WeeklyTargetCard({ pendingCount }: WeeklyTargetCardProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative h-full group"
    >
      {/* Glow de Fundo Cyberpunk */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
      
      <div className="relative h-full bg-[#09090b] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between overflow-hidden">
        
        {/* Efeito de Ondas Animadas */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-full h-full bg-purple-500/20 rounded-full blur-[60px]"
          />
        </div>

        <div className="space-y-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="text-cyan-400 w-5 h-5 animate-pulse" />
              <span className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.3em]">
                Objetivo Ativo
              </span>
            </div>
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Rocket className="text-purple-400 w-6 h-6" />
            </motion.div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
              Meta da <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                Semana
              </span>
            </h2>
          </div>

          <div className="pt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white tracking-tighter">
                {pendingCount}
              </span>
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                Pedidos <br /> Pendentes
              </span>
            </div>
          </div>
        </div>

        <Button
          onClick={() => router.push('/goals')}
          className="relative z-10 w-full h-14 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest rounded-2xl group/btn overflow-hidden transition-all active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-cyan-500/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
          <span className="flex items-center gap-2">
            Acessar Missão <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </span>
        </Button>

      </div>
    </motion.div>
  );
}
