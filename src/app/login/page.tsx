'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useUser } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      toast({ title: 'Identidade Verificada', description: 'Bem-vindo ao Terminal de Comando Impacto.' });
      router.replace('/');
    } catch (error: any) {
      console.error("[AUTH] Erro no Google Login:", error);
      let msg = "A autenticação com o Google foi cancelada ou falhou.";
      if (error.code === 'auth/popup-closed-by-user') msg = "O login foi cancelado.";
      toast({ variant: 'destructive', title: 'Falha de Identificação', description: msg });
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-4 overflow-hidden relative">
      
      {/* Background: Blueprint Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'linear-gradient(#FF5F1F 1px, transparent 1px), linear-gradient(90deg, #FF5F1F 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
        <div 
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#FF5F1F 0.5px, transparent 0.5px), linear-gradient(90deg, #FF5F1F 0.5px, transparent 0.5px)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* Diagonal accent lines */}
        <div className="absolute top-10 right-10 w-[600px] h-[1px] bg-gradient-to-l from-primary/40 to-transparent origin-right -rotate-45" />
        <div className="absolute bottom-10 left-10 w-[600px] h-[1px] bg-gradient-to-r from-primary/40 to-transparent origin-left -rotate-45" />
        <div className="absolute top-[60%] left-0 w-[300px] h-[1px] bg-gradient-to-r from-primary/20 to-transparent" />
        <div className="absolute top-[30%] right-0 w-[300px] h-[1px] bg-gradient-to-l from-primary/20 to-transparent" />
      </div>

      {/* Central orange glow (intensified) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/15 blur-[180px] pointer-events-none" />
      <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] rounded-full bg-orange-600/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[15%] w-[250px] h-[250px] rounded-full bg-primary/6 blur-[100px] pointer-events-none" />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm z-10"
      >
        {/* Logo (static, orange glow only) */}
        <div className="flex flex-col items-center mb-12 gap-6">
          <div className="relative w-60 h-16">
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/studio-8015019704-68176.firebasestorage.app/o/logo%20IMPACTO.png?alt=media&token=c481fc0a-08b9-4613-bb67-d4052b3a39dd"
              alt="Logo IMPACTO"
              fill
              className="object-contain drop-shadow-[0_0_20px_rgba(255,95,31,0.25)]"
              priority
            />
          </div>
          <p className="text-[9px] text-primary/40 uppercase tracking-[0.5em] font-black">
            Infraestrutura Digital Industrial
          </p>
        </div>

        {/* Card with animated border */}
        <div className="relative rounded-3xl p-[2px] shadow-[0_0_40px_rgba(255,95,31,0.12)]" style={{ background: 'linear-gradient(180deg, rgba(255,95,31,0.5) 0%, rgba(255,95,31,0.1) 100%)' }}>
          {/* Rotating border glow */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-full"
              style={{
                background: 'conic-gradient(from 0deg at 50% 50%, transparent 0%, transparent 35%, #FF5F1F 50%, transparent 65%, transparent 100%)',
                opacity: 0.8,
              }}
            />
          </div>

          <Card className="relative bg-[#0A0A0A] border-none rounded-3xl overflow-hidden z-10">
            {/* Shimmer sweep */}
            <motion.div
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 7, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.06] to-transparent -skew-x-12 pointer-events-none z-10"
            />

            <CardHeader className="text-center pb-8 pt-12 relative z-20">
              <CardTitle className="text-2xl font-black text-white uppercase tracking-tight leading-tight">
                TERMINAL DE{' '}
                <motion.span
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-primary"
                >
                  COMANDO
                </motion.span>
              </CardTitle>
              <div className="w-10 h-[2px] bg-primary/60 mx-auto mt-3 mb-2" />
              <CardDescription className="text-[8px] text-zinc-600 uppercase tracking-[0.25em] font-black max-w-[220px] mx-auto leading-relaxed">
                Controle de Acesso Corporativo<br />Impacto Cloud Gestão
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pb-12 px-10 relative z-20">
              {/* Google Login Button - Dark Industrial */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-14 flex items-center justify-center gap-3 bg-[#111111] border border-zinc-800 hover:border-primary/50 text-white font-black uppercase tracking-[0.15em] text-[10px] rounded-xl transition-all duration-300 active:scale-[0.97] disabled:opacity-50 hover:shadow-[0_0_20px_rgba(255,95,31,0.15)]"
              >
                {loading ? (
                  <Loader2 className="animate-spin w-4 h-4 text-primary" />
                ) : (
                  <>
                    <div className="w-5 h-5 flex-shrink-0 bg-white rounded-md flex items-center justify-center p-[3px]">
                      <svg viewBox="0 0 24 24" className="w-full h-full">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    </div>
                    ENTRAR COM IMPACTO ID
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 opacity-25 font-black uppercase text-[7px] tracking-[0.4em] text-zinc-500">
                <ShieldCheck size={12} className="text-primary" />
                AUTH PROTOCOL v4.0
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
