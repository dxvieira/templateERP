'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, ShieldAlert, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

interface AdminGuardProps {
  children: React.ReactNode;
}

  export function AdminGuard({ children }: AdminGuardProps) {
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(true);
  
    useEffect(() => {
      async function checkAccess() {
        if (isUserLoading) return;
        
        if (!user || !firestore) {
          setIsAdmin(false);
          setChecking(false);
          return;
        }

        try {
          const userRef = doc(firestore, 'authorized_users', user.email || '');
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists() && userSnap.data().role === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Erro na verificação de privilégios:", error);
          setIsAdmin(false);
        } finally {
          setChecking(false);
        }
      }

      checkAccess();
    }, [user, isUserLoading, firestore]);
  
    if (isUserLoading || checking) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-[#0A0A0A]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      );
    }
  
    if (isAdmin) {
      return <>{children}</>;
    }
  
    return (
      <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center p-6 bg-[#020202] overflow-hidden relative">
        {/* Background amber atmosphere */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-600/8 blur-[180px] pointer-events-none" />

        {/* Neon Lock Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-8"
        >
          <motion.div
            animate={{
              boxShadow: ['0 0 20px rgba(245,158,11,0.3), 0 0 60px rgba(245,158,11,0.1)', '0 0 30px rgba(245,158,11,0.5), 0 0 80px rgba(245,158,11,0.2)', '0 0 20px rgba(245,158,11,0.3), 0 0 60px rgba(245,158,11,0.1)'],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-28 h-28 rounded-full border-2 border-amber-500/60 flex items-center justify-center bg-amber-500/5"
          >
            <Lock size={48} className="text-amber-500" strokeWidth={1.5} />
          </motion.div>
        </motion.div>

        {/* Animated Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-4xl font-black text-white uppercase tracking-tighter mb-2"
        >
          ÁREA{' '}
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-amber-500"
          >
            RESTRITA
          </motion.span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-[9px] text-amber-500/40 uppercase tracking-[0.5em] font-black mb-10"
        >
          Privilégio Insuficiente
        </motion.p>

        {/* Restriction Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-amber-500/30 to-amber-500/5">
            <div className="bg-[#0A0A0A] rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <KeyRound size={18} className="text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-black mb-3">
                    Nível de Acesso Insuficiente
                  </p>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    O usuário{' '}
                    <span className="text-white font-black bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      {user?.email}
                    </span>{' '}
                    não possui privilégios de <span className="text-white font-black">Administrador</span> para acessar esta área.
                  </p>
                  <p className="text-[10px] text-zinc-700 mt-4 leading-relaxed">
                    Solicite elevação de nível ao administrador da <span className="font-bold text-zinc-600">IMPACTO</span> para obter acesso.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-8"
        >
          <button
            onClick={() => window.history.back()}
            className="h-11 px-8 flex items-center gap-3 bg-[#111111] border border-zinc-800 hover:border-amber-500/40 text-zinc-400 hover:text-white font-black uppercase tracking-[0.15em] text-[9px] rounded-xl transition-all duration-300 active:scale-[0.97] hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]"
          >
            <ArrowRight size={14} className="rotate-180" />
            VOLTAR
          </button>
        </motion.div>
      </div>
    );
  }
