"use client"

import React from 'react';
import { Palette, Printer, Hammer, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

const kpis = [
  { 
    label: 'Arte Final', 
    value: '12', 
    icon: Palette, 
    color: 'text-purple-400', 
    bg: 'bg-purple-400/10',
    border: 'border-purple-500/30'
  },
  { 
    label: 'Impressão', 
    value: '08', 
    icon: Printer, 
    color: 'text-blue-400', 
    bg: 'bg-blue-400/10',
    border: 'border-blue-500/30'
  },
  { 
    label: 'Acabamento', 
    value: '05', 
    icon: Hammer, 
    color: 'text-orange-400', 
    bg: 'bg-orange-400/10',
    border: 'border-orange-500/30'
  },
  { 
    label: 'Concluído', 
    value: '24', 
    icon: CheckCircle2, 
    color: 'text-cyan-400', 
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-500/30'
  },
];

export function KPISection() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className={`glass p-5 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 ${kpi.border}`}>
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${kpi.bg}`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{kpi.label}</span>
          </div>
          <div>
            <h3 className="text-3xl font-bold tracking-tighter">{kpi.value}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Status em tempo real</p>
          </div>
        </Card>
      ))}
    </div>
  );
}