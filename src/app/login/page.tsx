'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ClipboardList, LogIn, Mail, Lock, UserPlus, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

/**
 * LoginPage - Terminal de Autenticação Industrial.
 * Refatorado para garantir execução imediata e feedback de loading.
 */
export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirecionamento automático se já estiver logado
  useEffect(() => {
    if (user && !isUserLoading) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    console.log(`[AUTH] Iniciando tentativa de ${mode} para:`, email);
    setLoading(true);

    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: 'Terminal Configurado', description: 'Identidade industrial criada com sucesso.' });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      
      console.log('[AUTH] Sucesso. Redirecionando...');
      router.replace('/');
    } catch (error: any) {
      console.error("[AUTH] Erro de Autenticação:", error);
      let msg = "Falha na conexão com o servidor de identidade.";
      
      if (error.code === 'auth/email-already-in-use') msg = "Este e-mail já possui um acesso registrado.";
      if (error.code === 'auth/wrong-password') msg = "Senha incorreta para este e-mail.";
      if (error.code === 'auth/user-not-found') msg = "Identidade não localizada no sistema.";
      if (error.code === 'auth/invalid-credential') msg = "E-mail ou senha inválidos.";
      
      toast({
        variant: 'destructive',
        title: 'Falha de Identificação',
        description: msg,
      });
      setLoading(false); // Volta o botão ao estado normal apenas em caso de erro
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin shadow-[0_0_20px_rgba(255,95,31,0.5)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 overflow-hidden relative">
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
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">IMPACTO</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] font-bold mt-2">Terminal de Identidade</p>
          </div>
        </div>

        <Card className="bg-[#0c0c0e] border-zinc-800 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="text-center pb-8 pt-10">
            <CardTitle className="text-xl font-bold text-white uppercase tracking-tight">
              {mode === 'login' ? 'Identificação' : 'Novo Registro'}
            </CardTitle>
            <CardDescription className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold">
              {mode === 'login' ? 'Insira suas credenciais' : 'Defina seus dados de acesso'}
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
                    className="w-full h-14 bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 text-white text-sm outline-none focus:border-primary/50 transition-all placeholder:text-zinc-800"
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
                    className="w-full h-14 bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 text-white text-sm outline-none focus:border-primary/50 transition-all placeholder:text-zinc-800"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-primary text-black hover:bg-white font-black uppercase tracking-widest rounded-2xl gap-3 transition-all active:scale-95 shadow-[0_5px_20px_-5px_rgba(255,95,31,0.4)] disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                  <>
                    {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    {mode === 'login' ? 'Entrar no Sistema' : 'Criar Conta'}
                  </>
                )}
              </Button>
            </form>

            <div className="flex flex-col gap-4 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-[10px] text-zinc-600 hover:text-primary uppercase font-black tracking-widest transition-colors"
              >
                {mode === 'login' ? 'Não tem acesso? Registrar-se' : 'Já possui conta? Fazer Login'}
              </button>

              <div className="flex items-center justify-center gap-2 opacity-40 mt-4">
                <ShieldCheck size={12} className="text-primary" />
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest">Acesso Industrial Protegido</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
