
"use client"

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClipboardList, LogIn, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
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
          "w-full max-w-md glass-card rounded-[2.5rem] p-12 relative overflow-hidden border-white/5",
          "hover:border-primary/20 hover:shadow-[0_0_40px_rgba(255,95,31,0.15)] transition-all duration-500",
          error && "animate-shake border-destructive/50"
        )}
      >
        <div className="flex flex-col items-center gap-6 mb-12">
          <motion.div 
            initial={{ rotate: -20, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(255,95,31,0.5)]"
          >
            <ClipboardList className="text-black w-10 h-10" />
          </motion.div>
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase mb-1">VisComm</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.5em] font-medium">Terminal de Acesso</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-2">
            <Label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-black ml-1">Protocolo ID</Label>
            <div className="relative group">
              <Input
                type="email"
                placeholder="nome@viscomm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black/40 border-0 border-b-2 border-white/10 rounded-none px-4 h-14 focus-visible:ring-0 focus-visible:border-primary focus-visible:bg-black/60 transition-all text-sm tracking-wide"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-black ml-1">Chave de Segurança</Label>
            <div className="relative group">
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "bg-black/40 border-0 border-b-2 rounded-none px-4 h-14 focus-visible:ring-0 transition-all text-sm",
                  error 
                    ? "border-destructive focus-visible:border-destructive" 
                    : "border-white/10 focus-visible:border-primary focus-visible:bg-black/60"
                )}
                required
              />
            </div>
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
            disabled={loading}
            className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest hover:bg-primary/90 transition-all hover:shadow-[0_0_30px_rgba(255,95,31,0.8)] rounded-2xl mt-6 relative overflow-hidden group"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <span className="flex items-center gap-3">
                Acessar Sistema <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </Button>
        </form>

        <div className="mt-12 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3 text-primary/50" />
            Conexão Criptografada
          </div>
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
            VisComm v3.0.0
          </p>
        </div>
      </motion.div>
    </div>
  );
}
