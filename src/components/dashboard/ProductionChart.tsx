
"use client"

import * as React from "react"
import { Pie, PieChart, Cell, Label } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  acabamento: {
    label: "Acabamento",
    color: "#FF5F1F",
  },
  concluido: {
    label: "Concluído",
    color: "#06B6D4",
  },
} satisfies ChartConfig

export function ProductionChart({ orders = [] }: ProductionChartProps) {
  const chartData = React.useMemo(() => {
    const counts = {
      Arte: 0,
      Impressão: 0,
      Acabamento: 0,
      Entregue: 0,
    };

    if (!orders) {
      return [
        { status: "arte", visitors: 0, fill: chartConfig.arte.color },
        { status: "impressao", visitors: 0, fill: chartConfig.impressao.color },
        { status: "acabamento", visitors: 0, fill: chartConfig.acabamento.color },
        { status: "concluido", visitors: 0, fill: chartConfig.concluido.color },
      ];
    }

    orders.forEach((order) => {
      const status = order.status as keyof typeof counts;
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });

    return [
      { status: "arte", visitors: counts["Arte"], fill: chartConfig.arte.color },
      { status: "impressao", visitors: counts["Impressão"], fill: chartConfig.impressao.color },
      { status: "acabamento", visitors: counts["Acabamento"], fill: chartConfig.acabamento.color },
      { status: "concluido", visitors: counts["Entregue"], fill: chartConfig.concluido.color },
    ];
  }, [orders]);

  const totalOrders = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0)
  }, [chartData]);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-[300px] w-full bg-white/5 animate-pulse rounded-xl" />;

  return (
    <Card className={cn("glass transition-all duration-500 neon-glow-primary overflow-hidden")}>
      <CardHeader className="items-center pb-0 space-y-1">
        <CardTitle className="text-sm md:text-base font-black text-primary uppercase tracking-[0.4em] whitespace-nowrap">
          Fluxo de Produção
        </CardTitle>
        <CardDescription className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium opacity-60">
          Distribuição real de OS
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
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
              innerRadius={60}
              strokeWidth={8}
              stroke="#0A0A0A"
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
                          className="fill-white text-3xl md:text-4xl font-black tracking-tighter"
                        >
                          {totalOrders.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-[8px] md:text-[10px] uppercase tracking-[0.2em] font-bold"
                        >
                          Protocolos
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
    </Card>
  )
}
