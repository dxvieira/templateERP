
"use client"

import React, { memo } from 'react';
import { 
  Calendar, 
  Check, 
  ChevronDown, 
  PackageCheck,
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
    e.stopPropagation(); 
    onStatusChange?.(order.id, status);
  };

  const handleConcludeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    onQuickConclude?.(order.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
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
        "group relative flex flex-col rounded-[2rem] bg-[#121212] border border-zinc-800/50 p-6 transition-all duration-300 cursor-pointer overflow-hidden min-h-[220px] gap-y-5",
        "hover:scale-[1.02] hover:bg-[#161616] will-change-transform",
        isCompleted 
          ? "hover:border-[#00FF00] hover:shadow-[0_0_30px_-5px_rgba(0,255,0,0.3)]" 
          : "hover:border-primary hover:shadow-[0_0_30px_-5px_rgba(255,95,31,0.3)]"
      )}
    >
      <div className={cn(
        "absolute -right-10 -top-10 w-32 h-32 blur-[80px] opacity-10 transition-opacity group-hover:opacity-25",
        isCompleted ? "bg-[#00FF00]" : "bg-primary"
      )} />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 opacity-50">
          <Hash className="w-3 h-3 text-zinc-400" />
          <span className="text-[10px] font-black tracking-widest uppercase">
            {order.id}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {!isCompleted ? (
            <button 
              onClick={handleConcludeClick}
              title="Concluir Pedido"
              className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 transition-all hover:bg-[#00FF00] hover:text-black hover:border-[#00FF00] hover:shadow-[0_0_15px_rgba(0,255,0,0.4)] active:scale-90"
            >
              <Check className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#00FF00]/10 flex items-center justify-center text-[#00FF00] border border-[#00FF00]/20">
              <PackageCheck className="w-5 h-5" />
            </div>
          )}
          
          <button 
            onClick={handleDeleteClick}
            title="Excluir Pedido"
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 transition-all hover:bg-destructive hover:text-white hover:border-destructive hover:shadow-[0_0_15px_rgba(255,0,0,0.4)] active:scale-90 z-10"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-3 flex-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-primary">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-black uppercase tracking-widest">
              Entrega: {order.deliveryDate ? (
                new Date(order.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
              ) : 'Não definida'}
            </span>
          </div>
          <h4 className="text-2xl font-black text-white leading-tight uppercase tracking-tighter">
            {order.client}
          </h4>
        </div>
        
        <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-3">
          <p className="text-xs text-zinc-500 italic line-clamp-2 max-w-[70%]">
            {order.description}
          </p>
          <span className="text-lg font-black text-white/90 font-mono">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value || 0)}
          </span>
        </div>
      </div>

      <div className="mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className={cn(
              "w-full flex items-center justify-between px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all active:scale-[0.98] border shadow-lg group/btn",
              isCompleted 
                ? "bg-[#00FF00] text-black border-[#00FF00]/20 shadow-[0_0_20px_rgba(0,255,0,0.1)]" 
                : "bg-primary text-black border-primary/20 shadow-[0_0_20px_rgba(255,95,31,0.1)]"
            )}>
              <span className="flex-1 text-center">{order.status}</span>
              <ChevronDown className="w-4 h-4 opacity-50 group-hover/btn:translate-y-0.5 transition-transform" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="center"
            className="bg-zinc-900 border-zinc-800 text-white min-w-[240px] rounded-2xl shadow-2xl z-[100] p-1"
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
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
