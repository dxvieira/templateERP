"use client"

import React from 'react';
import { Card } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  isPositive?: boolean;
  isLoading?: boolean;
}

/**
 * DashboardStatCard - Componente padronizado para métricas.
 * Formato: [Título] | [Valor destacado] | [Indicador de tendência]
 */
export function DashboardStatCard({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  isPositive = true,
  isLoading = false 
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-[#0c0c0e] border border-zinc-800/60 p-5 rounded-2xl">
        <div className="flex justify-between items-start mb-4">
          <Skeleton className="h-4 w-24 bg-zinc-800" />
          <Skeleton className="h-8 w-8 rounded-lg bg-zinc-800" />
        </div>
        <Skeleton className="h-10 w-32 bg-zinc-800 mb-2" />
        <Skeleton className="h-3 w-20 bg-zinc-800" />
      </Card>
    );
  }

  return (
    <Card className="group relative bg-[#0c0c0e] border border-zinc-800/60 p-5 rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(255,95,31,0.1)]">
      {/* Detalhe Neon Lateral */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors" />
      
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{label}</span>
        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-primary group-hover:scale-110 transition-transform">
          <Icon size={18} />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black text-white tracking-tighter">
          {value}
        </h3>
        
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest",
            isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
          )}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="h-1 flex-1 bg-zinc-900 rounded-full overflow-hidden">
          <div className="h-full bg-primary/40 w-2/3" />
        </div>
        <span className="text-[8px] font-black text-zinc-600 uppercase">Live Sync</span>
      </div>
    </Card>
  );
}
