'use client';

import React, { memo, useMemo } from 'react';
import { Calendar, ChevronRight, Package, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OrderItem {
  desc?: string;
  quantity?: number;
  observation?: string;
}

export interface Order {
  id: string;
  client: string;
  description: string;
  status: string;
  deliveryDate: string;
  items?: OrderItem[];
}

interface OrderCardProps {
  order: Order;
  onClick?: (order: Order) => void;
}

export const OrderCard = memo(({ order, onClick }: OrderCardProps) => {
  const isDone = useMemo(() => order.status === 'Concluído' || order.status === 'Entregue', [order.status]);
  
  // Memoização do processamento de data
  const { formattedDate, isLate } = useMemo(() => {
    if (!order.deliveryDate) return { formattedDate: '--/--', isLate: false };
    
    const dateObj = new Date(order.deliveryDate.includes('T') ? order.deliveryDate : order.deliveryDate + 'T12:00:00');
    const formatted = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const late = new Date() > dateObj && !isDone;
    
    return { formattedDate: formatted, isLate: late };
  }, [order.deliveryDate, isDone]);

  // Memoização das Cores Industriais
  const statusColor = useMemo(() => {
    switch(order.status) {
      case 'Arte': return '#d946ef';
      case 'Impressão': return '#3B82F6';
      case 'Serralheria': return '#EAB308';
      case 'Acabamento': return '#FF5F1F';
      case 'Instalação': return '#8B5CF6';
      case 'Concluído':
      case 'Entregue': return '#4ade80'; 
      default: return '#71717a';
    }
  }, [order.status]);

  return (
    <div 
      onClick={() => onClick?.(order)}
      className={cn(
        "group relative w-full cursor-pointer bg-[#09090b] border border-zinc-800 rounded-lg overflow-hidden transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 flex flex-col sm:flex-row items-stretch",
        isDone ? "border-green-500/10" : ""
      )}
      style={{ 
        // @ts-ignore
        '--hover-color': statusColor, 
      } as React.CSSProperties}
    >
      <div className="absolute inset-0 border border-transparent rounded-lg pointer-events-none transition-all duration-300 group-hover:border-[var(--hover-color)] group-hover:shadow-[0_0_15px_-5px_var(--hover-color)] opacity-40 group-hover:opacity-100" />

      <div 
        className="w-1 transition-all group-hover:w-1.5 shrink-0"
        style={{ backgroundColor: statusColor, boxShadow: `0 0 10px ${statusColor}` }}
      />

      <div className="relative z-10 flex-1 w-full p-2.5 pl-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-zinc-500 bg-zinc-900 px-1 py-0 rounded border border-zinc-800 uppercase">
              #{order.id.slice(-6)}
            </span>
            <div className="flex items-center gap-1">
               <div className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor }} />
               <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: statusColor }}>
                 {order.status || 'Aguardando'}
               </span>
            </div>
          </div>
          <h3 className={cn(
            "text-sm sm:text-base font-black truncate transition-colors leading-tight uppercase tracking-tight",
            isDone ? "text-zinc-300 group-hover:text-white" : "text-white"
          )}>
            {order.client}
          </h3>
          
          <div className="flex items-center gap-1 text-zinc-500">
            <Package size={8} />
            <p className="text-[8px] uppercase truncate font-medium tracking-widest">
              {order.description || 'Sem descrição'}
              {order.items && order.items.length > 1 && ` +${order.items.length - 1}`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 border-t sm:border-t-0 border-zinc-800/50 pt-2 sm:pt-0">
          <div className={cn(
            "flex items-center gap-2 px-2 py-1 rounded-md border transition-all",
            isLate ? "bg-red-500/10 border-red-500/30" : "bg-zinc-900/50 border-zinc-800",
            "group-hover:border-[var(--hover-color)]/30"
          )}>
            <div className="text-right">
              <p className="text-[7px] text-zinc-500 uppercase font-bold tracking-widest">
                {isDone ? 'Concluído' : 'Prazo'}
              </p>
              <div className={cn("flex items-center gap-1 font-mono font-bold text-xs", isLate ? "text-red-500" : "text-white")}>
                {isDone ? <CheckCircle2 size={10} className="text-green-500" /> : <Calendar size={10} className="text-zinc-500" />}
                {formattedDate}
              </div>
            </div>
          </div>
          <ChevronRight className="text-zinc-800 group-hover:text-[var(--hover-color)] group-hover:translate-x-1 transition-all hidden sm:block" size={14} />
        </div>
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
