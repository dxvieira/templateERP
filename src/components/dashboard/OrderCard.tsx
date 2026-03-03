
'use client';

import React, { memo, useMemo } from 'react';
import { Calendar, ChevronRight, CheckCircle2, AlertTriangle, DollarSign, Layers, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { startOfDay, isBefore, parseISO, format } from 'date-fns';

export interface Order {
  id: string;
  client: string;
  status: string;
  delivery_date?: string;
  deliveryDate?: string;
  total_value?: number;
  totalValue?: number;
  amount_paid?: number;
  amountPaid?: number;
  balance_due?: number;
  balanceDue?: number;
  installments?: any[];
  updatedAt?: any;
  _origin?: 'MANUAL' | 'AUTO_DATA' | 'AMBOS'; // Tag temporária para debug
}

interface OrderCardProps {
  order: Order;
  onClick?: (order: Order) => void;
  onDelete?: (order: Order) => void;
}

/**
 * Card de Pedido - Refatorado para cálculo dinâmico de progresso financeiro e status temporal cravado.
 */
export const OrderCard = memo(({ order, onClick, onDelete }: OrderCardProps) => {
  const isDone = useMemo(() => ['Concluído', 'Entregue'].includes(order.status), [order.status]);
  
  const dateInfo = useMemo(() => {
    const rawDate = order.delivery_date || order.deliveryDate;
    if (!rawDate) return { formatted: '--/--', isLate: false };
    
    // Normalização Temporal: Ignora horas para evitar atrasos falsos
    const todayNormalized = startOfDay(new Date());
    const deadlineNormalized = startOfDay(parseISO(rawDate));
    
    return {
      formatted: format(deadlineNormalized, 'dd/MM'),
      isLate: isBefore(deadlineNormalized, todayNormalized) && !isDone
    };
  }, [order.delivery_date, order.deliveryDate, isDone]);

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

  const financialStats = useMemo(() => {
    const total = Number(order.total_value || order.totalValue) || 0;
    const paid = Number(order.amount_paid || order.amountPaid) || 0;
    
    const installments = Array.isArray(order.installments) ? order.installments : [];
    
    const instCount = installments.length;
    const paidCount = installments.filter(i => i.status === 'paid' || i.status === 'pago').length;
    
    // Verificação de atraso em faturas usando normalização de meia-noite
    const todayNormalized = startOfDay(new Date());
    const hasOverdue = installments.some(i => {
      if (i.status === 'paid' || i.status === 'pago') return false;
      const dueDate = i.due_date || i.dueDate;
      if (!dueDate) return false;
      return isBefore(startOfDay(parseISO(dueDate)), todayNormalized);
    });
    
    const progress = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
    const balanceDue = order.balance_due !== undefined ? order.balance_due : (total - paid);
    const isFullyPaid = balanceDue <= 0 && total > 0;
    
    return { progress, isFullyPaid, instCount, paidCount, hasOverdue, balanceDue };
  }, [order.total_value, order.totalValue, order.amount_paid, order.amountPaid, order.balance_due, order.balanceDue, order.installments]);

  return (
    <div 
      onClick={() => onClick?.(order)}
      className={cn(
        "group relative w-full cursor-pointer bg-[#0c0c0e] border border-zinc-800 rounded-xl overflow-hidden p-5 transition-all duration-300 ease-out",
        "hover:border-zinc-700 hover:shadow-lg hover:-translate-y-0.5",
        isDone ? "opacity-80" : ""
      )}
    >
      <div 
        className="absolute inset-0 border border-transparent rounded-xl pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{ borderColor: `${statusConfig.color}20` }}
      />

      <div className="flex items-stretch h-full gap-4">
        <div 
          className="w-1 shrink-0 transition-all duration-500 rounded-full"
          style={{ 
            backgroundColor: statusConfig.color, 
            boxShadow: !isDone ? `0 0 15px ${statusConfig.color}40` : 'none' 
          }}
        />

        <div className="flex-1 flex flex-col justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] font-mono font-bold text-zinc-100 bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-700 uppercase tracking-tight shadow-sm">
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
                  {dateInfo.isLate ? <AlertTriangle size={10} /> : (isDone ? <CheckCircle2 size={10} className="text-emerald-500" /> : <Calendar size={10} className="text-zinc-500" />)}
                  {dateInfo.formatted}
                </div>
              </div>

              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(order);
                  }}
                  className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Excluir Pedido"
                >
                  <Trash2 size={18} />
                </button>
              )}

              <ChevronRight className="text-zinc-800 group-hover:text-white group-hover:translate-x-1 transition-all" size={16} />
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 space-y-2">
            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-0.5">
                 <div className="flex items-center gap-1.5">
                   {financialStats.hasOverdue ? <AlertTriangle size={10} className="text-red-500 animate-bounce" /> : <DollarSign size={10} className={cn(financialStats.isFullyPaid ? "text-emerald-500" : "text-zinc-500")} />}
                   <span className={cn(
                     "text-[8px] font-black uppercase tracking-widest",
                     financialStats.isFullyPaid ? "text-emerald-500" : financialStats.hasOverdue ? "text-red-500" : "text-zinc-500"
                   )}>
                     {financialStats.isFullyPaid ? "Protocolo Pago" : financialStats.hasOverdue ? "Cobrança Vencida" : `Saldo: R$ ${financialStats.balanceDue.toLocaleString('pt-BR')}`}
                   </span>
                 </div>
                 {financialStats.instCount > 0 && (
                   <div className="flex items-center gap-1 text-[7px] font-bold text-zinc-600 uppercase tracking-widest ml-4">
                      <Layers size={8} /> <span>{financialStats.paidCount} de {financialStats.instCount} faturas pagas</span>
                   </div>
                 )}
              </div>
              <span className="text-[8px] font-mono text-zinc-600 font-bold">{financialStats.progress}%</span>
            </div>
            <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-700", 
                  financialStats.isFullyPaid ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : 
                  financialStats.hasOverdue ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-primary"
                )}
                style={{ width: `${financialStats.progress}%` }}
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
         (prev.order.delivery_date === next.order.delivery_date || prev.order.deliveryDate === next.order.deliveryDate) &&
         (prev.order.amount_paid === next.order.amount_paid || prev.order.amountPaid === next.order.amountPaid) &&
         (prev.order.total_value === next.order.total_value || prev.order.totalValue === next.order.totalValue) &&
         prev.order.client === next.order.client &&
         JSON.stringify(prev.order.installments) === JSON.stringify(next.order.installments);
});

OrderCard.displayName = 'OrderCard';
