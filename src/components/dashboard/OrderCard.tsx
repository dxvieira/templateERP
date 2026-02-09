
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
    onStatusChange?.(order.id, status);
  };

  const handleConcludeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    onQuickConclude?.(order.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (onDelete) {
      onDelete(order.id);
    }
  };

  const handleContainerClick = () => {
    onClick?.(order);
  };

  return (
    <div 
      onClick={handleContainerClick}
      className={cn(
        "group relative flex flex-col rounded-3xl bg-[#121212] border border-zinc-800/50 p-5 transition-all duration-300 cursor-pointer overflow-hidden min-h-[200px] gap-y-3",
        "hover:scale-[1.01] hover:bg-[#161616] will-change-transform",
        isCompleted 
          ? "hover:border-[#00FF00] hover:shadow-[0_0_20px_-5px_rgba(0,255,0,0.3)]" 
          : "hover:border-primary hover:shadow-[0_0_20px_-5px_rgba(255,95,31,0.3)]"
      )}
    >
      {/* Background Glow */}
      <div className={cn(
        "absolute -right-10 -top-10 w-32 h-32 blur-[80px] opacity-10 transition-opacity group-hover:opacity-20",
        isCompleted ? "bg-[#00FF00]" : "bg-primary"
      )} />

      {/* Header Compacto */}
      <div className="flex items-center justify-between gap-3 z-10 border-b border-white/5 pb-3">
        <div className="flex items-center gap-1 opacity-50">
          <Hash className="w-3 h-3 text-zinc-400" />
          <span className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
            {order.id}
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-primary">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-black uppercase tracking-widest text-white whitespace-nowrap">
            {order.deliveryDate ? (
              new Date(order.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            ) : '--/--'}
          </span>
        </div>

        <button 
          onClick={handleConcludeClick}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90",
            isCompleted 
              ? "bg-[#00FF00] text-black" 
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-[#00FF00] hover:text-black hover:border-[#00FF00]"
          )}
        >
          <Check className="w-4 h-4" />
        </button>
      </div>

      {/* Corpo Espaçoso */}
      <div className="flex-1 flex flex-col justify-center py-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-xl font-black text-white leading-none uppercase tracking-tight line-clamp-1">
            {order.client}
          </h4>
          <span className="text-sm font-mono font-bold text-white whitespace-nowrap opacity-60">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 italic line-clamp-2 mt-2">
          {order.description}
        </p>
      </div>

      {/* Rodapé - Barra de Ações */}
      <div className="mt-auto flex items-center gap-3 pt-3 border-t border-white/5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className={cn(
              "flex-1 flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all active:scale-[0.98] border shadow-lg group/btn",
              isCompleted 
                ? "bg-[#00FF00] text-black border-[#00FF00]/20" 
                : "bg-primary text-black border-primary/20"
            )}>
              <span className="flex-1 text-center">{order.status}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="center"
            className="bg-zinc-900 border-zinc-800 text-white min-w-[200px] rounded-xl shadow-2xl z-[150] p-1"
          >
            {statusOptions.map((s) => (
              <DropdownMenuItem 
                key={s} 
                onClick={(e) => handleStatusClick(e as any, s)}
                className="text-[9px] uppercase font-black tracking-widest focus:bg-primary focus:text-black p-3 rounded-lg cursor-pointer"
              >
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button 
          onClick={handleDeleteClick}
          className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 transition-all hover:bg-destructive hover:text-white hover:border-destructive hover:shadow-[0_0_15px_rgba(255,0,0,0.4)] active:scale-90 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
