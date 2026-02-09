"use client"

import React, { memo } from 'react';
import { 
  Calendar, 
  Check, 
  ChevronDown, 
  Trash2,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Order {
  id: string;
  client: string;
  description: string;
  status: string;
  deliveryDate: string;
  value: number;
}

interface OrderCardProps {
  order: Order;
  onClick?: (order: Order) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  onQuickConclude?: (orderId: string) => void;
  onDelete?: (orderId: string) => void;
}

const statusOptions = ['Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação', 'Concluído'];

export const OrderCard = memo(({ order, onClick, onStatusChange, onQuickConclude, onDelete }: OrderCardProps) => {
  const isCompleted = order.status === 'Entregue' || order.status === 'Concluído';

  const handleStatusClick = (e: React.MouseEvent, status: string) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (onStatusChange) {
      onStatusChange(order.id, status);
    }
  };

  const handleConcludeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (onQuickConclude) {
      onQuickConclude(order.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (onDelete) {
      onDelete(order.id);
    }
  };

  return (
    <div 
      onClick={() => onClick?.(order)}
      className={cn(
        "group relative flex flex-col rounded-xl bg-[#121212] border border-zinc-800/50 p-3 transition-all duration-200 cursor-pointer overflow-hidden gap-y-2",
        "hover:border-primary/50 hover:bg-[#161616]",
        isCompleted && "opacity-60 grayscale-[0.3]"
      )}
    >
      <div className="flex items-center justify-between gap-2 z-10 border-b border-white/5 pb-2">
        <div className="flex items-center gap-1">
          <Hash className="w-2.5 h-2.5 text-zinc-500" />
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">
            {order.id}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
            {order.deliveryDate ? (
              new Date(order.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            ) : '--/--'}
          </span>
        </div>

        <button 
          onClick={handleConcludeClick}
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-90",
            isCompleted 
              ? "bg-green-500 text-black" 
              : "bg-zinc-800 text-zinc-400 hover:bg-green-500 hover:text-black"
          )}
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-black text-white uppercase tracking-tight truncate">
          {order.client}
        </h4>
        <p className="text-[9px] text-zinc-500 truncate mt-0.5">
          {order.description}
        </p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className={cn(
              "flex-1 flex items-center justify-between px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all active:scale-95 border",
              isCompleted 
                ? "bg-zinc-800 text-zinc-400 border-zinc-700" 
                : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            )}>
              <span className="truncate">{order.status}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="center"
            className="bg-zinc-900 border-zinc-800 text-white min-w-[140px] rounded-lg z-[150]"
          >
            {statusOptions.map((s) => (
              <DropdownMenuItem 
                key={s} 
                onClick={(e) => handleStatusClick(e as any, s)}
                className="text-[9px] uppercase font-bold tracking-widest focus:bg-primary focus:text-black p-2 cursor-pointer"
              >
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button 
          onClick={handleDeleteClick}
          className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700 flex items-center justify-center text-zinc-500 transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
