
"use client"

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, ArrowRight, AlertCircle } from 'lucide-react';
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

export function OrderCard({ order }: OrderCardProps) {
  const isDelayed = order.isDelayed || order.status === 'atrasado';

  return (
    <div className={cn(
      "flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 gap-4 group",
      isDelayed ? "neon-hover-red" : "neon-hover-orange"
    )}>
      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs border transition-colors",
          isDelayed 
            ? "bg-destructive/10 text-destructive border-destructive/20" 
            : "bg-primary/10 text-primary border-primary/20"
        )}>
          #{order.id.slice(-4)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm tracking-tight text-white">{order.client}</h4>
            {isDelayed && <AlertCircle className="w-3 h-3 text-destructive" />}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{order.description}</p>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-6 px-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span className={cn("text-[10px] font-mono", isDelayed && "text-destructive font-bold")}>
            {order.deliveryDate}
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-2 text-muted-foreground">
          <User className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">{order.status}</span>
        </div>
      </div>

      <div className="flex items-center justify-between w-full md:w-auto md:gap-8">
        <div className="text-left md:text-right">
          <Badge variant="outline" className={cn(
            "text-[10px] rounded-full px-3",
            isDelayed ? "border-destructive/50 text-destructive" : "border-primary/50 text-primary"
          )}>
            {order.status.toUpperCase()}
          </Badge>
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
          </p>
        </div>
        <button className={cn(
          "p-2 bg-white/5 rounded-lg transition-all",
          isDelayed ? "hover:bg-destructive hover:text-white" : "hover:bg-primary hover:text-black"
        )}>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
