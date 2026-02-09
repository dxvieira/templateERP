
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

  const handleContainerClick = () => {
    if (onClick) {
      onClick(order);
    }
  };

  return (
    <div 
      onClick={handleContainerClick}
      className={cn(
        "group relative flex flex-col rounded-2xl bg-[#121212] border border-zinc-800/50 p-4 transition-all duration-200 cursor-pointer overflow-hidden gap-y-3",
        "hover:border-primary/50 hover:bg-[#161616]",
        isCompleted && "opacity-60 grayscale-[0.5]"
      )}
    >
      {/* Header Compacto */}
      <div className="flex items-center justify-between gap-2 z-10 border-b border-white/5 pb-2">
        <div className="flex items-center gap-1.5">
          <Hash className="w-3 h-3 text-zinc-500" />
          <span className="text-[10px] font-bold uppercase text-zinc-500">
            {order.id}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-white uppercase">
            {order.deliveryDate ? (
              new Date(order.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            ) : '--/--'}
          </span>
        </div>

        <button 
          onClick={handleConcludeClick}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90",
            isCompleted 
              ? "bg-green-500 text-black" 
              : "bg-zinc-800 text-zinc-400 hover:bg-green-500 hover:text-black"
          )}
        >
          <Check className="w-4 h-4" />
        </button>
      </div>

      {/* Corpo Clean */}
      <div className="flex-1 flex flex-col justify-center py-1">
        <h4 className="text-sm font-bold text-white uppercase tracking-tight truncate">
          {order.client}
        </h4>
        <p className="text-[10px] text-zinc-500 truncate mt-1">
          {order.description}
        </p>
      </div>

      {/* Rodapé Clean */}
      <div className="mt-auto flex items-center gap-2 pt-2 border-t border-white/5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className={cn(
              "flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95 border",
              isCompleted 
                ? "bg-zinc-800 text-zinc-400 border-zinc-700" 
                : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            )}>
              <span className="truncate">{order.status}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="center"
            className="bg-zinc-900 border-zinc-800 text-white min-w-[160px] rounded-xl z-[150]"
          >
            {statusOptions.map((s) => (
              <DropdownMenuItem 
                key={s} 
                onClick={(e) => handleStatusClick(e as any, s)}
                className="text-[10px] uppercase font-bold tracking-widest focus:bg-primary focus:text-black p-2.5 cursor-pointer"
              >
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button 
          onClick={handleDeleteClick}
          className="w-9 h-9 rounded-lg bg-zinc-800/50 border border-zinc-700 flex items-center justify-center text-zinc-500 transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
