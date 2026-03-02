'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';

/**
 * loading.tsx - Carregamento Global Premium
 * Exibido automaticamente pelo Next.js durante transições de rota.
 */
export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[300] bg-[#0A0A0A] flex flex-col items-center justify-center">
      {/* Background Glow */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute w-96 h-96 bg-primary rounded-full blur-[120px] pointer-events-none"
      />

      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-20 h-20 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center relative z-10 shadow-[0_0_40px_rgba(255,95,31,0.15)]"
        >
          <ClipboardList className="text-primary w-10 h-10" />
          
          {/* Spinner Ring */}
          <div className="absolute inset-[-4px] border-2 border-primary/20 rounded-[2rem]" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-4px] border-2 border-transparent border-t-primary rounded-[2rem]"
          />
        </motion.div>
        
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="h-[2px] w-40 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="h-full w-full bg-gradient-to-r from-transparent via-primary to-transparent"
            />
          </div>
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.6em] animate-pulse ml-2">
            Terminal Impacto
          </span>
        </div>
      </div>
    </div>
  );
}
