
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, LogIn, Mail, Lock, UserPlus, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useUser, initiateEmailSignIn, initiateEmailSignUp, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

/**
 * LoginPage - Terminal de Acesso IMPACTO.
 * Implementa validação obrigatória via Whitelist no Firestore.
 */
export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redireciona se já estiver logado
  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;

    setLoading(true);

    try {
      // 1. PROTOCOLO DE WHITELIST (Obrigatório para Login e Cadastro)
      const emailKey = email.toLowerCase().trim();
      const whitelistRef = doc(db, 'authorized_emails', emailKey);
      const whitelistSnap = await getDoc(whitelistRef);

      if (!whitelistSnap.exists()) {
        toast({
          variant: 'destructive',
          title: 'Acesso Negado',
          description: 'Este e-mail não está autorizado no ecossistema IMPACTO.',
        });
        setLoading(false);
        return;
      }

      // 2. EXECUÇÃO DA AUTENTICAÇÃO
      if (mode === 'signup') {
        initiateEmailSignUp(auth, email, password);
        toast({ title: 'Registro Efetuado', description: 'Bem-vindo ao terminal de comando.' });
      } else {
        initiateEmailSignIn(auth, email, password);
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      toast({
        variant: 'destructive',
        title: 'Falha de Segurança',
        description: 'Credenciais inválidas ou erro de conexão.',
      });
    } finally {
      // Pequeno atraso para o Firebase propagar o estado
      setTimeout(() => setLoading(false), 1500);
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
          <div className="text-center flex flex-col items-center">
            <h1 
              className="text-5xl text-white tracking-tighter leading-none" 
              style={{ fontFamily: 'Impact, Arial Black, sans-serif', transform: 'scaleY(1.05)' }}
            >
              IMPACTO
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-bold mt-2">
              Comunicação Visual
            </p>
          </div>
        </div>

        <Card className="glass-card border-white/5 bg-black/40 overflow-hidden shadow-2xl rounded-3xl">
          <CardHeader className="text-center space-y-2 pb-8 pt-10">
            <CardTitle className="text-xl font-bold text-white uppercase tracking-tight">
              {mode === 'login' ? 'Identificação' : 'Novo Registro'}
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
              {mode === 'login' 
                ? 'Insira suas credenciais corporativas' 
                : 'O cadastro requer autorização prévia na whitelist'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-12 px-8">
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    required
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-12 pr-4 text-white text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    required
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-12 pr-4 text-white text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <Button
                disabled={loading}
                className="w-full h-14 bg-primary text-black hover:bg-white font-black uppercase tracking-widest rounded-2xl gap-3 transition-all active:scale-95 shadow-[0_5px_20px_-5px_rgba(255,95,31,0.4)]"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                  <>
                    {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    {mode === 'login' ? 'Entrar no Sistema' : 'Solicitar Acesso'}
                  </>
                )}
              </Button>
            </form>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-[10px] text-zinc-500 hover:text-primary uppercase font-black tracking-widest transition-colors"
              >
                {mode === 'login' ? 'Não tem conta? Registre-se' : 'Já possui acesso? Faça Login'}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-[8px] uppercase tracking-widest">
                  <span className="bg-[#0A0A0A] px-4 text-muted-foreground">Whitelist Enforced</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 opacity-40">
                <ShieldCheck size={12} className="text-primary" />
                <p className="text-[8px] text-muted-foreground uppercase tracking-widest leading-relaxed">
                  Terminal de uso restrito a colaboradores.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
