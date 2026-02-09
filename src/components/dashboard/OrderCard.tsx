"use client"

import React, { memo } from 'react';
import { 
  Calendar, 
  Check, 
  ChevronDown, 
  PackageCheck,
  Trash2
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
    e.stopPropagation();
    onStatusChange?.(order.id, status);
  };

  const handleConcludeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickConclude?.(order.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(order.id);
  };

  return (
    <div 
      onClick={() => onClick?.(order)}
      className={cn(
        "group relative flex flex-col rounded-2xl bg-[#121212] border border-zinc-800/50 p-4 transition-all duration-300 cursor-pointer overflow-hidden min-h-[180px] gap-y-3",
        "hover:scale-[1.01] hover:bg-[#161616]",
        isCompleted 
          ? "hover:border-[#00FF00] hover:shadow-[0_0_20px_-5px_rgba(0,255,0,0.5)]" 
          : "hover:border-primary hover:shadow-[0_0_20px_-5px_rgba(255,95,31,0.5)]"
      )}
    >
      {/* Background Decorativo Suave */}
      <div className={cn(
        "absolute -right-8 -top-8 w-24 h-24 blur-[60px] opacity-10 transition-opacity group-hover:opacity-20",
        isCompleted ? "bg-[#00FF00]" : "bg-primary"
      )} />

      {/* Cabeçalho Compacto */}
      <div className="flex items-center justify-between gap-2">
        <span className={cn(
          "text-[9px] font-black tracking-[0.1em] uppercase",
          isCompleted ? "text-[#00FF00]" : "text-primary"
        )}>
          #{order.id}
        </span>
        
        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center gap-1.5">
            <Calendar className={cn("w-3 h-3", isCompleted ? "text-[#00FF00]" : "text-primary")} />
            <span className="text-[14px] font-black text-white tracking-tighter">
              {order.deliveryDate ? (
                new Date(order.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
              ) : 'N/A'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isCompleted ? (
            <button 
              onClick={handleConcludeClick}
              className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 transition-all hover:bg-primary hover:text-black hover:border-primary active:scale-90"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#00FF00]/10 flex items-center justify-center text-[#00FF00]">
              <PackageCheck className="w-3.5 h-3.5" />
            </div>
          )}
          
          <button 
            onClick={handleDeleteClick}
            className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 transition-all hover:bg-destructive hover:text-white hover:border-destructive hover:shadow-[0_0_15px_rgba(255,0,0,0.5)] active:scale-90"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Corpo Compacto com Valor Reposicionado */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-black text-white leading-tight uppercase truncate flex-1">
            {order.client}
          </h4>
          <span className="text-[10px] font-mono text-zinc-400 whitespace-nowrap mt-0.5">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value || 0)}
          </span>
        </div>
        <p className="text-[10px] text-zinc-500 line-clamp-1 leading-relaxed italic">
          {order.description}
        </p>
      </div>

      {/* Rodapé Dominante: Barra de Status Full-Width */}
      <div className="mt-auto pt-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className={cn(
              "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] border shadow-sm",
              isCompleted 
                ? "bg-[#00FF00] text-black border-[#00FF00]/20 shadow-[0_0_10px_rgba(0,255,0,0.2)]" 
                : "bg-primary text-black border-primary/20 shadow-[0_0_10px_rgba(255,95,31,0.2)]"
            )}>
              <span className="flex-1 text-center">{order.status}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white min-w-[200px] rounded-xl shadow-2xl z-[100]">
            {statusOptions.map((s) => (
              <DropdownMenuItem 
                key={s} 
                onClick={(e) => handleStatusClick(e as any, s)}
                className="text-[10px] uppercase font-bold tracking-widest focus:bg-primary focus:text-black p-3"
              >
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
