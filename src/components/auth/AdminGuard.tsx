'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, ShieldAlert, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * AdminGuard - Gate de Segurança Administrativa.
 * Protege rotas sensíveis exigindo a senha @impactoADM.2026@.
 * Persistência via sessionStorage (válida apenas para a aba atual).
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const { toast } = useToast();
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [isPassError, setIsPassError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Senha Mestre Conforme Protocolo
  const MASTER_PASS = "@impactoADM.2026@";

  useEffect(() => {
    setIsMounted(true);
    const sessionAuth = sessionStorage.getItem('admin_authenticated');
    setIsAuthenticated(sessionAuth === 'true');
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordInput === MASTER_PASS) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      setIsPassError(false);
      toast({ title: "Privilégios Elevados", description: "Acesso administrativo concedido com sucesso." });
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

  // Evita erros de hidratação e flashes de conteúdo
  if (!isMounted || isAuthenticated === null) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Se estiver autenticado, renderiza o conteúdo da página
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Caso contrário, exibe o Gate de Acesso
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-[#050505]">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-red-600/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1, x: isPassError ? [0, -10, 10, -10, 10, 0] : 0 }} 
        className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50" />
        
        <div className="flex flex-col items-center mb-10 text-center">
          <div className={`p-6 rounded-3xl mb-6 border transition-all duration-500 shadow-2xl ${isPassError ? 'bg-destructive/20 text-destructive border-destructive/40 shadow-destructive/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
            <Lock size={40} className={isPassError ? 'animate-bounce' : ''} />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Acesso Administrativo</h2>
          <p className="text-zinc-500 text-[10px] mt-3 uppercase tracking-[0.3em] font-bold leading-relaxed max-w-[280px]">
            Área Restrita. Insira as credenciais de comando para desbloquear o painel.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative group">
            <input 
              autoFocus
              type="password" 
              placeholder="SENHA ADMINISTRATIVA" 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              className={`w-full bg-zinc-950 border rounded-2xl py-5 text-center text-white tracking-[0.5em] outline-none transition-all duration-300 font-black placeholder:text-zinc-900 placeholder:tracking-widest ${isPassError ? 'border-destructive/50 ring-4 ring-destructive/10' : 'border-zinc-800 focus:border-primary/50'}`} 
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-[0.2em] text-xs shadow-[0_10px_30px_-10px_rgba(255,95,31,0.5)] active:scale-95 transition-all hover:bg-white hover:shadow-primary/40"
          >
            Desbloquear Painel <ArrowRight size={16} className="ml-2" />
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-3 opacity-20 hover:opacity-40 transition-opacity">
           <ShieldAlert size={14} className="text-red-500" />
           <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Protocolo de Segurança IMPACTO ativo</span>
        </div>
      </motion.div>
    </div>
  );
}
