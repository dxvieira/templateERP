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
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-[#050505]">
        <div className="flex flex-col items-center text-center">
          <ShieldAlert size={60} className="text-red-500 mb-6" />
          <h2 className="text-2xl font-black text-white uppercase">Acesso Bloqueado</h2>
          <p className="text-zinc-500 text-xs mt-4">Somente administradores autorizados pela Impacto podem acessar esta área.</p>
        </div>
      </div>
    );
  }
