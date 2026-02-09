
"use client"

import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle, Clock, ArrowRight, FileText, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Order {
  id: string;
  client: string;
  description: string;
  status: string;
  deliveryDate: string;
  value: number;
  isDelayed?: boolean;
}

interface OrderCardProps {
  order: Order;
  onClick?: (order: Order) => void;
}

export const OrderCard = memo(({ order, onClick }: OrderCardProps) => {
  const isDelayed = order.isDelayed || order.status === 'atrasado';

  return (
    <div 
      onClick={() => onClick?.(order)}
      className={cn(
        "flex flex-col rounded-2xl bg-white/5 border border-white/5 overflow-hidden group will-change-transform will-change-shadow transition-all hover:-translate-y-1 cursor-pointer",
        isDelayed ? "neon-hover-red" : "neon-hover-orange"
      )}
    >
      {/* Cabeçalho do Card */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className={cn(
            "text-[10px] font-black px-2 py-0.5 rounded border",
            isDelayed ? "border-destructive/30 text-destructive bg-destructive/5" : "border-primary/30 text-primary bg-primary/5"
          )}>
            #{order.id.slice(-4).toUpperCase()}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
            <Calendar className="w-3 h-3" />
            {order.deliveryDate}
          </div>
        </div>
        {isDelayed ? (
          <AlertCircle className="w-3.5 h-3.5 text-destructive animate-pulse" />
        ) : (
          <Pencil className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Corpo do Card */}
      <div className="p-4 space-y-4">
        <div>
          <h4 className="font-black text-white uppercase tracking-tight text-sm line-clamp-1">
            {order.client}
          </h4>
          <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest mt-0.5">
            {order.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <Badge variant="outline" className={cn(
            "text-[9px] rounded-full px-3 py-0.5 font-black uppercase tracking-tighter",
            isDelayed ? "border-destructive text-destructive bg-destructive/5" : "border-primary text-primary bg-primary/5"
          )}>
            {order.status}
          </Badge>
          <div className="text-right">
            <p className="text-xs font-mono font-black text-white">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
            </p>
          </div>
        </div>
      </div>

      {/* Rodapé do Card */}
      <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between gap-2 group/footer bg-white/[0.01]">
        <button className="text-[9px] font-black uppercase text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
          <FileText className="w-3 h-3" />
          Ver Protocolo
        </button>
        <button className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          isDelayed ? "bg-destructive/10 text-destructive group-hover/footer:bg-destructive group-hover/footer:text-white" : "bg-primary/10 text-primary group-hover/footer:bg-primary group-hover/footer:text-black"
        )}>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
