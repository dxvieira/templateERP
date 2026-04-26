'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ClipboardList, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useUser } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

/**
 * LoginPage - Terminal de Autenticação com Google.
 * Agora focado em segurança de clique-único e verificação de whitelist.
 */
export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Redirecionamento automático se já estiver logado
  useEffect(() => {
    if (user && !isUserLoading) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      // Força a seleção de conta para evitar logins automáticos indesejados
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
      
      toast({ 
        title: 'Identidade Verificada', 
        description: 'Bem-vindo ao Terminal de Comando Impacto.' 
      });
      
      router.replace('/');
    } catch (error: any) {
      console.error("[AUTH] Erro no Google Login:", error);
      
      let msg = "A autenticação com o Google foi cancelada ou falhou.";
      if (error.code === 'auth/popup-closed-by-user') msg = "O login foi cancelado.";
      
      toast({
        variant: 'destructive',
        title: 'Falha de Identificação',
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm z-10"
      >
        <div className="flex flex-col items-center mb-10 gap-4">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(255,95,31,0.4)]">
            <ClipboardList className="text-black w-10 h-10" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">IMPACTO</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] font-black mt-2">Segurança de Acesso</p>
          </div>
        </div>

        <Card className="bg-[#0c0c0e] border-zinc-800 shadow-2xl rounded-[3rem] overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          
          <CardHeader className="text-center pb-8 pt-12">
            <CardTitle className="text-2xl font-black text-white uppercase tracking-tight">
              Acesso Restrito
            </CardTitle>
            <CardDescription className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-black max-w-[200px] mx-auto leading-relaxed">
              Use sua conta corporativa vinculada ao sistema.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pb-14 px-10">
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-16 bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-[0.1em] rounded-2xl gap-4 transition-all active:scale-95 shadow-xl disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Login com Google
                </>
              )}
            </Button>

            <div className="flex flex-col gap-4 text-center">
              <div className="flex items-center justify-center gap-2 opacity-30 mt-6 font-black uppercase text-[8px] tracking-[0.3em] text-zinc-500">
                <ShieldCheck size={12} className="text-primary" />
                Impacto Security v2.0
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
