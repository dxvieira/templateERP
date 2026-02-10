
"use client"

import React, { memo } from 'react';
import { 
  Calendar, 
  Trash2,
  CheckCircle,
  ChevronDown,
  User,
  Package
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
  value?: number; // Opcional agora, pois não será exibido
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
        .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : '--/--/--';

  return (
    <div 
      onClick={() => onClick?.(order)}
      className={cn(
        "group relative flex flex-col md:flex-row md:items-center justify-between cursor-pointer overflow-hidden transition-all duration-500",
        "bg-[#0D0D0D] rounded-[1.5rem] border border-white/5",
        "p-6 md:p-8 min-h-[120px] gap-6 hover:border-primary/40 hover:bg-[#111111]",
        "hover:shadow-[0_10px_40px_-10px_rgba(255,95,31,0.15)]",
        isCompleted && "opacity-50 grayscale-[0.3]"
      )}
    >
      {/* Coluna 1: Cliente e Descrição */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-mono text-zinc-600 tracking-widest uppercase">Protocolo #{order.id}</span>
        </div>
        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter truncate leading-tight">
          {order.client}
        </h2>
        <div className="flex items-center gap-2 text-zinc-500">
          <Package className="w-3 h-3 shrink-0" />
          <p className="text-xs uppercase tracking-widest truncate font-medium">
            {order.description || "Sem descrição técnica"}
          </p>
        </div>
      </div>

      {/* Coluna 2: Status e Prazo (Wide no Desktop) */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12 shrink-0">
        
        {/* Prazo de Entrega */}
        <div className="space-y-1">
          <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">Prazo Final</p>
          <div className="flex items-center gap-2 text-sm font-black text-white tracking-tight bg-white/5 px-4 py-2 rounded-xl border border-white/5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            {formattedDate}
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="min-w-[140px] space-y-1">
           <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">Etapa Atual</p>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="w-full flex items-center justify-between px-4 h-11 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all group/btn"
              >
                <span className="text-xs font-black text-primary uppercase tracking-[0.1em] truncate">{order.status}</span>
                <ChevronDown className="w-4 h-4 text-zinc-500 group-hover/btn:text-white transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-950 border-white/10 text-white min-w-[160px] rounded-xl p-2">
              {statusOptions.map((status) => (
                <DropdownMenuItem 
                  key={status} 
                  onClick={(e) => handleStatusChange(e as any, status)}
                  className="text-[10px] uppercase font-bold tracking-widest hover:bg-primary hover:text-black cursor-pointer rounded-lg px-3 py-2"
                >
                  {status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-2">
          {!isCompleted && (
            <button 
              onClick={handleConclude}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all active:scale-90 border border-primary/20"
              title="Concluir OS"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={handleDeleteClick}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all active:scale-90 border border-destructive/20"
            title="Excluir OS"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Glow Decorativo Lateral */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
