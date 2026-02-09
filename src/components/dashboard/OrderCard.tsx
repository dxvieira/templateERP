
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
        "group relative flex flex-col rounded-[2.5rem] bg-[#121212] border border-zinc-800/50 p-6 md:p-8 transition-all duration-300 cursor-pointer overflow-hidden min-h-[220px] gap-y-6",
        "hover:scale-[1.02] hover:bg-[#161616] will-change-transform",
        isCompleted 
          ? "hover:border-[#00FF00] hover:shadow-[0_0_30px_-5px_rgba(0,255,0,0.3)]" 
          : "hover:border-primary hover:shadow-[0_0_30px_-5px_rgba(255,95,31,0.3)]"
      )}
    >
      {/* Background Glow */}
      <div className={cn(
        "absolute -right-20 -top-20 w-48 h-48 blur-[100px] opacity-10 transition-opacity group-hover:opacity-20",
        isCompleted ? "bg-[#00FF00]" : "bg-primary"
      )} />

      {/* Header Compacto */}
      <div className="flex items-center justify-between gap-4 z-10 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2 opacity-50">
          <Hash className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-black tracking-widest uppercase text-zinc-400">
            {order.id}
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-primary">
          <Calendar className="w-5 h-5" />
          <span className="text-xl font-black uppercase tracking-widest text-white whitespace-nowrap">
            {order.deliveryDate ? (
              new Date(order.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            ) : '--/--'}
          </span>
        </div>

        <button 
          onClick={handleConcludeClick}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90",
            isCompleted 
              ? "bg-[#00FF00] text-black" 
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-[#00FF00] hover:text-black hover:border-[#00FF00]"
          )}
        >
          <Check className="w-5 h-5" />
        </button>
      </div>

      {/* Corpo Espaçoso */}
      <div className="flex-1 flex flex-col justify-center py-2">
        <h4 className="text-2xl md:text-3xl font-black text-white leading-tight uppercase tracking-tight line-clamp-2">
          {order.client}
        </h4>
        <p className="text-sm md:text-base text-zinc-500 italic line-clamp-2 mt-3 leading-relaxed">
          {order.description}
        </p>
      </div>

      {/* Rodapé - Barra de Ações */}
      <div className="mt-auto flex items-center gap-4 pt-4 border-t border-white/5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className={cn(
              "flex-1 flex items-center justify-between px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.4em] transition-all active:scale-[0.98] border shadow-lg group/btn",
              isCompleted 
                ? "bg-[#00FF00] text-black border-[#00FF00]/20" 
                : "bg-primary text-black border-primary/20"
            )}>
              <span className="flex-1 text-center">{order.status}</span>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="center"
            className="bg-zinc-900 border-zinc-800 text-white min-w-[240px] rounded-2xl shadow-2xl z-[150] p-2"
          >
            {statusOptions.map((s) => (
              <DropdownMenuItem 
                key={s} 
                onClick={(e) => handleStatusClick(e as any, s)}
                className="text-[10px] uppercase font-black tracking-widest focus:bg-primary focus:text-black p-4 rounded-xl cursor-pointer"
              >
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button 
          onClick={handleDeleteClick}
          className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 transition-all hover:bg-destructive hover:text-white hover:border-destructive hover:shadow-[0_0_20px_rgba(255,0,0,0.4)] active:scale-90 shrink-0"
        >
          <Trash2 className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
