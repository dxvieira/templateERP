
"use client"

import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, ArrowRight, AlertCircle, Clock } from 'lucide-react';
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
}

export const OrderCard = memo(({ order }: OrderCardProps) => {
  const isDelayed = order.isDelayed || order.status === 'atrasado';

  return (
    <div className={cn(
      "flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 gap-4 group will-change-transform will-change-shadow active:scale-[0.99] transition-all",
      isDelayed ? "neon-hover-red" : "neon-hover-orange"
    )}>
      {/* Esquerda: Identificação e Cliente */}
      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className={cn(
          "w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center font-bold text-[10px] md:text-xs border transition-colors shrink-0",
          isDelayed 
            ? "bg-destructive/10 text-destructive border-destructive/20" 
            : "bg-primary/10 text-primary border-primary/20"
        )}>
          #{order.id.slice(-4).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm md:text-base tracking-tight text-white truncate">{order.client}</h4>
            {isDelayed && <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 animate-pulse" />}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 italic">{order.description}</p>
        </div>
      </div>

      {/* Meio: Informações de Data e Status Mobile-Ready */}
      <div className="grid grid-cols-2 md:flex md:flex-1 items-center gap-4 md:gap-8 px-0 md:px-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span className={cn("text-[10px] font-mono", isDelayed && "text-destructive font-black uppercase")}>
            {order.deliveryDate}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider font-medium truncate">{order.status}</span>
        </div>
      </div>

      {/* Direita: Badge, Valor e Ação */}
      <div className="flex items-center justify-between w-full md:w-auto md:gap-8 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
        <div className="text-left md:text-right">
          <Badge variant="outline" className={cn(
            "text-[9px] md:text-[10px] rounded-full px-3 py-0.5 md:py-1 font-black",
            isDelayed ? "border-destructive text-destructive bg-destructive/5" : "border-primary text-primary bg-primary/5"
          )}>
            {order.status.toUpperCase()}
          </Badge>
          <p className="text-[10px] md:text-[11px] text-white/70 mt-1 font-mono font-bold">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
          </p>
        </div>
        
        <button className={cn(
          "w-11 h-11 md:w-10 md:h-10 flex items-center justify-center bg-white/5 rounded-xl transition-all transform active:scale-90",
          isDelayed ? "hover:bg-destructive text-destructive hover:text-white" : "hover:bg-primary text-primary hover:text-black"
        )}>
          <ArrowRight className="w-5 h-5 md:w-4 md:h-4" />
        </button>
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
