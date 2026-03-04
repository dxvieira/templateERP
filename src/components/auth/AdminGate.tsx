
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, ShieldCheck, X, AlertTriangle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';

interface AdminGateProps {
  children: React.ReactNode;
}

/**
 * AdminGate - Portão de Elevação de Privilégios Administrativos.
 * Exige a senha mestre para áreas financeiras e de parceiros.
 */
export function AdminGate({ children }: AdminGateProps) {
  const { user, isUserLoading } = useUser();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isPassError, setIsPassError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const MASTER_PASS = process.env.NEXT_PUBLIC_MASTER_PASSWORD || '@impactoADM.2026@';

  useEffect(() => {
    setIsMounted(true);
    const sessionAuth = sessionStorage.getItem('is_admin_unlocked');
    if (sessionAuth === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordInput === MASTER_PASS) {
      setIsAuthorized(true);
      sessionStorage.setItem('is_admin_unlocked', 'true');
      setIsPassError(false);
    } else {
      setAttempts(prev => prev + 1);
      setIsPassError(true);
      setTimeout(() => setIsPassError(false), 500);
      setPasswordInput('');
    }
  };

  if (!isMounted || isUserLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0A0A0A]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(255,95,31,0.3)]" />
      </div>
    );
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  const isLockedOut = attempts >= 3;

  return (
    <div className="h-full flex items-center justify-center p-4 relative overflow-hidden bg-[#0A0A0A]">
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1, x: isPassError ? [0, -10, 10, -10, 10, 0] : 0 }} 
        className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className={`p-4 rounded-3xl mb-6 border transition-all duration-500 shadow-2xl ${isPassError ? 'bg-destructive/10 text-destructive border-destructive/30 shadow-destructive/20' : 'bg-primary/10 text-primary border-primary/30 shadow-primary/20'}`}>
            {isLockedOut ? <AlertTriangle size={32} /> : <KeyRound size={32} />}
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Acesso Administrativo</h2>
          <p className="text-zinc-500 text-[9px] mt-2 uppercase tracking-[0.3em] font-bold leading-relaxed max-w-[280px]">
            {isLockedOut 
              ? "PROTOCOLO DE SEGURANÇA: Limite de tentativas excedido nesta sessão." 
              : "Elevação de privilégios requerida para gerenciar dados sensíveis."}
          </p>
        </div>

        {!isLockedOut ? (
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative group">
              <input 
                autoFocus
                type="password" 
                placeholder="SENHA MESTRE" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                className={`w-full bg-zinc-950 border rounded-2xl py-5 text-center text-white tracking-[0.5em] outline-none transition-all duration-300 font-black placeholder:text-zinc-800 placeholder:tracking-widest ${isPassError ? 'border-destructive/50 ring-2 ring-destructive/10' : 'border-zinc-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/10'}`} 
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                {isPassError ? <X size={20} className="text-destructive" /> : <ShieldCheck size={20} className="text-zinc-800" />}
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-[10px] shadow-[0_10px_20px_-10px_rgba(255,95,31,0.5)] active:scale-95 transition-all hover:bg-white"
            >
              Desbloquear Painel <ArrowRight size={16} className="ml-2" />
            </Button>
          </form>
        ) : (
          <div className="text-center py-6 bg-destructive/5 border border-destructive/20 rounded-2xl">
            <p className="text-destructive text-[10px] font-black uppercase tracking-widest">Sessão Suspensa temporariamente.</p>
            <p className="text-zinc-600 text-[8px] uppercase mt-1">Reinicie o navegador para nova tentativa.</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 opacity-30">
           <ShieldCheck size={12} className="text-zinc-500" />
           <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Security Gate Active</span>
        </div>
      </motion.div>
    </div>
  );
}
