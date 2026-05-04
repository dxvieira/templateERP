
"use client"

import * as React from "react"
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts"
import {
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"

interface ProductionChartProps {
  orders?: any[] | null;
}

const chartConfig = {
  arte: {
    label: "Arte",
    color: "#d946ef",
  },
  impressao: {
    label: "Impressão",
    color: "#3b82f6",
  },
  serralheria: {
    label: "Serralheria",
    color: "#eab308",
  },
  acabamento: {
    label: "Acabamento",
    color: "#f97316",
  },
  instalacao: {
    label: "Instalação",
    color: "#a855f7",
  },
  concluido: {
    label: "Concluído",
    color: "#10b981",
  },
} satisfies ChartConfig

export function ProductionChart({ orders = [] }: ProductionChartProps) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const chartData = React.useMemo(() => {
    const counts: Record<string, number> = {
      'Arte': 0,
      'Impressão': 0,
      'Serralheria': 0,
      'Acabamento': 0,
      'Instalação': 0,
      'Concluído': 0,
      'Entregue': 0,
    };

    if (!orders) return [];

    orders.forEach((order) => {
      const status = order.status;
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });

    return [
      { name: "Arte", value: counts["Arte"], color: chartConfig.arte.color },
      { name: "Impressão", value: counts["Impressão"], color: chartConfig.impressao.color },
      { name: "Serralheria", value: counts["Serralheria"], color: chartConfig.serralheria.color },
      { name: "Acabamento", value: counts["Acabamento"], color: chartConfig.acabamento.color },
      { name: "Instalação", value: counts["Instalação"], color: chartConfig.instalacao.color },
      { name: "Concluído", value: counts["Concluído"] + counts["Entregue"], color: chartConfig.concluido.color },
    ].filter(item => item.value > 0);
  }, [orders]);

  const totalOrders = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0)
  }, [chartData]);

  const onPieEnter = (_: any, index: number) => setActiveIndex(index);
  const onPieLeave = () => setActiveIndex(null);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-[300px] w-full bg-secondary animate-pulse rounded-xl" />;

  return (
    <div className="flex flex-col h-full bg-transparent">
      <CardHeader className="items-center pb-2 space-y-1">
        <CardTitle className="text-[10px] font-black text-primary uppercase tracking-[0.4em] whitespace-nowrap">
          Inteligência de Fluxo
        </CardTitle>
        <CardDescription className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium opacity-60">
          Monitoramento em Tempo Real
        </CardDescription>
      </CardHeader>
      
      <div className="relative w-full h-[300px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={100}
              cornerRadius={10}
              paddingAngle={4}
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              stroke="none"
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  fillOpacity={activeIndex === index || activeIndex === null ? 1 : 0.3}
                  style={{
                    filter: activeIndex === index ? `drop-shadow(0px 0px 12px ${entry.color})` : 'none',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={() => null} cursor={false} />
          </PieChart>
        </ResponsiveContainer>

        {/* O TEXTO CENTRAL MÁGICO E ABSOLUTO */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          {activeIndex !== null ? (
            <div className="animate-in fade-in zoom-in duration-300">
              <span 
                className="text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
                style={{ color: chartData[activeIndex].color }}
              >
                {chartData[activeIndex].name}
              </span>
              <div className="text-5xl font-black text-foreground leading-none my-1 tracking-tighter">
                {chartData[activeIndex].value}
              </div>
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                {totalOrders > 0 ? Math.round((chartData[activeIndex].value / totalOrders) * 100) : 0}% do Fluxo
              </span>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Total</span>
              <div className="text-6xl font-black text-foreground leading-none my-1 tracking-tighter">
                {totalOrders}
              </div>
              <span className="text-[9px] text-primary font-black uppercase tracking-[0.2em] flex items-center justify-center gap-1">
                <span className="w-1 h-1 rounded-full bg-primary animate-pulse" /> Protocolos
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Legenda Customizada Minimalista */}
      <div className="px-6 pb-6 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {chartData.map((item, index) => (
          <div 
            key={index} 
            className="flex items-center gap-1.5 transition-opacity"
            style={{ opacity: activeIndex === index || activeIndex === null ? 1 : 0.4 }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }} />
            <span className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
