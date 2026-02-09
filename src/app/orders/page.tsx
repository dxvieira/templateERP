
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { query, collection, orderBy } from 'firebase/firestore';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Plus, Trash2, FileText, Save, Calculator, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useOrders } from '@/hooks/use-orders';

const orderSchema = z.object({
  client: z.string().min(1, 'Nome do cliente é obrigatório'),
  clientId: z.string().optional(),
  deliveryDate: z.string().default(''),
  seller: z.string().default('Vendedor Geral'),
  status: z.enum(['Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação', 'Concluído']).default('Arte'),
  paymentMethod: z.string().default('Pix'),
  machine: z.string().optional(),
  installments: z.string().optional(),
  observations: z.string().default(''),
  items: z.array(z.object({
    desc: z.string().min(1, 'Descrição obrigatória'),
    size: z.string().default(''),
    quantity: z.coerce.number().min(0),
    unitValue: z.coerce.number().min(0),
  })).min(1, 'Adicione pelo menos um item'),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function OrdersManagerPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { firestore } = useFirestore();
  const { toast } = useToast();
  const { orders, createOrder, isLoading } = useOrders();

  const clientsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'clients'), orderBy('name', 'asc')) : null
  , [firestore]);
  const { data: clients } = useCollection(clientsQuery);

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      client: '',
      status: 'Arte',
      paymentMethod: 'Pix',
      items: [{ desc: '', size: '', quantity: 1, unitValue: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: 'items' });
  const watchedPayment = watch('paymentMethod');

  const totalValue = useMemo(() => {
    return watchedItems?.reduce((acc, item) => {
      const q = Number(item.quantity) || 0;
      const v = Number(item.unitValue) || 0;
      return acc + (q * v);
    }, 0) || 0;
  }, [watchedItems]);

  useEffect(() => {
    if (!watchedPayment.toLowerCase().includes('cartão')) {
      setValue('machine', undefined);
      setValue('installments', undefined);
    }
  }, [watchedPayment, setValue]);

  const onSubmit = async (data: OrderFormValues) => {
    setIsSubmitting(true);
    try {
      await createOrder({
        ...data,
        totalValue,
      });
      
      toast({ 
        title: "OS Protocolada", 
        description: `Protocolo gerado com sucesso para ${data.client}.` 
      });
      
      setIsModalOpen(false);
      reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível persistir os dados no servidor."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (formErrors: any) => {
    console.error('Validation Errors:', formErrors);
    toast({
      variant: "destructive",
      title: "Erro de Validação",
      description: "Verifique os campos obrigatórios (Nome do Cliente e Itens)."
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row overflow-x-hidden relative">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <FileText className="text-primary w-8 h-8" /> Gestão de Protocolos
            </h2>
            <p className="text-muted-foreground text-[10px] uppercase tracking-[0.4em] font-medium">Histórico de Produção em Tempo Real</p>
          </div>

          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-black font-black uppercase tracking-widest px-8 h-14 rounded-2xl hover:shadow-[0_0_30px_rgba(255,95,31,0.6)] active:scale-95 transition-all gap-2 z-20"
          >
            <Plus className="w-5 h-5" /> Nova Ordem de Serviço
          </Button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.5em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/40 animate-pulse"></span>
              Fluxo de Protocolos Ativos
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.length > 0 ? (
              orders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={{
                    id: order.id,
                    client: order.client,
                    description: order.items?.[0]?.desc || 'Sem descrição',
                    status: order.status,
                    deliveryDate: order.deliveryDate || 'N/A',
                    value: order.totalValue || 0
                  }} 
                />
              ))
            ) : (
              !isLoading && <div className="col-span-full"><EmptyState /></div>
            )}
          </div>
        </div>

        {/* Modal de Formulário com Z-Index Elevado */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 text-white rounded-3xl overflow-hidden p-0 shadow-2xl border-t-4 border-primary z-[9999]">
            <DialogHeader className="p-6 bg-white/[0.02] border-b border-white/5">
              <DialogTitle className="text-2xl font-black text-primary uppercase tracking-tighter">Entrada de Produção</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit, onError)} className="p-6 space-y-8 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Cliente (Busca ou Manual)*</Label>
                  <Input 
                    {...register('client')} 
                    list="client-suggestions"
                    className={cn("bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary", errors.client && "border-destructive")} 
                    placeholder="Nome da Empresa ou Cliente"
                    onChange={(e) => {
                      const val = e.target.value;
                      const match = clients?.find(c => c.name === val);
                      if (match) setValue('clientId', match.id);
                      else setValue('clientId', '');
                    }}
                  />
                  <datalist id="client-suggestions">
                    {clients?.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Prazo Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-black/40 border-white/10 h-12 rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Vendedor</Label>
                  <Input {...register('seller')} className="bg-black/40 border-white/10 h-12 rounded-xl" placeholder="Vendedor Responsável" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Status de Partida</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl">
                          <SelectValue placeholder="Selecione o Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                          {['Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação', 'Concluído'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                    <Calculator className="w-3 h-3" /> Detalhes do Projeto
                  </h3>
                  <Button type="button" onClick={() => append({ desc: '', size: '', quantity: 1, unitValue: 0 })} size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary hover:text-black rounded-lg text-[9px] uppercase font-black">
                    + Adicionar Item
                  </Button>
                </div>
                
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white/[0.02] rounded-2xl relative border border-white/5 group">
                    <div className="md:col-span-5">
                      <Label className="text-[8px] uppercase text-muted-foreground mb-1 block">Descrição do Material</Label>
                      <Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/10 h-10" placeholder="Ex: Banner Lona 440g" />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-[8px] uppercase text-muted-foreground mb-1 block">Medidas</Label>
                      <Input {...register(`items.${index}.size`)} className="bg-transparent border-white/10 h-10" placeholder="Ex: 100x200cm" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-[8px] uppercase text-muted-foreground mb-1 block">Qtd</Label>
                      <Input type="number" {...register(`items.${index}.quantity`)} className="bg-transparent border-white/10 h-10" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-[8px] uppercase text-muted-foreground mb-1 block">R$ Unit.</Label>
                      <Input type="number" step="0.01" {...register(`items.${index}.unitValue`)} className="bg-transparent border-white/10 h-10" />
                    </div>
                    <button type="button" onClick={() => remove(index)} className="absolute -right-2 -top-2 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-white/5 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Pagamento</Label>
                    <Controller
                      name="paymentMethod"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl">
                            <SelectValue placeholder="Forma" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            {['Dinheiro', 'Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto'].map(p => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {watchedPayment.toLowerCase().includes('cartão') && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Maquininha</Label>
                        <Controller
                          name="machine"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                {['SICOOB/SIPAG', 'PagBank'].map(m => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Parcelas</Label>
                        <Controller
                          name="installments"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl">
                                <SelectValue placeholder="1x" />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                {Array.from({ length: 12 }, (_, i) => `${i + 1}x`).map(p => (
                                  <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Observações</Label>
                <Textarea {...register('observations')} className="bg-black/40 border-white/10 rounded-2xl min-h-[100px]" placeholder="Notas extras..." />
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-white/5">
                <div className="text-center md:text-left">
                  <p className="text-[10px] uppercase text-muted-foreground font-black tracking-widest mb-1">Investimento Total</p>
                  <p className="text-4xl font-black text-white tracking-tighter">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                  </p>
                </div>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full md:w-64 h-16 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(255,95,31,0.4)] hover:shadow-[0_0_30px_rgba(255,95,31,0.6)]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <><Save className="w-5 h-5 mr-2" /> Finalizar OS</>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
