'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';

/**
 * @fileOverview ReportsManager - Área de Inteligência e Financeiro
 * Arquivo verificado e limpo de qualquer código legado ou importação não utilizada.
 * Pronto para reconstrução do zero.
 */
export default function ReportsManagerPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black">
      {/* Barra Lateral do Sistema */}
      <DashboardSidebar />

      <main className="flex-1 md:ml-64 p-6 md:p-10 mt-16 md:mt-0 flex flex-col items-center justify-center relative">
        {/* Background Glow sutil para manter a identidade visual */}
        <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary opacity-[0.03] blur-[150px] pointer-events-none rounded-full" />

        <div className="max-w-2xl w-full space-y-8 text-center relative z-10">
          <header className="space-y-4">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-3xl bg-primary/10 border border-primary/20">
                <BarChart3 size={48} className="text-primary" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
              Relatórios e <span className="text-primary">Financeiro</span>
            </h1>
            
            <p className="text-zinc-500 text-xs md:text-sm uppercase tracking-[0.3em] font-bold">
              VisComm Command Center • Terminal v2.0
            </p>
          </header>

          <div className="p-12 border border-zinc-800/50 bg-[#09090b] rounded-[2.5rem] flex flex-col items-center justify-center gap-4 shadow-2xl">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <p className="text-zinc-400 font-medium uppercase tracking-widest text-[10px]">
              Área de relatórios pronta para ser reconstruída.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
