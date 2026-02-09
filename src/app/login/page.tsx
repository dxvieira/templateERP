
"use client"

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClipboardList, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    // Mock login logic for UI demonstration
    setTimeout(() => {
      if (password !== 'admin123') {
        setError(true);
        setLoading(false);
      } else {
        router.push('/');
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      {/* Background Radients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "w-full max-w-md glass-card rounded-[2rem] p-10 relative overflow-hidden",
          error && "animate-shake border-destructive/50"
        )}
      >
        <div className="flex flex-col items-center gap-6 mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(255,95,31,0.5)]">
            <ClipboardList className="text-black w-8 h-8" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase">VisComm</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.3em]">Command Center</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold ml-1">Acesso Administrativo</Label>
            <div className="relative group">
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent border-0 border-b border-white/10 rounded-none px-1 h-12 focus-visible:ring-0 focus-visible:border-primary focus-visible:shadow-[0_4px_10px_-5px_rgba(255,95,31,0.5)] transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative group">
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "bg-transparent border-0 border-b rounded-none px-1 h-12 focus-visible:ring-0 transition-all",
                  error 
                    ? "border-destructive focus-visible:border-destructive focus-visible:shadow-[0_4px_10px_-5px_rgba(255,0,0,0.5)]" 
                    : "border-white/10 focus-visible:border-primary focus-visible:shadow-[0_4px_10px_-5px_rgba(255,95,31,0.5)]"
                )}
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-[10px] font-bold text-destructive uppercase tracking-widest text-center">
              Acesso negado. Credenciais inválidas.
            </p>
          )}

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 bg-primary text-black font-black uppercase tracking-widest hover:bg-primary/90 transition-all hover:shadow-[0_0_25px_rgba(255,95,31,0.8)] rounded-xl mt-4"
          >
            {loading ? "Autenticando..." : (
              <span className="flex items-center gap-2">
                Entrar <LogIn className="w-4 h-4" />
              </span>
            )}
          </Button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            VisComm v2.5.0 • Segurança Criptografada
          </p>
        </div>
      </motion.div>
    </div>
  );
}
