"use client"

import React, { memo } from 'react';
import { 
  Calendar, 
  Check, 
  ChevronDown, 
  PackageCheck,
  Clock
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
}

const statusOptions = ['Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação', 'Concluído'];

export const OrderCard = memo(({ order, onClick, onStatusChange, onQuickConclude }: OrderCardProps) => {
  const isCompleted = order.status === 'Entregue' || order.status === 'Concluído';

  const handleStatusClick = (e: React.MouseEvent, status: string) => {
    e.stopPropagation();
    onStatusChange?.(order.id, status);
  };

  const handleConcludeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickConclude?.(order.id);
  };

  return (
    <div 
      onClick={() => onClick?.(order)}
      className={cn(
        "group relative flex flex-col rounded-3xl bg-[#121212] border border-zinc-800/50 p-5 transition-all duration-300 cursor-pointer overflow-hidden",
        "hover:scale-[1.02] hover:bg-[#161616]",
        isCompleted 
          ? "hover:border-[#00FF00] hover:shadow-[0_0_30px_-10px_rgba(0,255,0,0.5)]" 
          : "hover:border-primary hover:shadow-[0_0_30px_-10px_rgba(255,95,31,0.5)]"
      )}
    >
      {/* Background Decorativo */}
      <div className={cn(
        "absolute -right-12 -top-12 w-32 h-32 blur-[80px] opacity-10 transition-opacity group-hover:opacity-20",
        isCompleted ? "bg-[#00FF00]" : "bg-primary"
      )} />

      {/* Cabeçalho: ID e Botão Check */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase">
          ID #{order.id.slice(-4).toUpperCase()}
        </span>
        
        {!isCompleted ? (
          <button 
            onClick={handleConcludeClick}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 transition-all hover:bg-primary hover:text-black hover:border-primary active:scale-90"
            title="Concluir OS"
          >
            <Check className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#00FF00]/10 flex items-center justify-center text-[#00FF00]">
            <PackageCheck className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Destaque Central: Data de Entrega */}
      <div className="flex flex-col items-center justify-center py-2 mb-6 border-y border-zinc-800/30">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className={cn("w-3.5 h-3.5", isCompleted ? "text-[#00FF00]" : "text-primary")} />
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Entrega prevista</span>
        </div>
        <div className="text-2xl font-black text-white tracking-tighter">
          {order.deliveryDate ? (
            new Date(order.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
          ) : 'N/A'}
        </div>
      </div>

      {/* Corpo: Cliente e Descrição */}
      <div className="flex-1 space-y-1 mb-8">
        <h4 className="text-lg font-black text-white leading-tight uppercase truncate">
          {order.client}
        </h4>
        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
          {order.description}
        </p>
      </div>

      {/* Rodapé: Seletor (Badge) e Valor */}
      <div className="flex items-end justify-between gap-4 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
              isCompleted 
                ? "bg-[#00FF00] text-black shadow-[0_0_15px_rgba(0,255,0,0.3)]" 
                : "bg-primary text-black shadow-[0_0_15px_rgba(255,95,31,0.3)]"
            )}>
              {order.status}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white min-w-[140px] rounded-xl shadow-2xl">
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

        <div className="text-right">
          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Total</div>
          <div className="text-xl font-black text-white tracking-tighter">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
          </div>
        </div>
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
