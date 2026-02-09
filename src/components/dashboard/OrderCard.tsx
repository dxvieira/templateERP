"use client"

import React, { memo } from 'react';
import { 
  Calendar, 
  Trash2,
  CheckCircle,
  ChevronDown
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
  const isCompleted = order.status === 'Concluído' || order.status === 'Entregue';

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (onDelete) {
      onDelete(order.id);
    }
  };

  const handleStatusChange = (e: React.MouseEvent, status: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onStatusChange) {
      onStatusChange(order.id, status);
    }
  };

  const handleConclude = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickConclude) {
      onQuickConclude(order.id);
    }
  };

  const formattedDate = order.deliveryDate 
    ? new Date(order.deliveryDate.includes('T') ? order.deliveryDate : order.deliveryDate + 'T12:00:00')
        .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : '--/--';

  return (
    <div 
      onClick={() => onClick?.(order)}
      className={cn(
        "group relative flex flex-col justify-between cursor-pointer overflow-hidden transition-all duration-200",
        "bg-[#111111] rounded-xl border border-white/5",
        "p-3 min-h-[140px] hover:border-primary/50",
        isCompleted && "opacity-60 grayscale-[0.5]"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-mono text-zinc-500 tracking-wider">#{order.id}</span>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-2.5 h-2.5 text-primary" />
          <span className="text-[10px] font-bold text-white">{formattedDate}</span>
          {!isCompleted && (
            <button 
              onClick={handleConclude}
              className="ml-1 p-1 rounded-md text-zinc-600 hover:text-green-500 hover:bg-green-500/10 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 mb-3">
        <h2 className="text-[11px] font-black text-white uppercase tracking-tight truncate leading-none mb-1">
          {order.client}
        </h2>
        <p className="text-[9px] text-zinc-500 truncate whitespace-nowrap">
          {order.description || "Sem descrição"}
        </p>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <div className="flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="w-full flex items-center justify-between px-2 h-7 bg-white/5 hover:bg-white/10 rounded-md border border-white/5 transition-colors"
              >
                <span className="text-[9px] font-bold text-primary uppercase tracking-widest truncate">{order.status}</span>
                <ChevronDown className="w-2.5 h-2.5 text-zinc-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-950 border-white/10 text-white min-w-[120px]">
              {statusOptions.map((status) => (
                <DropdownMenuItem 
                  key={status} 
                  onClick={(e) => handleStatusChange(e as any, status)}
                  className="text-[9px] uppercase font-bold tracking-widest hover:bg-primary hover:text-black cursor-pointer"
                >
                  {status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button 
          onClick={handleDeleteClick}
          className="p-1.5 rounded-md text-zinc-700 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95"
          title="Excluir OS"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';