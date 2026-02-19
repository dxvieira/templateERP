'use client';

import React, { memo, useMemo } from 'react';
import { Calendar, ChevronRight, Package, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OrderItem {
  desc?: string;
  quantity?: number;
  observation?: string;
}

export interface Order {
  id: string;
  client: string;
  status: string;
  deliveryDate: string;
  description?: string;
  items?: OrderItem[];
  updatedAt?: any;
}

interface OrderCardProps {
  order: Order;
  onClick?: (order: Order) => void;
}

/**
 * COMPONENTE SUPREMO: OrderCard
 * Otimizado com React.memo e hardware-accelerated animations.
 */
export const OrderCard = memo(({ order, onClick }: OrderCardProps) => {
  const isDone = useMemo(() => ['Concluído', 'Entregue'].includes(order.status), [order.status]);
  
  // Memoização do processamento de datas para evitar instâncias repetitivas
  const dateInfo = useMemo(() => {
    if (!order.deliveryDate) return { formatted: '--/--', isLate: false };
    
    const [year, month, day] = order.deliveryDate.split('-').map(Number);
    const deadline = new Date(year, month - 1, day, 23, 59, 59);
    const now = new Date();
    
    return {
      formatted: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`,
      isLate: now > deadline && !isDone
    };
  }, [order.deliveryDate, isDone]);

  // Paleta Industrial Fixa (CSS Variables para Performance)
  const statusConfig = useMemo(() => {
    switch(order.status) {
      case 'Arte': return { color: '#d946ef', label: 'Arte Final' };
      case 'Impressão': return { color: '#3B82F6', label: 'Impressão' };
      case 'Serralheria': return { color: '#EAB308', label: 'Serralheria' };
      case 'Acabamento': return { color: '#FF5F1F', label: 'Acabamento' };
      case 'Instalação': return { color: '#8B5CF6', label: 'Instalação' };
      case 'Concluído':
      case 'Entregue': return { color: '#4ade80', label: 'Concluído' }; 
      default: return { color: '#71717a', label: 'Aguardando' };
    }
  }, [order.status]);

  return (
    <div 
      onClick={() => onClick?.(order)}
      className={cn(
        "group relative w-full cursor-pointer bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300 ease-out",
        "hover:border-zinc-700 hover:bg-zinc-900/50 active:scale-[0.99]",
        isDone ? "opacity-80" : ""
      )}
    >
      {/* Borda de Destaque Neon (GPU Accelerated) */}
      <div 
        className="absolute inset-0 border border-transparent rounded-xl pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{ borderColor: `${statusConfig.color}40`, boxShadow: `inset 0 0 20px ${statusConfig.color}10` }}
      />

      <div className="flex items-stretch h-full">
        {/* Indicador de Status Lateral */}
        <div 
          className="w-1.5 shrink-0 transition-all duration-500 group-hover:w-2"
          style={{ 
            backgroundColor: statusConfig.color, 
            boxShadow: !isDone ? `0 0 15px ${statusConfig.color}60` : 'none' 
          }}
        />

        <div className="flex-1 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-bold text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 uppercase tracking-tighter">
                #{order.id.slice(-6)}
              </span>
              <div className="flex items-center gap-1.5">
                 <div className={cn("w-1.5 h-1.5 rounded-full", !isDone && "animate-pulse")} style={{ backgroundColor: statusConfig.color }} />
                 <span className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: statusConfig.color }}>
                   {statusConfig.label}
                 </span>
              </div>
            </div>

            <h3 className="text-sm font-black text-white truncate uppercase tracking-tight group-hover:text-primary transition-colors">
              {order.client}
            </h3>
            
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Package size={10} className="shrink-0" />
              <p className="text-[9px] uppercase truncate font-bold tracking-widest opacity-60">
                {order.description || 'Ficha Técnica Ativa'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 border-t sm:border-t-0 border-zinc-800/50 pt-2 sm:pt-0">
            <div className={cn(
              "flex flex-col items-end px-2.5 py-1 rounded-lg border transition-colors",
              dateInfo.isLate ? "bg-red-500/10 border-red-500/30" : "bg-zinc-900/50 border-zinc-800"
            )}>
              <span className="text-[7px] text-zinc-500 uppercase font-black tracking-[0.2em]">
                {isDone ? 'Finalizado' : 'Deadline'}
              </span>
              <div className={cn(
                "flex items-center gap-1 font-mono font-bold text-xs",
                dateInfo.isLate ? "text-red-500 animate-pulse" : "text-white"
              )}>
                {dateInfo.isLate ? <AlertTriangle size={10} /> : (isDone ? <CheckCircle2 size={10} className="text-green-500" /> : <Calendar size={10} className="text-zinc-500" />)}
                {dateInfo.formatted}
              </div>
            </div>
            <ChevronRight className="text-zinc-800 group-hover:text-white group-hover:translate-x-1 transition-all" size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  // Comparação customizada para evitar re-renders por objetos idênticos
  return prev.order.id === next.order.id && 
         prev.order.status === next.order.status && 
         prev.order.deliveryDate === next.order.deliveryDate &&
         prev.order.client === next.client;
});

OrderCard.displayName = 'OrderCard';
