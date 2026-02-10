
'use client';

import React, { memo } from 'react';
import { Calendar, ChevronRight, Package, CheckCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Order {
  id: string;
  client: string;
  description: string;
  status: string;
  deliveryDate: string;
}

interface OrderCardProps {
  order: Order;
  onClick?: (order: Order) => void;
  onQuickConclude?: (orderId: string) => void;
  onDelete?: (orderId: string) => void;
}

export const OrderCard = memo(({ order, onClick, onQuickConclude, onDelete }: OrderCardProps) => {
  const isCompleted = order.status === 'Concluído' || order.status === 'Entregue';
  
  const dateObj = order.deliveryDate ? new Date(order.deliveryDate.includes('T') ? order.deliveryDate : order.deliveryDate + 'T12:00:00') : null;
  const formattedDate = dateObj ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--';
  const isLate = dateObj && new Date() > dateObj && !isCompleted;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Arte': return '#d946ef';
      case 'Impressão': return '#3B82F6';
      case 'Serralheria': return '#EAB308';
      case 'Acabamento': return '#FF5F1F';
      case 'Instalação': return '#22c55e';
      default: return '#71717a';
    }
  };

  const statusColor = getStatusColor(order.status);

  return (
    <div 
      onClick={() => onClick?.(order)}
      className={cn(
        "group relative w-full cursor-pointer bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300 ease-out",
        "hover:border-[#FF5F1F]/50 hover:shadow-[0_4px_20px_-5px_rgba(255,95,31,0.15)] hover:-translate-y-0.5",
        "flex flex-col sm:flex-row items-start sm:items-center",
        isCompleted && "opacity-50 grayscale-[0.5]"
      )}
    >
      {/* BARRA LATERAL DE STATUS (Indicador Neon) */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2"
        style={{ backgroundColor: statusColor, boxShadow: `0 0 10px ${statusColor}` }}
      />

      {/* CONTEÚDO PRINCIPAL (Flexbox Responsivo) */}
      <div className="flex-1 w-full p-4 pl-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        
        {/* LADO ESQUERDO: ID, Nome e Status */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 uppercase">
              #{order.id.slice(-6)}
            </span>
            <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: statusColor }} />
               <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: statusColor }}>
                 {order.status || 'Aguardando'}
               </span>
            </div>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white truncate group-hover:text-[#FF5F1F] transition-colors leading-tight uppercase tracking-tight">
            {order.client}
          </h3>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Package size={10} />
            <p className="text-[10px] uppercase truncate font-medium tracking-widest">{order.description}</p>
          </div>
        </div>

        {/* LADO DIREITO: Data de Entrega */}
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
          
          <div className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-lg border transition-colors",
            isLate ? "bg-red-500/10 border-red-500/30" : "bg-zinc-900/50 border-zinc-800 group-hover:border-[#FF5F1F]/30"
          )}>
            <div className="text-right">
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Entrega</p>
              <div className={cn("flex items-center gap-2 font-mono font-bold text-lg", isLate ? "text-red-500" : "text-white")}>
                <Calendar size={14} className={isLate ? "text-red-500" : "text-zinc-500"} />
                {formattedDate}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCompleted && onQuickConclude && (
              <button 
                onClick={(e) => { e.stopPropagation(); onQuickConclude(order.id); }}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-primary hover:border-primary/50 transition-all"
              >
                <CheckCircle size={18} />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(order.id); }}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-destructive hover:border-destructive/50 transition-all"
              >
                <Trash2 size={18} />
              </button>
            )}
            <ChevronRight className="text-zinc-800 group-hover:text-primary group-hover:translate-x-1 transition-all hidden sm:block" />
          </div>
        </div>
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
