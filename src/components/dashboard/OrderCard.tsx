'use client';

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronRight, CheckCircle2, AlertTriangle, DollarSign, Layers, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { startOfDay, isBefore, parseISO, format } from 'date-fns';
import { AvatarStack } from '@/components/ui/AvatarStack';

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
  _origin?: 'MANUAL' | 'AUTO_DATA' | 'AMBOS';
  assigned_to?: string[];
  weekly_priority?: boolean;
  lead_operator?: string;
  observations?: string;
}

interface OrderCardProps {
  order: Order;
  onClick?: (order: Order) => void;
  onDelete?: (order: Order) => void;
  /** Índice para animação escalonada (stagger) */
  index?: number;
}

/**
 * OrderCard — Tier-1 Redesign.
 *
 * Mudanças de Design:
 * - Removido: animate-pulse-neon-green/red (ruído visual)
 * - Adicionado: accent topline (1px no topo com cor do status)
 * - Adicionado: entrada escalonada via staggerChildren (orgânico)
 * - Adicionado: barra de progresso com animação de entrada (data storytelling)
 * - Otimizado: will-change: transform para GPU
 */
export const OrderCard = memo(({ order, onClick, onDelete, index = 0 }: OrderCardProps) => {
  const isDone = useMemo(() => ['Concluído', 'Entregue'].includes(order.status), [order.status]);

  const dateInfo = useMemo(() => {
    const rawDate = order.delivery_date || order.deliveryDate;
    if (!rawDate) return { formatted: '--/--', isLate: false, isToday: false };
    const todayNormalized = startOfDay(new Date());
    const deadlineNormalized = startOfDay(parseISO(rawDate));
    const isToday = format(deadlineNormalized, 'yyyy-MM-dd') === format(todayNormalized, 'yyyy-MM-dd');
    return {
      formatted: isToday ? 'HOJE' : format(deadlineNormalized, 'dd/MM'),
      isLate: isBefore(deadlineNormalized, todayNormalized) && !isDone,
      isToday: isToday && !isDone,
    };
  }, [order.delivery_date, order.deliveryDate, isDone]);

  const statusConfig = useMemo(() => {
    switch (order.status) {
      case 'Arte':       return { color: '#d946ef', label: 'Arte Final' };
      case 'Impressão':  return { color: '#3B82F6', label: 'Impressão' };
      case 'Serralheria':return { color: '#EAB308', label: 'Serralheria' };
      case 'Acabamento': return { color: '#FF5F1F', label: 'Acabamento' };
      case 'Instalação': return { color: '#8B5CF6', label: 'Instalação' };
      case 'Concluído':
      case 'Entregue':   return { color: '#4ade80', label: 'Concluído' };
      default:           return { color: '#71717a', label: 'Aguardando' };
    }
  }, [order.status]);

  const financialStats = useMemo(() => {
    const total = Number(order.total_value || order.totalValue) || 0;
    const paid = Number(order.amount_paid || order.amountPaid) || 0;
    const installments = Array.isArray(order.installments) ? order.installments : [];
    const instCount = installments.length;
    const paidCount = installments.filter(i => i.status === 'paid' || i.status === 'pago').length;
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

  // Cor da accent line e topline
  const accentColor = isDone ? '#4ade80' : dateInfo.isToday ? '#ef4444' : statusConfig.color;
  const barColor = financialStats.isFullyPaid ? '#4ade80' : financialStats.hasOverdue ? '#ef4444' : '#FF5F1F';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: index * 0.055,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ willChange: 'transform' }}
    >
      <div
        onClick={() => onClick?.(order)}
        className={cn(
          'group relative w-full cursor-pointer bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 ease-out',
          'hover:border-border hover:bg-accent hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]',
          isDone && 'opacity-80',
        )}
      >
        {/* ── Accent Topline (substitui borda neon pulsante) ─────────── */}
        <div
          className="absolute top-0 left-0 right-0 h-[1.5px] transition-opacity duration-300 opacity-60 group-hover:opacity-100"
          style={{ backgroundColor: accentColor }}
        />

        <div className="flex items-stretch h-full gap-4 p-5 pt-6">
          {/* ── Status Bar lateral ───────────────────────────────────── */}
          <div
            className="w-[3px] shrink-0 rounded-full transition-all duration-500"
            style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}60` }}
          />

          <div className={cn('flex-1 flex flex-col justify-between gap-4 min-w-0')}>
            {/* ── Header: ID + Status + Cliente ────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-mono font-bold text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-md border border-border uppercase tracking-tight shrink-0">
                    #{order.id}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className={cn('w-1.5 h-1.5 rounded-full shrink-0', !isDone && 'animate-pulse')}
                      style={{ backgroundColor: accentColor }}
                    />
                    <span
                      className="text-[9px] font-black uppercase tracking-[0.15em] truncate"
                      style={{ color: accentColor }}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-black text-foreground truncate uppercase tracking-tight group-hover:text-primary transition-colors duration-200">
                  {order.client}
                </h3>
              </div>

              {/* ── Deadline Badge ────────────────────────────────── */}
              <div className="flex items-center gap-4 shrink-0 border-t sm:border-t-0 border-border pt-2 sm:pt-0">
                <div className={cn(
                  'flex flex-col items-end px-2.5 py-1 rounded-lg border transition-colors min-w-[65px]',
                  dateInfo.isLate || dateInfo.isToday
                    ? 'bg-red-500/10 border-red-500/20'
                    : isDone
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : 'bg-secondary/60 border-border',
                )}>
                  <span className="text-[7px] text-muted-foreground uppercase font-black tracking-[0.2em]">
                    {isDone ? 'Finalizado' : 'Deadline'}
                  </span>
                  <div className={cn(
                    'flex items-center gap-1 font-mono font-bold text-xs',
                    (dateInfo.isLate || dateInfo.isToday) ? 'text-red-400' : isDone ? 'text-emerald-400' : 'text-foreground',
                  )}>
                    {(dateInfo.isLate || dateInfo.isToday)
                      ? <AlertTriangle size={10} />
                      : isDone
                        ? <CheckCircle2 size={10} className="text-emerald-400" />
                        : <Calendar size={10} className="text-muted-foreground" />
                    }
                    {dateInfo.formatted}
                  </div>
                </div>

                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(order); }}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                    title="Excluir Pedido"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <ChevronRight
                  className="text-muted-foreground group-hover:text-muted-foreground group-hover:translate-x-1 transition-all duration-200"
                  size={16}
                />
              </div>
            </div>

            {/* ── Footer: Financeiro ────────────────────────────────── */}
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    {financialStats.hasOverdue
                      ? <AlertTriangle size={10} className="text-red-400" />
                      : <DollarSign size={10} className={financialStats.isFullyPaid ? 'text-emerald-400' : 'text-muted-foreground'} />
                    }
                    <span className={cn(
                      'text-[8px] font-black uppercase tracking-widest',
                      financialStats.isFullyPaid
                        ? 'text-emerald-400'
                        : financialStats.hasOverdue
                          ? 'text-red-400'
                          : 'text-muted-foreground',
                    )}>
                      {financialStats.isFullyPaid
                        ? 'Quitado'
                        : financialStats.hasOverdue
                          ? 'Cobrança Vencida'
                          : `Saldo: R$ ${financialStats.balanceDue.toLocaleString('pt-BR')}`}
                    </span>
                  </div>
                  {financialStats.instCount > 0 && (
                    <div className="flex items-center gap-1 text-[7px] font-bold text-muted-foreground uppercase tracking-widest ml-4">
                      <Layers size={8} />
                      <span>{financialStats.paidCount}/{financialStats.instCount} faturas</span>
                    </div>
                  )}
                </div>
                <span className="text-[8px] font-mono text-muted-foreground font-bold">{financialStats.progress}%</span>
              </div>

              {/* ── Equipe Atribuída (Avatares) ───────────────────── */}
              <div className="flex items-center justify-between">
                <AvatarStack employeeIds={order.assigned_to || []} max={4} size="sm" showEmpty={false} />
                <span className="text-[8px] font-mono text-muted-foreground font-bold">{financialStats.progress > 0 ? `${financialStats.progress}%` : ''}</span>
              </div>

              {/* ── Progress Bar com animação de entrada ─────────── */}
              <div className="h-[3px] w-full bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${financialStats.progress}%` }}
                  transition={{ duration: 0.8, delay: index * 0.055 + 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: barColor,
                    boxShadow: financialStats.progress > 0 ? `0 0 6px ${barColor}60` : 'none',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}, (prev, next) => {
  // Otimização de Performance Extrema:
  // Evitar ao máximo JSON.stringify() ou avaliações de arrays inteiros em cada ciclo de render.
  
  // 1. Snapshot Timestamp (Mais rápido impossível se o Backend fornecer updatedAt)
  const prevTime = prev.order.updatedAt?.toMillis ? prev.order.updatedAt.toMillis() : prev.order.updatedAt?.seconds;
  const nextTime = next.order.updatedAt?.toMillis ? next.order.updatedAt.toMillis() : next.order.updatedAt?.seconds;
  
  if (prevTime !== nextTime) return false;

  // 2. Verificação Atômica Fallback (Caso updatedAt local ainda seja null no optimistic UI)
  return (
    prev.order.id === next.order.id &&
    prev.order.status === next.order.status &&
    prev.order.delivery_date === next.order.delivery_date && 
    prev.order.deliveryDate === next.order.deliveryDate &&
    prev.order.weekly_priority === next.order.weekly_priority &&
    prev.order.amount_paid === next.order.amount_paid && 
    prev.order.amountPaid === next.order.amountPaid &&
    prev.order.total_value === next.order.total_value && 
    prev.order.totalValue === next.order.totalValue &&
    prev.index === next.index
  );
});

OrderCard.displayName = 'OrderCard';