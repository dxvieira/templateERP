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

const chartData = [
  { status: "arte", visitors: 275, fill: "#D026FF" },
  { status: "impressao", visitors: 200, fill: "#3B82F6" },
  { status: "acabamento", visitors: 187, fill: "#FF5F1F" },
  { status: "concluido", visitors: 450, fill: "#06B6D4" },
]

const chartConfig = {
  visitors: {
    label: "Ordens",
  },
  arte: {
    label: "Arte",
    color: "hsl(var(--chart-1))",
  },
  impressao: {
    label: "Impressão",
    color: "hsl(var(--chart-2))",
  },
  acabamento: {
    label: "Acabamento",
    color: "hsl(var(--chart-3))",
  },
  concluido: {
    label: "Concluído",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig

export function ProductionChart() {
  const totalOrders = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0)
  }, [])

  return (
    <Card className="glass border-white/5 h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-sm font-semibold text-primary uppercase tracking-widest">Fluxo de Produção</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Distribuição atual de OS</CardDescription>
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
              strokeWidth={5}
              stroke="transparent"
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
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalOrders.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-[10px] uppercase tracking-widest"
                        >
                          Total Geral
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