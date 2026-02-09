
"use client"

import React, { useState, memo, useCallback } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Settings, 
  Bell, 
  TrendingUp, 
  Package,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useRouter, usePathname } from 'next/navigation';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ClipboardList, label: 'Ordens de Serviço', path: '/orders/new' },
  { icon: TrendingUp, label: 'Analytics', path: '#' },
  { icon: Package, label: 'Estoque', path: '#' },
  { icon: Bell, label: 'Notificações', path: '#' },
  { icon: Settings, label: 'Configurações', path: '#' },
];

export const DashboardSidebar = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = useCallback((path: string) => {
    if (path !== '#') router.push(path);
    setIsOpen(false);
  }, [router]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden bg-[#121212]/80 backdrop-blur-md border border-white/10"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="text-primary" /> : <Menu className="text-primary" />}
      </Button>

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 glass border-r border-white/5 transition-transform duration-300 md:translate-x-0 will-change-transform",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="mb-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(255,95,31,0.5)]">
              <ClipboardList className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">VISCOMM</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">CC Terminal</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  pathname === item.path 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  pathname === item.path ? "text-primary" : "group-hover:text-primary transition-colors"
                )} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <Separator className="my-6 bg-white/5" />

          <div className="pt-4">
            <p className="text-[8px] text-muted-foreground/30 uppercase tracking-[0.3em] text-center">
              VisComm v1.0.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
});

DashboardSidebar.displayName = 'DashboardSidebar';
