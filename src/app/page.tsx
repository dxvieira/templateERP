
"use client"

import React from 'react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { ProductionChart } from '@/components/dashboard/ProductionChart';
import { WarRoom } from '@/components/dashboard/WarRoom';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { motion } from 'framer-motion';
import { Palette, Printer, Hammer, CheckCircle2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

const mockOrders = [
  { id: '8901', client: 'Posto Central', description: 'Lona Frontlight 4x2m', status: 'Impressão', deliveryDate: '24 Out', value: 750 },
  { id: '8902', client: 'Barbearia VIP', description: 'Letreiro Acrílico 3D', status: 'Arte', deliveryDate: '25 Out', value: 2400 },
  { id: '8903', client: 'Eventos Brilho', description: 'Adesivação de Frota', status: 'Acabamento', deliveryDate: '23 Out', value: 5120, isDelayed: true },
];

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase">Central de Comando</h2>
            <p className="text-muted-foreground text-xs uppercase tracking-widest">Operação em tempo real • VisComm ERP</p>
          </div>
          
          <Button 
            onClick={() => router.push('/orders/new')}
            className="bg-primary text-black font-black uppercase tracking-widest px-6 h-12 rounded-xl hover:shadow-[0_0_20px_rgba(255,95,31,0.6)] hover:bg-primary transition-all gap-2"
          >
            <Plus className="w-5 h-5" />
            Novo Pedido
          </Button>
        </div>

        {/* KPIs Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardStatCard label="Arte Final" value="12" icon={Palette} subtext="Ordens em criação" />
          <DashboardStatCard label="Impressão" value="08" icon={Printer} subtext="Fila de produção" />
          <DashboardStatCard label="Acabamento" value="05" icon={Hammer} subtext="Fase final" />
          <DashboardStatCard label="Concluído" value="24" icon={CheckCircle2} subtext="Pronto para entrega" />
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column - Feed */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="glass-card border-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-primary uppercase tracking-[0.3em]">Monitor de Ordens</CardTitle>
                <div className="flex gap-2">
                   <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                   <span className="text-[10px] text-primary font-bold">LIVE FEED</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Analytics & Alerts */}
          <div className="lg:col-span-4 space-y-6">
            <div className="h-[350px]">
              <ProductionChart />
            </div>
            <div className="h-[400px]">
              <WarRoom />
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="pt-8 border-t border-white/5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] text-center md:text-left">
            © 2025 VisComm System • Todos os processos rastreados
          </p>
        </div>
      </main>
    </div>
  );
}
