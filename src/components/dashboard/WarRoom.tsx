
"use client"

import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WarRoomProps {
  orders?: any[];
}

export function WarRoom({ orders = [] }: WarRoomProps) {
  // Filtra ordens marcadas como atrasadas ou com data de entrega passada
  const delayedOrders = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return orders.filter(order => order.isDelayed || (order.deliveryDate < today && order.status !== 'Entregue'));
  }, [orders]);

  return (
    <Card className="glass border-secondary/30 h-full overflow-hidden">
      <CardHeader className="bg-secondary/10 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold neon-text-orange uppercase tracking-widest flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary animate-pulse" />
            War Room - Atrasos
          </CardTitle>
          <Badge variant="destructive" className="bg-primary text-black hover:bg-primary/80 rounded-full text-[10px] font-black">
            {delayedOrders.length} CRÍTICOS
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-white/5">
          {delayedOrders.length > 0 ? (
            delayedOrders.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between group hover:bg-white/5 transition-colors">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-tight">#{order.id.slice(-4)}</span>
                    <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase">{order.status}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{order.client}</span>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-primary font-bold text-xs">
                    <Clock className="w-3 h-3" />
                    ATRASADO
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue || 0)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Nenhum protocolo em atraso crítico</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
