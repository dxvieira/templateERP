'use client';

import React, { useState, useEffect } from 'react';
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

  // Se não tem acesso, mostra a tela de bloqueio com opção de sair
  if (!hasAccess && user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505] p-6 text-center">
        <ShieldAlert size={64} className="text-red-500 mb-6 animate-pulse" />
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Acesso Não Autorizado</h1>
        <p className="text-zinc-500 text-xs mt-4 max-w-md uppercase tracking-widest leading-relaxed">
          O e-mail <span className="text-white">{user.email}</span> não consta na lista de usuários permitidos do Projeto Impacto.
        </p>
        <div className="mt-8">
          <Button 
            onClick={handleLogout}
            variant="outline" 
            className="border-zinc-800 text-zinc-400 hover:text-white"
          >
            <LogOut size={16} className="mr-2" /> Trocar de Conta
          </Button>
        </div>
      </div>
    );
  }

  // Se não estiver logado, o redirecionamento já é tratado pela página ou pelo layout
  if (!user) return <>{children}</>;

  return <>{children}</>;
}
