
"use client"

import React, { useState, useMemo } from 'react';
import { Sparkles, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { predictDelayWarnings, PredictDelayWarningsOutput } from '@/ai/flows/predictive-delay-warnings';

interface PredictivePanelProps {
  orders?: any[];
}

export function PredictivePanel({ orders = [] }: PredictivePanelProps) {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictDelayWarningsOutput | null>(null);

  const productionData = useMemo(() => ({
    productionVelocity: 10, // Meta base de 10 pedidos/dia
    orders: orders.map(o => ({
      id: o.id,
      client: o.client,
      status: o.status,
      deliveryDate: o.deliveryDate,
      value: o.totalValue || 0
    }))
  }), [orders]);

  const handlePredict = async () => {
    if (orders.length === 0) return;
    setLoading(true);
    try {
      const result = await predictDelayWarnings(productionData);
      setPrediction(result);
    } catch (error) {
      console.error("AI Prediction failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass border-primary/30 h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold text-primary uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          IA Preditiva de Fluxo
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {!prediction && !loading && (
          <div className="text-center py-6">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">
              Analise sua fila de produção em tempo real para identificar riscos de atraso antes que ocorram.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-[10px] text-muted-foreground animate-pulse uppercase tracking-widest">Processando análise neural...</p>
          </div>
        )}

        {prediction && !loading && (
          <div className="space-y-3">
            {prediction.delayedOrders.length > 0 ? (
              prediction.delayedOrders.map((p) => (
                <div key={p.id} className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[10px] font-bold text-primary uppercase">#{p.id.slice(-4)} - Risco Identificado</h5>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{p.reason}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center py-6 gap-2">
                <CheckCircle className="text-primary w-8 h-8" />
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Fluxo Nominal Seguro</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          onClick={handlePredict} 
          disabled={loading || orders.length === 0}
          className="w-full bg-primary text-black hover:bg-primary/80 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl"
        >
          {loading ? 'Analisando...' : 'Prever Atrasos'}
        </Button>
      </CardFooter>
    </Card>
  );
}
