"use client"

import React from 'react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { KPISection } from '@/components/dashboard/KPISection';
import { ProductionChart } from '@/components/dashboard/ProductionChart';
import { WarRoom } from '@/components/dashboard/WarRoom';
import { OrderFeed } from '@/components/dashboard/OrderFeed';
import { PredictivePanel } from '@/components/dashboard/PredictivePanel';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Central de Comando</h2>
            <p className="text-muted-foreground text-sm">Dashboard operacional em tempo real • 24 Out 2025</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Status do Servidor</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-cyan-400">OPERACIONAL</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* KPIs Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <KPISection />
        </motion.div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column - Feed */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-8 space-y-6"
          >
            <OrderFeed />
          </motion.div>

          {/* Right Column - Analytics & Alerts */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-4 space-y-6"
          >
            <div className="h-[350px]">
              <ProductionChart />
            </div>
            <div className="h-[350px]">
              <PredictivePanel />
            </div>
            <div className="h-[350px]">
              <WarRoom />
            </div>
          </motion.div>

        </div>

        {/* Footer info */}
        <div className="pt-8 text-center md:text-left">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
            © 2025 VisComm Command Center • Inteligência Artificial aplicada à Comunicação Visual
          </p>
        </div>
      </main>
    </div>
  );
}