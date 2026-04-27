'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Loader2, LogOut } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';

interface AccessGuardProps {
  children: React.ReactNode;
}

/**
 * AccessGuard - O Porteiro Geral da Empresa.
 * Verifica se o e-mail logado existe na coleção authorized_users.
 * Se não existir, bloqueia o acesso totalmente.
 */
export function AccessGuard({ children }: AccessGuardProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function verifyWhitelist() {
      if (isUserLoading) return;
      
      if (!user || !firestore) {
        setHasAccess(false);
        setChecking(false);
        return;
      }

      try {
        const userRef = doc(firestore, 'authorized_users', user.email || '');
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error("Erro na verificação de whitelist:", error);
        setHasAccess(false);
      } finally {
        setChecking(false);
      }
    }

    verifyWhitelist();
  }, [user, isUserLoading, firestore]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      window.location.href = '/login';
    }
  };

  if (isUserLoading || checking) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Se não tem acesso, mostra a tela de bloqueio premium
  if (!hasAccess && user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#020202] p-6 text-center overflow-hidden relative">
        {/* Background red atmosphere */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-600/8 blur-[180px] pointer-events-none" />
        
        {/* Neon Shield Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-8"
        >
          {/* Pulsing neon ring */}
          <motion.div
            animate={{ 
              boxShadow: ['0 0 20px rgba(239,68,68,0.3), 0 0 60px rgba(239,68,68,0.1)', '0 0 30px rgba(239,68,68,0.5), 0 0 80px rgba(239,68,68,0.2)', '0 0 20px rgba(239,68,68,0.3), 0 0 60px rgba(239,68,68,0.1)'],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-28 h-28 rounded-full border-2 border-red-500/60 flex items-center justify-center bg-red-500/5"
          >
            <ShieldAlert size={52} className="text-red-500" strokeWidth={1.5} />
          </motion.div>
        </motion.div>

        {/* Animated Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-4xl font-black text-white uppercase tracking-tighter mb-2"
        >
          ACESSO{' '}
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-red-500"
          >
            NEGADO
          </motion.span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-[9px] text-red-500/40 uppercase tracking-[0.5em] font-black mb-10"
        >
          Protocolo de Segurança Ativado
        </motion.p>

        {/* Rejection Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-red-500/30 to-red-500/5">
            <div className="bg-[#0A0A0A] rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldAlert size={18} className="text-red-500" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-black mb-3">
                    Identidade Rejeitada
                  </p>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    O e-mail{' '}
                    <span className="text-white font-black bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                      {user.email}
                    </span>{' '}
                    não consta na lista de usuários permitidos pela <span className="text-white font-black">IMPACTO</span>.
                  </p>
                  <p className="text-[10px] text-zinc-700 mt-4 leading-relaxed">
                    Se você acredita que isso é um erro, entre em contato com o administrador do sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-8"
        >
          <button
            onClick={handleLogout}
            className="h-11 px-8 flex items-center gap-3 bg-[#111111] border border-zinc-800 hover:border-red-500/40 text-zinc-400 hover:text-white font-black uppercase tracking-[0.15em] text-[9px] rounded-xl transition-all duration-300 active:scale-[0.97] hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]"
          >
            <LogOut size={14} />
            TROCAR DE CONTA
          </button>
        </motion.div>
      </div>
    );
  }

  // Se não estiver logado, o redirecionamento já é tratado pela página ou pelo layout
  if (!user) return <>{children}</>;

  return <>{children}</>;
}
