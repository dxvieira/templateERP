
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
    <Card className="glass-card p-5 flex flex-col gap-4 neon-hover-orange cursor-default">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
      </div>
      <div>
        <h3 className="text-3xl font-bold tracking-tighter text-white">{value}</h3>
        {subtext && <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter">{subtext}</p>}
      </div>
    </Card>
  );
}
