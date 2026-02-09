
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ClipboardList, LogIn, Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useUser, initiateGoogleSignIn } from '@/firebase';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // Redirect if already logged in (and not anonymous)
  useEffect(() => {
    if (user && !user.isAnonymous) {
      router.replace('/');
    }
  }, [user, router]);

  const handleGoogleLogin = () => {
    if (auth) {
      initiateGoogleSignIn(auth);
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(255,95,31,0.5)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="flex flex-col items-center mb-10 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(255,95,31,0.6)]">
            <ClipboardList className="text-black w-10 h-10" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase">VISCOMM</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.4em] font-medium">Terminal de Comando v1.2</p>
          </div>
        </div>

        <Card className="glass-card border-white/5 bg-black/40 overflow-hidden shadow-2xl rounded-3xl">
          <CardHeader className="text-center space-y-2 pb-8 pt-10">
            <CardTitle className="text-xl font-bold text-white uppercase tracking-tight">Acesso Restrito</CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
              Autenticação segura via console VisComm
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-12 px-8">
            <div className="space-y-4">
              <Button
                onClick={handleGoogleLogin}
                className="w-full h-14 bg-white text-black hover:bg-white/90 font-black uppercase tracking-widest rounded-2xl gap-3 transition-all active:scale-95 flex items-center justify-center"
              >
                <Chrome className="w-5 h-5" />
                Acessar com Google
              </Button>
              
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-[8px] uppercase tracking-widest">
                  <span className="bg-[#0A0A0A] px-4 text-muted-foreground">Sistema de Segurança Ativo</span>
                </div>
              </div>

              <p className="text-[9px] text-center text-muted-foreground uppercase tracking-widest leading-relaxed opacity-60">
                Ao acessar, você concorda com os protocolos de segurança e monitoramento do terminal VisComm.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 flex flex-col items-center gap-1 opacity-20">
          <p className="text-[8px] uppercase tracking-[0.5em] text-white font-black whitespace-nowrap">CLOUD SYNC ENCRYPTED</p>
          <p className="text-[7px] uppercase tracking-[0.1em] text-muted-foreground font-mono">Build 2025.02.09 • Secure Auth Active</p>
        </div>
      </motion.div>
    </div>
  );
}
