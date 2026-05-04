
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
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Target, label: 'Meta da Semana', path: '/goals' },
  { icon: Package, label: 'Suprimentos', path: '/materials' },
  { icon: BarChart3, label: 'RELATÓRIOS', path: '/reports' },
  { icon: FileText, label: 'Central Fiscal', path: '/fiscal' },
  { icon: ClipboardList, label: 'Gestão de Pedidos', path: '/orders' },
  { icon: Users, label: 'Meus Clientes', path: '/clients' },
  { icon: Truck, label: 'Fornecedores', path: '/suppliers' },
];

export const DashboardSidebar = memo(() => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();

  const handleLogout = () => {
    if (auth) {
      // Limpeza de sessão industrial
      sessionStorage.removeItem('is_admin_unlocked');
      initiateSignOut(auth);
      router.push('/login');
    }
  };

  if (pathname === '/login') return null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[110] h-14 md:hidden bg-background/80 backdrop-blur-md border-b border-border px-4 flex items-center justify-between print:hidden">
        <div className="relative w-32 h-8 flex items-center justify-center border border-border bg-secondary rounded-lg">
          <span className="text-muted-foreground text-[10px] font-black tracking-widest">LOGO</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(!isMobileOpen)}>
          {isMobileOpen ? <X className="text-primary w-5 h-5" /> : <Menu className="text-primary w-5 h-5" />}
        </Button>
      </header>

      {isMobileOpen && (
        <div className="fixed inset-0 z-[140] bg-background/60 backdrop-blur-sm md:hidden transition-all duration-300" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-[150] w-64 transition-all duration-300 ease-in-out print:hidden",
        "bg-card border-r border-border shadow-2xl overflow-x-hidden",
        isMobileOpen ? "translate-x-0" : "max-md:-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-4 overflow-x-hidden">
          <div className="mb-10 px-2 flex flex-col items-center">
            <div className="relative w-44 h-12 mb-4 flex items-center justify-center border border-border bg-secondary rounded-xl">
              <span className="text-muted-foreground text-xs font-black tracking-[0.2em]">LOGO CLIENTE</span>
            </div>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 h-12 rounded-xl transition-all duration-200 group relative",
                  pathname === item.path 
                    ? "bg-primary text-primary-foreground font-black shadow-[0_0_20px_rgba(255,95,31,0.3)]" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon size={20} className={cn(pathname === item.path ? "text-primary-foreground" : "group-hover:text-primary")} />
                <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-border space-y-2">
            <ThemeToggle />
            <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 h-12 rounded-xl text-destructive hover:bg-destructive/10 transition-all duration-200 group">
              <LogOut size={20} />
              <span className="text-xs font-black uppercase tracking-widest">Encerrar Sessão</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="hidden md:block w-64 shrink-0" />
    </>
  );
});

DashboardSidebar.displayName = 'DashboardSidebar';
