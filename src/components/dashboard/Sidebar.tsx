"use client"

import React, { useState, memo, useCallback } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Settings, 
  Bell, 
  Target, 
  Truck,
  Menu,
  X,
  Users,
  LogOut,
  BarChart3,
  FileText,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, initiateSignOut } from '@/firebase';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Target, label: 'Meta da Semana', path: '/goals' },
  { icon: BarChart3, label: 'Relatórios Flux', path: '/reports' },
  { icon: Package, label: 'Suprimentos', path: '/materials' },
  { icon: FileText, label: 'Central Fiscal', path: '/fiscal' },
  { icon: ClipboardList, label: 'Gestão de Pedidos', path: '/orders' },
  { icon: Users, label: 'Meus Clientes', path: '/clients' },
  { icon: Truck, label: 'Fornecedores', path: '/suppliers' },
  { icon: Bell, label: 'Notificações', path: '#' },
  { icon: Settings, label: 'Configurações', path: '#' },
];

export const DashboardSidebar = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();

  const handleNavigation = useCallback((path: string) => {
    if (path !== '#') router.push(path);
    setIsOpen(false);
  }, [router]);

  const handleLogout = () => {
    if (auth) {
      initiateSignOut(auth);
      router.push('/login');
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-14 md:hidden bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5 px-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_10px_rgba(255,95,31,0.5)]">
            <ClipboardList className="text-black w-4 h-4" />
          </div>
          <span 
            className="text-xl text-white tracking-tighter leading-none" 
            style={{ fontFamily: 'Impact, Arial Black, sans-serif', transform: 'scaleY(1.05)' }}
          >
            IMPACTO
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-white/10"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="text-primary w-5 h-5" /> : <Menu className="text-primary w-5 h-5" />}
        </Button>
      </header>

      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 glass border-r border-white/5 transition-transform duration-300 ease-in-out md:translate-x-0 will-change-transform shadow-2xl print:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-5">
          <div className="mb-8 hidden md:flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(255,95,31,0.5)] shrink-0">
              <ClipboardList className="text-black w-6 h-6" />
            </div>
            <div className="flex flex-col min-w-0">
              <span 
                className="text-2xl text-white tracking-tighter leading-none" 
                style={{ fontFamily: 'Impact, Arial Black, sans-serif', transform: 'scaleY(1.05)' }}
              >
                IMPACTO
              </span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mt-0.5 whitespace-nowrap">
                Comunicação Visual
              </span>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 h-10 rounded-lg transition-all duration-200 group relative overflow-hidden",
                  pathname === item.path 
                    ? "bg-primary text-black font-black" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn(
                  "w-4 h-4",
                  pathname === item.path ? "text-black" : "group-hover:text-primary transition-colors"
                )} />
                <span className="text-xs tracking-tight font-medium whitespace-nowrap">{item.label}</span>
                {pathname === item.path && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                )}
              </button>
            ))}
          </nav>

          <Separator className="my-4 bg-white/5" />
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 h-10 rounded-lg text-destructive hover:bg-destructive/10 transition-all duration-200 group active:scale-95"
          >
            <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-xs tracking-tight font-black uppercase">Sair</span>
          </button>

          <div className="pt-4 flex flex-col items-center gap-1 opacity-30">
            <p className="text-[7px] uppercase tracking-[0.4em] text-white font-black whitespace-nowrap">SISTEMA IMPACTO</p>
            <p className="text-[6px] uppercase tracking-[0.1em] text-muted-foreground font-mono">Build 2025.02.09</p>
          </div>
        </div>
      </div>
    </>
  );
});

DashboardSidebar.displayName = 'DashboardSidebar';
