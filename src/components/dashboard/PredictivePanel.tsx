"use client"

import React, { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { predictDelayWarnings, PredictDelayWarningsOutput } from '@/ai/flows/predictive-delay-warnings';

// Mock data to simulate production metrics
const MOCK_PRODUCTION_DATA = {
  productionVelocity: 15,
  orders: [
    { id: 'OS-8901', client: 'Posto Central', status: 'Impressão', deliveryDate: '2025-05-20', value: 750 },
    { id: 'OS-8902', client: 'Barbearia VIP', status: 'Arte', deliveryDate: '2025-05-18', value: 2400 },
    { id: 'OS-8903', client: 'Eventos Brilho', status: 'Acabamento', deliveryDate: '2025-05-22', value: 5120 },
  ]
};

export function PredictivePanel() {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictDelayWarningsOutput | null>(null);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const result = await predictDelayWarnings(MOCK_PRODUCTION_DATA);
      setPrediction(result);
    } catch (error) {
      console.error("Prediction failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass border-primary/30 h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold neon-text-purple uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          IA Preditiva de Atrasos
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {!prediction && !loading && (
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground px-4">
              Analise a velocidade da sua produção e identifique gargalos antes que aconteçam.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground animate-pulse">Consultando oráculo de produção...</p>
          </div>
        )}

        {prediction && !loading && (
          <div className="space-y-3">
            {prediction.delayedOrders.length > 0 ? (
              prediction.delayedOrders.map((p) => (
                <div key={p.id} className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-orange-500">{p.id} - Risco de Atraso</h5>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{p.reason}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center py-6 gap-2">
                <CheckCircle className="text-cyan-400 w-8 h-8" />
                <p className="text-xs font-medium text-cyan-400">Tudo sob controle. Fluxo nominal.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          onClick={handlePredict} 
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/80 shadow-[0_0_15px_rgba(208,38,255,0.4)]"
        >
          {loading ? 'Processando...' : 'Prever Atrasos'}
        </Button>
      </CardFooter>
    </Card>
  );
}