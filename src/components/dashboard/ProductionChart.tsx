
"use client"

import * as React from "react"
import { Pie, PieChart, Cell, Label } from "recharts"
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

interface ProductionChartProps {
  orders?: any[] | null;
}

const chartConfig = {
  visitors: {
    label: "Ordens",
  },
  arte: {
    label: "Arte",
    color: "#D026FF",
  },
  impressao: {
    label: "Impressão",
    color: "#3B82F6",
  },
  serralheria: {
    label: "Serralheria",
    color: "#FACC15",
  },
  acabamento: {
    label: "Acabamento",
    color: "#FF5F1F",
  },
  instalacao: {
    label: "Instalação",
    color: "#EF4444",
  },
  concluido: {
    label: "Concluído",
    color: "#06B6D4",
  },
} satisfies ChartConfig

export function ProductionChart({ orders = [] }: ProductionChartProps) {
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
      { status: "arte", visitors: counts["Arte"], fill: chartConfig.arte.color },
      { status: "impressao", visitors: counts["Impressão"], fill: chartConfig.impressao.color },
      { status: "serralheria", visitors: counts["Serralheria"], fill: chartConfig.serralheria.color },
      { status: "acabamento", visitors: counts["Acabamento"], fill: chartConfig.acabamento.color },
      { status: "instalacao", visitors: counts["Instalação"], fill: chartConfig.instalacao.color },
      { status: "concluido", visitors: counts["Concluído"] + counts["Entregue"], fill: chartConfig.concluido.color },
    ].filter(item => item.visitors > 0);
  }, [orders]);

  const totalOrders = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0)
  }, [chartData]);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-full w-full bg-white/5 animate-pulse rounded-xl" />;

  return (
    <div className="flex flex-col h-full bg-transparent">
      <CardHeader className="items-center pb-0 space-y-1">
        <CardTitle className="text-[10px] font-black text-primary uppercase tracking-[0.4em] whitespace-nowrap">
          Inteligência de Fluxo
        </CardTitle>
        <CardDescription className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium opacity-60">
          Distribuição Global de OS
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 flex items-center justify-center">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px] w-full"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="visitors"
              nameKey="status"
              innerRadius={65}
              strokeWidth={8}
              stroke="#0F0F0F"
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-white text-4xl font-black tracking-tighter"
                        >
                          {totalOrders.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black"
                        >
                          Total
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      
      {/* Legenda Customizada para Densidade */}
      <div className="px-6 pb-6 grid grid-cols-2 gap-2">
        {chartData.map((item) => (
          <div key={item.status} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className="text-[8px] uppercase font-black text-zinc-500 tracking-widest truncate">
              {chartConfig[item.status as keyof typeof chartConfig]?.label}: {item.visitors}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
