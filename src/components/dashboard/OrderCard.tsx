'use client';

import React, { memo, useMemo } from 'react';
import { Calendar, ChevronRight, Package, CheckCircle2, AlertTriangle, DollarSign } from 'lucide-react';
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
  totalValue?: number;
  amountPaid?: number;
  balanceDue?: number;
  updatedAt?: any;
}

interface OrderCardProps {
  order: Order;
  onClick?: (order: Order) => void;
}

export const OrderCard = memo(({ order, onClick }: OrderCardProps) => {
  const isDone = useMemo(() => ['Concluído', 'Entregue'].includes(order.status), [order.status]);
  
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

  const financialProgress = useMemo(() => {
    const total = Number(order.totalValue) || 0;
    const paid = Number(order.amountPaid) || 0;
    if (total === 0) return 0;
    return Math.min(100, Math.round((paid / total) * 100));
  }, [order.totalValue, order.amountPaid]);

  const isFullyPaid = financialProgress === 100 && (order.totalValue || 0) > 0;

  return (
    <div 
      onClick={() => onClick?.(order)}
      className={cn(
        "group relative w-full cursor-pointer bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300 ease-out",
        "hover:border-zinc-700 hover:bg-zinc-900/50 active:scale-[0.99]",
        isDone ? "opacity-80" : ""
      )}
    >
      <div 
        className="absolute inset-0 border border-transparent rounded-xl pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{ borderColor: `${statusConfig.color}40`, boxShadow: `inset 0 0 20px ${statusConfig.color}10` }}
      />

      <div className="flex items-stretch h-full">
        <div 
          className="w-1.5 shrink-0 transition-all duration-500 group-hover:w-2"
          style={{ 
            backgroundColor: statusConfig.color, 
            boxShadow: !isDone ? `0 0 15px ${statusConfig.color}60` : 'none' 
          }}
        />

        <div className="flex-1 p-3 flex flex-col justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

          {/* FINANCE BAR INTEGRATION */}
          <div className="pt-2 border-t border-white/5 space-y-1.5">
            <div className="flex justify-between items-end">
              <div className="flex items-center gap-1.5">
                <DollarSign size={10} className={cn(isFullyPaid ? "text-green-500" : "text-zinc-500")} />
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest",
                  isFullyPaid ? "text-green-500" : "text-zinc-500"
                )}>
                  {isFullyPaid ? "Protocolo Pago" : `Saldo: R$ ${(order.balanceDue || 0).toLocaleString('pt-BR')}`}
                </span>
              </div>
              <span className="text-[8px] font-mono text-zinc-600 font-bold">{financialProgress}%</span>
            </div>
            <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-700", isFullyPaid ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-primary")}
                style={{ width: `${financialProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.order.id === next.order.id && 
         prev.order.status === next.order.status && 
         prev.order.deliveryDate === next.order.deliveryDate &&
         prev.order.amountPaid === next.order.amountPaid &&
         prev.order.totalValue === next.order.totalValue &&
         prev.order.client === next.order.client;
});

OrderCard.displayName = 'OrderCard';
