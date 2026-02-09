"use client"

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, ArrowRight } from 'lucide-react';

const recentOrders = [
  { id: 'OS-8901', client: 'Posto Central', product: 'Lona Frontlight 4x2m', status: 'Impressão', progress: 65, value: 'R$ 750,00', date: 'Hoje' },
  { id: 'OS-8902', client: 'Barbearia VIP', product: 'Letreiro Acrílico 3D', status: 'Arte', progress: 30, value: 'R$ 2.400,00', date: 'Hoje' },
  { id: 'OS-8903', client: 'Eventos Brilho', product: 'Adesivação de Frota', status: 'Acabamento', progress: 90, value: 'R$ 5.120,00', date: 'Ontem' },
  { id: 'OS-8904', client: 'Padaria Alfa', product: 'Cardápios PVC 20 un', status: 'Concluído', progress: 100, value: 'R$ 450,00', date: 'Ontem' },
];

export function OrderFeed() {
  return (
    <Card className="glass border-white/5">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <CardTitle className="text-sm font-semibold text-primary uppercase tracking-widest">Feed de Produção</CardTitle>
        <button className="p-1 hover:bg-white/5 rounded">
          <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentOrders.map((order) => (
          <div key={order.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 gap-4 group hover:neon-border-purple transition-all duration-300">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
                #{order.id.split('-')[1]}
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-tight">{order.client}</h4>
                <p className="text-xs text-muted-foreground">{order.product}</p>
              </div>
            </div>
            
            <div className="flex flex-1 items-center gap-4 w-full px-2">
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary shadow-[0_0_10px_rgba(208,38,255,0.6)] transition-all duration-1000" 
                  style={{ width: `${order.progress}%` }} 
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-primary">{order.progress}%</span>
            </div>

            <div className="flex items-center justify-between w-full md:w-auto md:gap-8">
              <div className="text-left md:text-right">
                <Badge variant="outline" className="border-primary/30 text-primary text-[10px] rounded-full px-3">
                  {order.status}
                </Badge>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">{order.value}</p>
              </div>
              <button className="p-2 bg-white/5 hover:bg-primary hover:text-white rounded-lg transition-colors group-hover:translate-x-1">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}