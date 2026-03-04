
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

interface ProtectedGateProps {
  children: React.ReactNode;
}

/**
 * ProtectedGate - Filtro de Acesso por Senha Fixa.
 * Protege rotas sensíveis exigindo a string @impactoADM2026.
 */
export function ProtectedGate({ children }: ProtectedGateProps) {
  const { isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isPassError, setIsPassError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Senha Mestre Conforme Protocolo
  const MASTER_PASS = "@impactoADM2026";

  useEffect(() => {
    setIsMounted(true);
    const sessionAuth = sessionStorage.getItem('page_unlocked');
    if (sessionAuth === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordInput === MASTER_PASS) {
      setIsAuthorized(true);
      sessionStorage.setItem('page_unlocked', 'true');
      setIsPassError(false);
      toast({ title: "Acesso Liberado", description: "Terminal desbloqueado com sucesso." });
    } else {
      setIsPassError(true);
      toast({ 
        variant: "destructive", 
        title: "Falha na Elevação", 
        description: "Senha Administrativa Incorreta." 
      });
      setTimeout(() => setIsPassError(false), 500);
      setPasswordInput('');
    }
  };

  if (!isMounted || isUserLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="h-full flex items-center justify-center p-4 relative overflow-hidden bg-[#0A0A0A]">
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1, x: isPassError ? [0, -10, 10, -10, 10, 0] : 0 }} 
        className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          <div className={`p-5 rounded-3xl mb-6 border transition-all duration-500 shadow-2xl ${isPassError ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-primary/10 text-primary border-primary/30'}`}>
            <KeyRound size={36} className={isPassError ? 'animate-bounce' : ''} />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Área de Gestão</h2>
          <p className="text-zinc-500 text-[10px] mt-3 uppercase tracking-[0.3em] font-bold leading-relaxed max-w-[280px]">
            Insira a Senha de Acesso para gerenciar dados financeiros e pauta industrial.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative group">
            <input 
              autoFocus
              type="password" 
              placeholder="SENHA INDUSTRIAL" 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              className={`w-full bg-zinc-950 border rounded-2xl py-5 text-center text-white tracking-[0.5em] outline-none transition-all duration-300 font-black placeholder:text-zinc-900 placeholder:tracking-widest ${isPassError ? 'border-destructive/50 ring-2 ring-destructive/10' : 'border-zinc-800 focus:border-primary/50'}`} 
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-xs shadow-[0_10px_20px_-10px_rgba(255,95,31,0.5)] active:scale-95 transition-all hover:bg-white"
          >
            Desbloquear Painel <ArrowRight size={16} className="ml-2" />
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 opacity-30">
           <ShieldCheck size={12} className="text-zinc-500" />
           <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Sessão Local Protegida</span>
        </div>
      </motion.div>
    </div>
  );
}
