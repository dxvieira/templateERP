
"use client"

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClipboardList, LogIn, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { user, loading: authLoading } = useUser();

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err) {
      setError(true);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(false);
    const provider = new GoogleAuthProvider();
    
    try {
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (err) {
      console.error("Erro Google Login:", err);
      setGoogleLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Deep Background Depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "w-full max-w-md glass-card rounded-[2.5rem] p-10 relative overflow-hidden border-white/5",
          "hover:border-primary/20 hover:shadow-[0_0_40px_rgba(255,95,31,0.15)] transition-all duration-500",
          error && "animate-shake border-destructive/50"
        )}
      >
        <div className="flex flex-col items-center gap-4 mb-8">
          <motion.div 
            initial={{ rotate: -20, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(255,95,31,0.5)]"
          >
            <ClipboardList className="text-black w-8 h-8" />
          </motion.div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase mb-1">VisComm</h1>
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.5em] font-medium">Terminal de Acesso</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <Label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-black ml-1">Protocolo ID</Label>
            <Input
              type="email"
              placeholder="nome@viscomm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black/40 border-0 border-b-2 border-white/10 rounded-none px-4 h-12 focus-visible:ring-0 focus-visible:border-primary focus-visible:bg-black/60 transition-all text-sm tracking-wide"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-black ml-1">Chave de Segurança</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                "bg-black/40 border-0 border-b-2 rounded-none px-4 h-12 focus-visible:ring-0 transition-all text-sm",
                error 
                  ? "border-destructive focus-visible:border-destructive" 
                  : "border-white/10 focus-visible:border-primary focus-visible:bg-black/60"
              )}
              required
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[10px] font-bold text-destructive uppercase tracking-widest text-center"
              >
                Acesso negado. Credenciais inválidas.
              </motion.p>
            )}
          </AnimatePresence>

          <Button 
            type="submit" 
            disabled={loading || googleLoading}
            className="w-full h-12 bg-primary text-black font-black uppercase tracking-widest hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(255,95,31,0.6)] rounded-xl relative overflow-hidden group"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                Acessar <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </Button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-[8px] uppercase tracking-[0.3em]">
            <span className="bg-[#0A0A0A] px-4 text-muted-foreground font-bold">Ou autenticação externa</span>
          </div>
        </div>

        <Button 
          type="button"
          variant="outline"
          disabled={loading || googleLoading}
          onClick={handleGoogleLogin}
          className="w-full h-12 border-white/10 hover:border-primary/50 hover:bg-primary/5 text-white font-bold uppercase tracking-widest transition-all rounded-xl gap-3"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Login via Google
            </>
          )}
        </Button>

        <div className="mt-10 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-[8px] text-muted-foreground uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3 text-primary/50" />
            Conexão Criptografada
          </div>
        </div>
      </motion.div>
    </div>
  );
}
