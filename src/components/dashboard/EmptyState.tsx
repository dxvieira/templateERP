
"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function EmptyState() {
  const router = useRouter();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <div className="relative mb-8">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-0 bg-primary/20 rounded-full blur-3xl"
        />
        <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center relative">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground" />
        </div>
      </div>

      <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Sistema Pronto</h3>
      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] max-w-[280px] leading-relaxed mb-10">
        Aguardando a primeira Ordem de Serviço para iniciar monitoramento.
      </p>

      <Button
        onClick={() => router.push('/orders/new')}
        variant="outline"
        className="border-primary/50 text-primary hover:bg-primary hover:text-black rounded-full px-8 h-12 uppercase font-black text-[10px] tracking-widest gap-2"
      >
        Lançar Primeira OS <ArrowUpRight className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}
