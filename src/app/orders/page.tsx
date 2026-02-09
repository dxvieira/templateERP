'use client';

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { useOrders } from '@/hooks/use-orders';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, FileText, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Minimalist schema: only client is strictly required.
const schema = z.object({
  client: z.string().min(1, 'Nome do cliente é obrigatório'),
  deliveryDate: z.string().optional().default(''),
  seller: z.string().optional().default('Carlos'),
  status: z.string().optional().default('Arte'),
  paymentMethod: z.string().optional().default('Pix'),
  observations: z.string().optional().default(''),
  items: z.array(z.object({
    desc: z.string().optional().default(''),
    size: z.string().optional().default(''),
    quantity: z.coerce.number().default(1),
    unitValue: z.coerce.number().default(0),
  })).default([{ desc: '', size: '', quantity: 1, unitValue: 0 }]),
});

type FormValues = z.infer<typeof schema>;

export default function OrdersPage() {
  const [open, setOpen] = useState(false);
  const { firestore } = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { orders, isLoading } = useOrders();

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client: '',
      deliveryDate: '',
      status: 'Arte',
      seller: 'Carlos',
      paymentMethod: 'Pix',
      items: [{ desc: '', size: '', quantity: 1, unitValue: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: 'items' });

  const total = useMemo(() => {
    return watchedItems?.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitValue || 0)), 0) || 0;
  }, [watchedItems]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore || !user) {
      toast({ variant: "destructive", title: "Acesso negado", description: "Você precisa estar logado." });
      return;
    }

    try {
      // Create a document reference first to get the ID
      const orderRef = doc(collection(firestore, 'orders'));
      
      const payload = {
        ...data,
        id: orderRef.id, // CRITICAL: Field 'id' must match doc ID for security rules
        totalValue: total,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPriority: false,
        isDelayed: false
      };

      // Non-blocking write for instant UI feedback
      setDocumentNonBlocking(orderRef, payload, { merge: true });

      toast({ title: "Sucesso!", description: "Ordem de serviço registrada." });
      setOpen(false);
      reset();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      toast({ variant: "destructive", title: "Erro no Servidor", description: "Não foi possível salvar a OS." });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <FileText className="text-primary" /> Histórico de Protocolos
          </h2>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-black font-black uppercase tracking-widest px-6 h-12 rounded-xl active:scale-95 transition-all">
                <Plus className="w-5 h-5 mr-2" /> Lançar Nova OS
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 text-white rounded-3xl overflow-hidden p-0 shadow-2xl">
              <DialogHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
                <DialogTitle className="text-xl font-black text-primary uppercase tracking-tighter">Entrada de Produção</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Cliente (Obrigatório)*</Label>
                    <Input {...register('client')} className={cn("bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-colors", errors.client && "border-destructive")} placeholder="Nome do Cliente" />
                    {errors.client && <p className="text-[10px] text-destructive uppercase font-bold">{errors.client.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Data de Entrega</Label>
                    <Input type="date" {...register('deliveryDate')} className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-colors" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Escopo do Projeto</h3>
                    <Button type="button" onClick={() => append({ desc: '', size: '', quantity: 1, unitValue: 0 })} size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary hover:text-black rounded-lg text-[9px] uppercase font-black">
                      + Item de Linha
                    </Button>
                  </div>
                  
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white/[0.02] rounded-2xl relative border border-white/5">
                      <div className="md:col-span-5">
                        <Label className="text-[8px] uppercase text-muted-foreground mb-1 block">Descrição</Label>
                        <Input {...register(`items.${index}.desc`)} placeholder="Ex: Banner Lona" className="bg-transparent border-white/10" />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-[8px] uppercase text-muted-foreground mb-1 block">Medida</Label>
                        <Input {...register(`items.${index}.size`)} placeholder="Ex: 2x1m" className="bg-transparent border-white/10" />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-[8px] uppercase text-muted-foreground mb-1 block">Qtd</Label>
                        <Input type="number" {...register(`items.${index}.quantity`)} className="bg-transparent border-white/10" />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-[8px] uppercase text-muted-foreground mb-1 block">Valor</Label>
                        <Input type="number" step="0.01" {...register(`items.${index}.unitValue`)} className="bg-transparent border-white/10" />
                      </div>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="absolute -right-2 -top-2 bg-destructive text-white p-1 rounded-full hover:scale-110 transition-transform"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row items-end justify-between gap-6 pt-6 border-t border-white/5">
                  <div className="text-left w-full md:w-auto">
                    <p className="text-[10px] uppercase text-muted-foreground font-black tracking-widest mb-1">Total da OS</p>
                    <p className="text-4xl font-black text-white tracking-tighter">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                    </p>
                  </div>
                  <Button type="submit" className="w-full md:w-64 h-16 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(255,95,31,0.4)] hover:shadow-[0_0_30px_rgba(255,95,31,0.6)]">
                    <Save className="w-5 h-5 mr-2" /> Finalizar OS
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <div className="col-span-full flex flex-col items-center py-20 opacity-20"><Loader2 className="w-10 h-10 animate-spin" /></div>
          ) : orders.length > 0 ? (
            orders.map(order => (
              <OrderCard 
                key={order.id} 
                order={{
                  id: order.id,
                  client: order.client,
                  description: order.items?.[0]?.desc || 'Sem descrição',
                  status: order.status,
                  deliveryDate: order.deliveryDate || 'Sem data',
                  value: order.totalValue || 0
                }} 
              />
            ))
          ) : (
            <div className="col-span-full"><EmptyState /></div>
          )}
        </div>
      </main>
    </div>
  );
}
