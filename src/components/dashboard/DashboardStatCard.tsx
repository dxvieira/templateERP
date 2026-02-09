
"use client"

import React from 'react';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  subtext?: string;
}

export function DashboardStatCard({ label, value, icon: Icon, subtext }: StatCardProps) {
  return (
    <Card className="glass-card p-4 md:p-5 flex flex-col gap-3 md:gap-4 neon-hover-orange cursor-default h-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 shrink-0">
          <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
        </div>
        <span className="text-[8px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">{label}</span>
      </div>
      <div className="min-w-0">
        <h3 className="text-xl md:text-3xl font-bold tracking-tighter text-white whitespace-nowrap truncate">{value}</h3>
        {subtext && <p className="text-[8px] md:text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter whitespace-nowrap truncate">{subtext}</p>}
      </div>
    </Card>
  );
}
