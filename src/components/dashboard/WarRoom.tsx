"use client"

import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const delayedOrders = [
  { id: 'OS-8821', client: 'Restaurante Sabor', value: 'R$ 1.250', delay: '2 dias', status: 'Impressão' },
  { id: 'OS-8845', client: 'Mega Store LTDA', value: 'R$ 4.800', delay: '5 horas', status: 'Arte' },
  { id: 'OS-8890', client: 'Tech Solutions', value: 'R$ 890', delay: '1 dia', status: 'Acabamento' },
];

export function WarRoom() {
  return (
    <Card className="glass border-secondary/30 h-full overflow-hidden">
      <CardHeader className="bg-secondary/10 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold neon-text-orange uppercase tracking-widest flex items-center gap-2">
            <AlertCircle className="w-4 h-4 animate-pulse-neon" />
            War Room - Atrasos
          </CardTitle>
          <Badge variant="destructive" className="bg-secondary hover:bg-secondary/80 rounded-full text-[10px]">
            {delayedOrders.length} CRÍTICOS
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-white/5">
          {delayedOrders.map((order) => (
            <div key={order.id} className="p-4 flex items-center justify-between group hover:bg-white/5 transition-colors">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight">{order.id}</span>
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{order.status}</span>
                </div>
                <span className="text-xs text-muted-foreground">{order.client}</span>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-secondary font-bold text-xs">
                  <Clock className="w-3 h-3" />
                  {order.delay}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{order.value}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}