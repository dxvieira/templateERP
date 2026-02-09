"use client"

import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  AlertCircle, 
  ArrowRight, 
  FileText, 
  CheckCircle2, 
  ChevronDown, 
  Check 
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
  isDelayed?: boolean;
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
        "flex flex-col rounded-2xl bg-white/5 border border-white/5 overflow-hidden group transition-all hover:-translate-y-1 cursor-pointer",
        isCompleted 
          ? "hover:border-[#00FF00]/50 hover:shadow-[0_0_20px_rgba(0,255,0,0.2)] opacity-80 hover:opacity-100" 
          : "hover:border-primary/50 hover:shadow-[0_0_20px_rgba(255,95,31,0.2)]"
      )}
    >
      {/* Cabeçalho do Card */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className={cn(
            "text-[10px] font-black px-2 py-0.5 rounded border uppercase",
            isCompleted 
              ? "border-[#00FF00]/30 text-[#00FF00] bg-[#00FF00]/5" 
              : "border-primary/30 text-primary bg-primary/5"
          )}>
            #{order.id.slice(-4).toUpperCase()}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
            <Calendar className="w-3 h-3" />
            {order.deliveryDate || 'N/A'}
          </div>
        </div>
        
        {!isCompleted && (
          <button 
            onClick={handleConcludeClick}
            className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#00FF00] hover:text-black transition-all group/check"
            title="Concluir Instantaneamente"
          >
            <Check className="w-3 h-3" />
          </button>
        )}
        
        {isCompleted && (
          <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF00]" />
        )}
      </div>

      {/* Corpo do Card */}
      <div className="p-4 space-y-4">
        <div>
          <h4 className="font-black text-white uppercase tracking-tight text-sm line-clamp-1">
            {order.client}
          </h4>
          <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest mt-0.5">
            {order.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Badge variant="outline" className={cn(
                "text-[9px] rounded-full px-3 py-1 font-black uppercase tracking-tighter cursor-pointer flex items-center gap-1 transition-all",
                isCompleted 
                  ? "border-[#00FF00] text-[#00FF00] bg-[#00FF00]/5 hover:bg-[#00FF00]/10" 
                  : "border-primary text-primary bg-primary/5 hover:bg-primary/10"
              )}>
                {order.status}
                <ChevronDown className="w-2.5 h-2.5 opacity-50" />
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white min-w-[140px]">
              {statusOptions.map((s) => (
                <DropdownMenuItem 
                  key={s} 
                  onClick={(e) => handleStatusClick(e as any, s)}
                  className="text-[10px] uppercase font-bold tracking-widest focus:bg-primary focus:text-black"
                >
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="text-right">
            <p className="text-xs font-mono font-black text-white">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
            </p>
          </div>
        </div>
      </div>

      {/* Rodapé do Card */}
      <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between gap-2 group/footer bg-white/[0.01]">
        <button className="text-[9px] font-black uppercase text-muted-foreground hover:text-white transition-colors flex items-center gap-1.5">
          <FileText className="w-3 h-3" />
          Editar Protocolo
        </button>
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          isCompleted 
            ? "bg-[#00FF00]/10 text-[#00FF00] group-hover/footer:bg-[#00FF00] group-hover/footer:text-black" 
            : "bg-primary/10 text-primary group-hover/footer:bg-primary group-hover/footer:text-black"
        )}>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
