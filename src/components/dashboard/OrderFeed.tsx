
"use client"

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, ArrowRight, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';

export function OrderFeed() {
  const db = useFirestore();
  const { user } = useUser();

  const feedQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5));
  }, [db, user]);

  const { data: orders, isLoading } = useCollection(feedQuery);

  return (
    <Card className="glass border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <CardTitle className="text-sm font-semibold text-primary uppercase tracking-widest">Feed de Produção Cloud</CardTitle>
        <button className="p-1 hover:bg-secondary rounded">
          <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}
        
        {orders?.map((order) => (
          <div key={order.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl bg-secondary border border-border gap-4 group transition-all duration-300">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
                #{order.id.slice(-4).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-tight">{order.client}</h4>
                <p className="text-xs text-muted-foreground truncate max-w-[150px]">{order.items?.[0]?.desc || 'Sem descrição'}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between w-full md:w-auto md:gap-8">
              <div className="text-left md:text-right">
                <Badge variant="outline" className="border-primary/30 text-primary text-[10px] rounded-full px-3">
                  {order.status}
                </Badge>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalValue || 0)}
                </p>
              </div>
              <button className="p-2 bg-secondary hover:bg-primary hover:text-foreground rounded-lg transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {!isLoading && orders?.length === 0 && (
          <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest py-4">
            Nenhuma atividade registrada no banco
          </p>
        )}
      </CardContent>
    </Card>
  );
}
