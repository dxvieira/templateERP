
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useOrders } from '@/hooks/use-orders';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Loader2,
  FileText,
  AlertCircle,
  Save
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Schema ultra-flexível: Apenas o cliente é obrigatório.
const orderItemSchema = z.object({
  desc: z.string().optional().default(''),
  size: z.string().optional().default(''),
  quantity: z.coerce.number().optional().default(1),
  unitValue: z.coerce.number().optional().default(0),
});

const orderSchema = z.object({
  client: z.string().min(1, 'O nome do cliente é obrigatório'),
  emissionDate: z.string().optional().default(() => new Date().toISOString().split('T')[0]),
  deliveryDate: z.string().optional().default(''),
  seller: z.string().optional().default('Carlos'),
  observations: z.string().optional().default(''),
  status: z.string().optional().default('Arte'),
  paymentMethod: z.string().optional().default('Pix'),
  machine: z.string().optional().default(''),
  installments: z.string().optional().default('1x'),
  items: z.array(orderItemSchema).default([{ desc: '', size: '', quantity: 1, unitValue: 0 }]),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function OrdersManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { firestore } = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { orders, isLoading: ordersLoading } = useOrders();

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'clients'), orderBy('name', 'asc'));
  }, [firestore, user]);

  const { data: clientsList } = useCollection(clientsQuery);

  const { 
    register, 
    control, 
    handleSubmit, 
    reset,
    formState: { errors } 
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      client: '',
      emissionDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      status: 'Arte',
      paymentMethod: 'Pix',
      items: [{ desc: '', size: '', quantity: 1, unitValue: 0 }],
      seller: 'Carlos',
      observations: '',
      machine: '',
      installments: '1x'
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchedItems = useWatch({ control, name: 'items' });
  const watchedPaymentMethod = useWatch({ control, name: 'paymentMethod' });
  
  const totalValue = useMemo(() => {
    if (!watchedItems) return 0;
    return watchedItems.reduce((acc, item) => {
      const q = Number(item?.quantity) || 0;
      const v = Number(item?.unitValue) || 0;
      return acc + (q * v);
    }, 0);
  }, [watchedItems]);

  const isCardPayment = watchedPaymentMethod === 'Cartão Crédito' || watchedPaymentMethod === 'Cartão Débito';

  useEffect(() => {
    if (editingOrder) {
      reset({
        client: editingOrder.client,
        emissionDate: editingOrder.emissionDate,
        deliveryDate: editingOrder.deliveryDate,
        seller: editingOrder.seller,
        observations: editingOrder.observations,
        status: editingOrder.status,
        paymentMethod: editingOrder.paymentMethod,
        machine: editingOrder.machine || '',
        installments: editingOrder.installments || '1x',
        items: editingOrder.items
      });
      setIsModalOpen(true);
    }
  }, [editingOrder, reset]);

  const generatePDF = (data: OrderFormValues, docId: string) => {
    try {
      const doc = new jsPDF();
      const primaryColor = [255, 95, 31];
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22).setFont('helvetica', 'bold').text('VISCOMM COMMAND CENTER', 15, 20);
      doc.setFontSize(12).text(`ORDEM DE SERVIÇO #${docId.slice(-6).toUpperCase()}`, 15, 30);
      
      doc.setTextColor(0, 0, 0).setFontSize(10).text('DADOS DO CLIENTE', 15, 50);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]).line(15, 52, 60, 52);
      doc.text(`Cliente: ${data.client}`, 15, 60);
      doc.text(`Vendedor: ${data.seller}`, 15, 65);
      doc.text(`Pagamento: ${data.paymentMethod}`, 15, 70);
      
      const tableBody = data.items.map(item => [
        item.desc,
        item.size,
        item.quantity,
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitValue || 0),
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.quantity || 0) * (item.unitValue || 0)),
      ]);

      autoTable(doc, {
        startY: 80,
        head: [['DESCRIÇÃO', 'MEDIDA', 'QTD', 'UNIT.', 'SUB']],
        body: tableBody,
        headStyles: { fillColor: primaryColor },
      });
      
      doc.save(`OS_${data.client.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
    }
  };

  const onSubmit = (data: OrderFormValues) => {
    if (!firestore || !user) {
      toast({ variant: "destructive", title: "Erro de Conexão", description: "O terminal não está autenticado." });
      return;
    }

    setIsSubmitting(true);
    
    // Objeto de dados consolidado
    const orderData = {
      ...data,
      totalValue,
      updatedAt: serverTimestamp(),
      isPriority: editingOrder?.isPriority || false,
      isDelayed: editingOrder?.isDelayed || false
    };

    try {
      if (editingOrder) {
        // Atualizar OS existente
        const orderRef = doc(firestore, 'orders', editingOrder.id);
        updateDocumentNonBlocking(orderRef, { ...orderData, id: editingOrder.id });
        toast({ title: "Sincronizado", description: "Protocolo atualizado no sistema." });
      } else {
        // Criar Nova OS
        const orderRef = doc(collection(firestore, 'orders'));
        const newOrderPayload = { 
          ...orderData, 
          createdAt: serverTimestamp(), 
          id: orderRef.id 
        };
        setDocumentNonBlocking(orderRef, newOrderPayload, { merge: true });
        toast({ title: "Sucesso!", description: "Nova Ordem de Serviço registrada." });
        
        // Gerar PDF em background
        setTimeout(() => generatePDF(data, orderRef.id), 500);
      }

      // Finalizar UI
      setIsModalOpen(false);
      setEditingOrder(null);
      reset();
    } catch (err) {
      console.error("Erro ao salvar OS:", err);
      toast({ variant: "destructive", title: "Erro Crítico", description: "Não foi possível persistir os dados." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onValidationError = (formErrors: any) => {
    console.error('Falha de Validação:', formErrors);
    toast({
      variant: "destructive",
      title: "Dados Incompletos",
      description: "O nome do cliente é obrigatório.",
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row overflow-x-hidden">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0 max-w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xl md:text-3xl font-black tracking-tighter text-white uppercase flex items-center gap-2">
              <FileText className="text-primary" /> Gestão de Protocolos
            </h2>
            <p className="text-muted-foreground text-[10px] uppercase tracking-[0.4em]">Monitoramento Real-time</p>
          </div>

          <Dialog open={isModalOpen} onOpenChange={(open) => {
            if(!open) {
              setEditingOrder(null);
              reset();
            }
            setIsModalOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-black font-black uppercase tracking-widest px-8 h-14 rounded-2xl hover:shadow-[0_0_30px_rgba(255,95,31,0.6)]">
                <Plus className="w-5 h-5 mr-2" /> Nova OS
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl bg-zinc-950 border-white/10 text-white p-0 rounded-3xl overflow-hidden shadow-2xl">
              <DialogHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
                <DialogTitle className="text-xl font-black uppercase text-primary tracking-tighter">Lançamento de Protocolo</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit, onValidationError)} className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <div className="lg:col-span-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Cliente (Obrigatório)</Label>
                      <div className="relative">
                        <Input 
                          {...register('client')} 
                          list="clients-list" 
                          placeholder="Nome do Cliente"
                          className={cn("bg-black/40 h-12 border-white/10", errors.client && "border-destructive")} 
                        />
                        {errors.client && <AlertCircle className="w-4 h-4 text-destructive absolute right-3 top-4" />}
                      </div>
                      <datalist id="clients-list">
                        {clientsList?.map(c => <option key={c.id} value={c.name} />)}
                      </datalist>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Vendedor</Label>
                      <Controller
                        name="seller"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="bg-black/40 h-12 border-white/10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                              <SelectItem value="Carlos">Carlos Eduardo</SelectItem>
                              <SelectItem value="Mariana">Mariana Silva</SelectItem>
                              <SelectItem value="Roberto">Roberto Costa</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Itens da Produção</h3>
                      <Button type="button" size="sm" onClick={() => append({ desc: '', size: '', quantity: 1, unitValue: 0 })} className="border-primary/50 text-primary hover:bg-primary/10" variant="outline">
                        + Material
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative">
                          <div className="md:col-span-5 space-y-1">
                            <Label className="text-[8px] uppercase opacity-50">Descrição</Label>
                            <Input {...register(`items.${index}.desc`)} className="bg-transparent border-white/5 h-10" />
                          </div>
                          <div className="md:col-span-3 space-y-1">
                            <Label className="text-[8px] uppercase opacity-50">Medida</Label>
                            <Input {...register(`items.${index}.size`)} placeholder="ex: 1x2m" className="bg-transparent border-white/5 h-10" />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <Label className="text-[8px] uppercase opacity-50">Qtd</Label>
                            <Input type="number" {...register(`items.${index}.quantity`)} className="bg-transparent border-white/5 h-10" />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <Label className="text-[8px] uppercase opacity-50">Unit.</Label>
                            <Input type="number" step="0.01" {...register(`items.${index}.unitValue`)} className="bg-transparent border-white/5 h-10" />
                          </div>
                          {fields.length > 1 && (
                            <Button type="button" onClick={() => remove(index)} className="absolute -right-2 -top-2 bg-destructive h-6 w-6 rounded-full p-0 flex items-center justify-center">
                              <Trash2 className="w-3 h-3 text-white" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  <Card className="bg-white/5 border-none p-5 space-y-6 rounded-2xl">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Status Atual</Label>
                        <Controller
                          name="status"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="bg-black/40 h-12 border-white/10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                <SelectItem value="Arte">Arte Final</SelectItem>
                                <SelectItem value="Impressão">Impressão</SelectItem>
                                <SelectItem value="Acabamento">Acabamento</SelectItem>
                                <SelectItem value="Entregue">Entregue</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Entrega Prevista</Label>
                        <Input type="date" {...register('deliveryDate')} className="bg-black/40 h-12 border-white/10" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Pagamento</Label>
                        <Controller
                          name="paymentMethod"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="bg-black/40 h-12 border-white/10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                <SelectItem value="Pix">Pix / Dinheiro</SelectItem>
                                <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                                <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                                <SelectItem value="Boleto">Boleto</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {isCardPayment && (
                        <div className="p-4 border border-primary/30 rounded-2xl space-y-4 bg-primary/5">
                          <div className="space-y-1">
                            <Label className="text-[8px] uppercase opacity-70">Maquininha</Label>
                            <Controller
                              name="machine"
                              control={control}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="bg-black/20 h-10 border-white/5">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 text-white">
                                    <SelectItem value="PagBank">PagBank</SelectItem>
                                    <SelectItem value="SIPAG">SIPAG / SICOOB</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[8px] uppercase opacity-70">Parcelas</Label>
                            <Controller
                              name="installments"
                              control={control}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="bg-black/20 h-10 border-white/5">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 text-white">
                                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                                      <SelectItem key={n} value={`${n}x`}>{n}x</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <div className="flex flex-col gap-1 text-right">
                        <span className="text-[9px] uppercase text-muted-foreground font-black tracking-widest">Total Geral</span>
                        <span className="text-3xl font-black text-white tracking-tighter">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                        </span>
                      </div>
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full h-16 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(255,95,31,0.4)] transition-all hover:scale-[1.02] active:scale-95"
                      >
                        {isSubmitting ? (
                          <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Salvando...</>
                        ) : (
                          <><Save className="w-5 h-5 mr-2" /> Finalizar OS</>
                        )}
                      </Button>
                    </div>
                  </Card>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {orders.map((order) => (
              <motion.div 
                key={order.id} 
                layout 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <OrderCard 
                  order={{
                    id: order.id,
                    client: order.client,
                    description: order.items[0]?.desc || 'Protocolo sem itens',
                    status: order.status,
                    deliveryDate: order.deliveryDate,
                    value: order.totalValue
                  }} 
                  onClick={() => setEditingOrder(order)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {ordersLoading && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 opacity-50">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-[10px] uppercase tracking-widest">Sincronizando Cloud...</p>
            </div>
          )}
          {!ordersLoading && orders.length === 0 && <div className="col-span-full"><EmptyState /></div>}
        </div>
      </main>
    </div>
  );
}
