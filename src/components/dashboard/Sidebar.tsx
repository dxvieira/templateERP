"use client"

import React, { useState, memo, useEffect, useCallback } from 'react';
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
  Package,
  Pin,
  PinOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, initiateSignOut, useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Link from 'next/link';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Target, label: 'Meta da Semana', path: '/goals' },
  { icon: BarChart3, label: 'Relatórios Flux', path: '/reports' },
  { icon: Package, label: 'Suprimentos', path: '/materials' },
  { icon: FileText, label: 'Central Fiscal', path: '/fiscal' },
  { icon: ClipboardList, label: 'Gestão de Pedidos', path: '/orders' },
  { icon: Users, label: 'Meus Clientes', path: '/clients' },
  { icon: Truck, label: 'Fornecedores', path: '/suppliers' },
];

const secondaryItems = [
  { icon: Bell, label: 'Notificações', path: '#' },
  { icon: Settings, label: 'Configurações', path: '#' },
];

export const DashboardSidebar = memo(() => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    async function loadPreferences() {
      if (!user || !firestore) return;
      try {
        const prefRef = doc(firestore, 'user_settings', user.uid);
        const prefSnap = await getDoc(prefRef);
        if (prefSnap.exists()) {
          setIsPinned(prefSnap.data().sidebarPinned || false);
        }
      } catch (e) {}
    }
    loadPreferences();
  }, [user, firestore]);

  const togglePin = async () => {
    const newState = !isPinned;
    setIsPinned(newState);
    if (!user || !firestore) return;
    try {
      const prefRef = doc(firestore, 'user_settings', user.uid);
      await setDoc(prefRef, { sidebarPinned: newState }, { merge: true });
    } catch (e) {
      console.error("Falha ao salvar preferência de Pin:", e);
    }
  };

  const handleLogout = () => {
    if (auth) {
      initiateSignOut(auth);
      router.push('/login');
    }
  };

  const handleMouseEnter = useCallback((path: string) => {
    if (path !== '#') {
      router.prefetch(path);
    }
  }, [router]);

  const isExpanded = isPinned || isHovered;

  if (pathname === '/login') return null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[110] h-14 md:hidden bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5 px-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_10px_rgba(255,95,31,0.5)]">
            <ClipboardList className="text-black w-4 h-4" />
          </div>
          <span className="text-xl text-white tracking-tighter leading-none font-black">IMPACTO</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(!isMobileOpen)}>
          {isMobileOpen ? <X className="text-primary w-5 h-5" /> : <Menu className="text-primary w-5 h-5" />}
        </Button>
      </header>

      {isMobileOpen && (
        <div className="fixed inset-0 z-[105] bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside
        onMouseEnter={() => !isPinned && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-[100] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] print:hidden",
          "bg-[#0A0A0A] border-r border-white/5 shadow-2xl overflow-x-hidden",
          isExpanded ? "w-64" : "w-20",
          isMobileOpen ? "translate-x-0 w-64" : "max-md:-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full p-4 overflow-x-hidden scrollbar-hide">
          <div className="flex items-center justify-between mb-8 px-2 h-10 overflow-hidden shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(255,95,31,0.5)] shrink-0">
                <ClipboardList className="text-black w-6 h-6" />
              </div>
              <div className={cn(
                "flex flex-col transition-all duration-300 origin-left",
                isExpanded ? "opacity-100 scale-100 translate-x-0" : "opacity-0 scale-0 -translate-x-10 pointer-events-none"
              )}>
                <span className="text-xl text-white font-black tracking-tighter leading-none whitespace-nowrap">IMPACTO</span>
                <span className="text-[8px] font-bold tracking-[0.2em] text-zinc-500 uppercase whitespace-nowrap">Comunicação Visual</span>
              </div>
            </div>
            <button onClick={togglePin} className={cn("hidden md:flex p-2 rounded-lg transition-colors hover:bg-white/5", isExpanded ? "opacity-100" : "opacity-0 pointer-events-none", isPinned ? "text-primary" : "text-zinc-600")}>
              {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
            </button>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-hide">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.path}
                prefetch={true}
                onClick={() => setIsMobileOpen(false)}
                onMouseEnter={() => handleMouseEnter(item.path)}
                className={cn(
                  "flex items-center gap-4 px-3 h-12 rounded-xl transition-all duration-200 group relative shrink-0",
                  pathname === item.path 
                    ? "bg-primary text-black font-black" 
                    : "text-zinc-500 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="shrink-0 w-6 flex justify-center">
                  <item.icon size={20} className={cn(pathname === item.path ? "text-black" : "group-hover:text-primary transition-colors")} />
                </div>
                <span className={cn("text-xs tracking-wide whitespace-nowrap transition-all duration-300", isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none")}>
                  {item.label}
                </span>
                {pathname === item.path && <div className="absolute inset-0 bg-white/10 animate-pulse rounded-xl" />}
              </Link>
            ))}
            <Separator className="my-4 bg-white/5 mx-2" />
            {secondaryItems.map((item) => (
              <Link
                key={item.label}
                href={item.path}
                prefetch={true}
                onMouseEnter={() => handleMouseEnter(item.path)}
                className={cn("flex items-center gap-4 px-3 h-12 rounded-xl transition-all duration-200 group shrink-0", "text-zinc-500 hover:bg-white/5 hover:text-white")}
              >
                <div className="shrink-0 w-6 flex justify-center">
                  <item.icon size={20} className="group-hover:text-zinc-300 transition-colors" />
                </div>
                <span className={cn("text-xs tracking-wide whitespace-nowrap transition-all duration-300", isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none")}>
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-white/5 overflow-hidden shrink-0">
            <button onClick={handleLogout} className="w-full flex items-center gap-4 px-3 h-12 rounded-xl text-destructive hover:bg-destructive/10 transition-all duration-200 group">
              <div className="shrink-0 w-6 flex justify-center"><LogOut size={20} className="group-hover:scale-110 transition-transform" /></div>
              <span className={cn("text-xs font-black uppercase tracking-widest transition-all duration-300", isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10 pointer-events-none")}>Encerrar</span>
            </button>
          </div>
        </div>
      </aside>

      <div className={cn("hidden md:block transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0", isPinned ? "w-64" : "w-20")} />
    </>
  );
});

DashboardSidebar.displayName = 'DashboardSidebar';
