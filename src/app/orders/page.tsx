
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, doc, serverTimestamp, query, orderBy, setDoc, updateDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { OrderCard } from '@/components/dashboard/OrderCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
  FileDown, 
  Loader2,
  FileText,
  Save,
  CreditCard
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

// Schemas
const orderItemSchema = z.object({
  desc: z.string().min(1, 'Descrição é obrigatória'),
  size: z.string().default(''),
  quantity: z.number().min(1, 'Mínimo 1'),
  unitValue: z.number().min(0, 'Valor inválido'),
});

const orderSchema = z.object({
  client: z.string().min(1, 'Cliente é obrigatório'),
  emissionDate: z.string(),
  deliveryDate: z.string().min(1, 'Data de entrega é obrigatória'),
  seller: z.string().min(1, 'Selecione um vendedor'),
  observations: z.string().optional(),
  status: z.enum(['Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação', 'Entregue']),
  paymentMethod: z.enum(['Dinheiro', 'Pix', 'Cartão Crédito', 'Cartão Débito', 'Boleto']),
  machine: z.string().optional(),
  installments: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'Adicione pelo menos um item'),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function OrdersManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const { firestore } = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  // Fetch Real-time via useCollection
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, user, isUserLoading]);

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(collection(firestore, 'clients'), orderBy('name', 'asc'));
  }, [firestore, user, isUserLoading]);

  const { data: orders, isLoading: ordersLoading } = useCollection(ordersQuery);
  const { data: clientsList } = useCollection(clientsQuery);

  const { 
    register, 
    control, 
    handleSubmit, 
    setValue, 
    reset,
    watch,
    formState: { errors } 
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      emissionDate: new Date().toISOString().split('T')[0],
      status: 'Arte',
      paymentMethod: 'Pix',
      items: [{ desc: '', size: '', quantity: 1, unitValue: 0 }],
      seller: 'Carlos'
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchedItems = watch('items');
  const watchedPaymentMethod = watch('paymentMethod');
  
  const total = useMemo(() => 
    watchedItems?.reduce((acc, item) => 
      acc + ((item.quantity || 0) * (item.unitValue || 0)), 0) || 0,
  [watchedItems]);

  const isCardPayment = watchedPaymentMethod === 'Cartão Crédito' || watchedPaymentMethod === 'Cartão Débito';

  useEffect(() => {
    if (editingOrder) {
      reset({
        client: editingOrder.client,
        emissionDate: editingOrder.emissionDate || new Date().toISOString().split('T')[0],
        deliveryDate: editingOrder.deliveryDate,
        seller: editingOrder.seller || 'Carlos',
        observations: editingOrder.observations || '',
        status: editingOrder.status,
        paymentMethod: editingOrder.paymentMethod || 'Pix',
        machine: editingOrder.machine || '',
        installments: editingOrder.installments || '1x',
        items: editingOrder.items.map((item: any) => ({
          desc: item.desc,
          size: item.size || '',
          quantity: item.quantity,
          unitValue: item.unitValue
        }))
      });
      setIsModalOpen(true);
    }
  }, [editingOrder, reset]);

  const generatePDF = (data: OrderFormValues, docId: string, orderTotal: number) => {
    const doc = new jsPDF();
    const primaryColor = [255, 95, 31];
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('VISCOMM COMMAND CENTER', 15, 20);
    doc.setFontSize(12);
    doc.text(`ORDEM DE SERVIÇO #${docId.slice(-6).toUpperCase()}`, 15, 30);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text('DADOS DO CLIENTE', 15, 50);
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.line(15, 52, 60, 52);
    doc.text(`Cliente: ${data.client}`, 15, 60);
    doc.text(`Vendedor: ${data.seller}`, 15, 65);
    doc.text(`Pagamento: ${data.paymentMethod} ${data.machine ? `(${data.machine})` : ''}`, 15, 70);
    doc.text(`Emissão: ${data.emissionDate}`, 120, 60);
    doc.text(`Entrega: ${data.deliveryDate}`, 120, 65);
    
    autoTable(doc, {
      startY: 80,
      head: [['DESCRIÇÃO', 'MEDIDA', 'QTD', 'UNIT.', 'SUB']],
      body: data.items.map(item => [
        item.desc,
        item.size,
        item.quantity,
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitValue),
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantity * item.unitValue),
      ]),
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL GERAL: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderTotal)}`, 130, finalY);
    if (data.observations) {
      doc.setFont('helvetica', 'normal');
      doc.text('OBSERVAÇÕES:', 15, finalY + 15);
      doc.text(data.observations, 15, finalY + 22, { maxWidth: 180 });
    }
    doc.save(`OS_${data.client.replace(/\s+/g, '_')}_${docId.slice(-4)}.pdf`);
  };

  const onSubmit = async (data: OrderFormValues) => {
    if (!firestore || !user) return;
    
    const currentTotal = total;
    const orderData = {
      ...data,
      totalValue: currentTotal,
      updatedAt: serverTimestamp(),
      isPriority: editingOrder?.isPriority || false,
      isDelayed: editingOrder?.isDelayed || false
    };

    if (editingOrder) {
      const orderRef = doc(firestore, 'orders', editingOrder.id);
      updateDoc(orderRef, orderData).catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: orderRef.path,
          operation: 'update',
          requestResourceData: orderData
        }));
      });
      
      toast({
        title: "Protocolo Atualizado",
        description: `Alterações salvas para ${data.client}.`,
      });
    } else {
      const orderRef = doc(collection(firestore, 'orders'));
      const newOrderData = { 
        ...orderData, 
        createdAt: serverTimestamp(),
        id: orderRef.id 
      };

      setDoc(orderRef, newOrderData).catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: orderRef.path,
          operation: 'create',
          requestResourceData: newOrderData
        }));
      });

      setTimeout(() => generatePDF(data, orderRef.id, currentTotal), 100);
      toast({
        title: "Protocolo Lançado",
        description: `Nova OS gerada para ${data.client}.`,
      });
    }

    setIsModalOpen(false);
    setEditingOrder(null);
    reset();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row overflow-x-hidden">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-6 md:space-y-8 mt-16 md:mt-0 max-w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-xl md:text-3xl font-black tracking-tighter text-white uppercase truncate">Gestão de Protocolos</h2>
            </div>
            <p className="text-muted-foreground text-[8px] md:text-[10px] uppercase tracking-[0.4em] font-medium whitespace-nowrap">Persistência Cloud em Tempo Real</p>
          </motion.div>

          <Dialog open={isModalOpen} onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setEditingOrder(null);
              reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="w-full md:w-auto bg-primary text-black font-black uppercase tracking-widest px-8 h-12 md:h-14 rounded-2xl hover:shadow-[0_0_30px_rgba(255,95,31,0.6)] hover:bg-primary transition-all gap-3 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Nova Ordem de Serviço
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-white/10 text-white p-0 rounded-3xl">
              <DialogHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
                <DialogTitle className="text-xl font-black uppercase tracking-tighter text-primary flex items-center gap-2">
                  {editingOrder ? <Save className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                  {editingOrder ? `Editar OS #${editingOrder.id.slice(-4).toUpperCase()}` : 'Lançar Protocolo'}
                </DialogTitle>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Terminal de Emissão Digital VisComm
                </p>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                  {/* Busca de Cliente */}
                  <Card className="bg-white/5 border-none shadow-none">
                    <CardHeader className="py-4">
                      <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Cliente & Venda</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 relative">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Cliente (Busca ou Texto Livre)</Label>
                        <Input 
                          {...register('client')}
                          list="clients-suggestions"
                          placeholder="Digite ou selecione..."
                          className="bg-black/40 border-white/10 h-12"
                        />
                        <datalist id="clients-suggestions">
                          {clientsList?.map(c => (
                            <option key={c.id} value={c.name} />
                          ))}
                        </datalist>
                        {errors.client && <p className="text-[10px] text-destructive">{errors.client.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Vendedor Responsável</Label>
                        <Select onValueChange={(v) => setValue('seller', v)} defaultValue={editingOrder?.seller || "Carlos"}>
                          <SelectTrigger className="bg-black/40 border-white/10 h-12">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            <SelectItem value="Carlos">Carlos Eduardo</SelectItem>
                            <SelectItem value="Mariana">Mariana Silva</SelectItem>
                            <SelectItem value="Roberto">Roberto Costa</SelectItem>
                            <SelectItem value="Avulso">Venda Avulsa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase text-muted-foreground">Emissão</Label>
                        <Input type="date" {...register('emissionDate')} className="bg-black/40 border-white/10 h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase text-muted-foreground">Entrega Prevista</Label>
                        <Input type="date" {...register('deliveryDate')} className="bg-black/40 border-white/10 h-12" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Itens da OS */}
                  <Card className="bg-white/5 border-none shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between py-4">
                      <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Escopo do Projeto</CardTitle>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => append({ desc: '', size: '', quantity: 1, unitValue: 0 })}
                        className="border-primary/50 text-primary rounded-xl"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Novo Item
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex flex-col gap-4 p-4 rounded-xl bg-black/40 border border-white/5 relative">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2 space-y-1">
                              <Label className="text-[8px] uppercase text-muted-foreground">Material / Serviço</Label>
                              <Input 
                                {...register(`items.${index}.desc`)}
                                placeholder="Ex: Banner Frontlight"
                                className="bg-black/20 border-white/10 h-12"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[8px] uppercase text-muted-foreground">Medidas</Label>
                              <Input 
                                {...register(`items.${index}.size`)}
                                placeholder="Ex: 2x1m"
                                className="bg-black/20 border-white/10 h-12"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[8px] uppercase text-muted-foreground">Qtd</Label>
                                <Input 
                                  type="number"
                                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                                  className="bg-black/20 border-white/10 h-12 px-2"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[8px] uppercase text-muted-foreground">Unitário</Label>
                                <Input 
                                  type="number"
                                  step="0.01"
                                  {...register(`items.${index}.unitValue`, { valueAsNumber: true })}
                                  className="bg-black/20 border-white/10 h-12 px-2"
                                />
                              </div>
                            </div>
                          </div>
                          {fields.length > 1 && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => remove(index)}
                              className="text-destructive absolute -top-2 -right-2 bg-black border border-white/10 rounded-full w-8 h-8"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  {/* Pagamento & Status */}
                  <Card className="bg-white/5 border-none shadow-none">
                    <CardHeader className="py-4">
                      <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Fechamento Financeiro</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase text-muted-foreground">Forma de Pagamento</Label>
                        <Select 
                          onValueChange={(v) => setValue('paymentMethod', v as any)} 
                          defaultValue={editingOrder?.paymentMethod || "Pix"}
                        >
                          <SelectTrigger className="bg-black/40 border-white/10 h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            <SelectItem value="Dinheiro">Dinheiro (Espécie)</SelectItem>
                            <SelectItem value="Pix">Pix / Transferência</SelectItem>
                            <SelectItem value="Cartão Crédito">Cartão de Crédito</SelectItem>
                            <SelectItem value="Cartão Débito">Cartão de Débito</SelectItem>
                            <SelectItem value="Boleto">Boleto Bancário</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sub-seção Condicional para Cartão */}
                      {isCardPayment && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="w-3 h-3 text-primary" />
                            <span className="text-[9px] font-black uppercase text-primary">Detalhes do Terminal</span>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="text-[8px] uppercase text-muted-foreground">Maquininha</Label>
                              <Select onValueChange={(v) => setValue('machine', v)} defaultValue={editingOrder?.machine || "PagBank"}>
                                <SelectTrigger className="bg-black/20 border-white/5 h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                  <SelectItem value="PagBank">PagBank (Moderninha)</SelectItem>
                                  <SelectItem value="SIPAG">SIPAG / SICOOB</SelectItem>
                                  <SelectItem value="Stone">Stone / Ton</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[8px] uppercase text-muted-foreground">Parcelamento</Label>
                              <Select onValueChange={(v) => setValue('installments', v)} defaultValue={editingOrder?.installments || "1x"}>
                                <SelectTrigger className="bg-black/20 border-white/5 h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                  {Array.from({ length: 10 }, (_, i) => (
                                    <SelectItem key={i + 1} value={`${i + 1}x`}>{i + 1}x sem juros</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase text-muted-foreground">Status Atual</Label>
                        <Select onValueChange={(v) => setValue('status', v as any)} defaultValue={editingOrder?.status || "Arte"}>
                          <SelectTrigger className="bg-black/40 border-white/10 h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            <SelectItem value="Arte">Arte Final</SelectItem>
                            <SelectItem value="Impressão">Impressão</SelectItem>
                            <SelectItem value="Serralheria">Serralheria</SelectItem>
                            <SelectItem value="Acabamento">Acabamento</SelectItem>
                            <SelectItem value="Instalação">Instalação</SelectItem>
                            <SelectItem value="Entregue">Entregue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase text-muted-foreground">Observações Técnicas</Label>
                        <Textarea 
                          {...register('observations')}
                          placeholder="Detalhes de acabamento, ilhós, sangria..."
                          className="bg-black/40 border-white/10 min-h-[100px]"
                        />
                      </div>

                      <div className="pt-4 border-t border-white/5">
                        <div className="flex justify-between items-center mb-6">
                          <span className="text-[10px] text-muted-foreground uppercase font-black">Total OS</span>
                          <span className="text-2xl font-black text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                          </span>
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest rounded-2xl"
                        >
                          {editingOrder ? 'Salvar Alterações' : 'Finalizar OS'} 
                          <FileDown className="w-5 h-5 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.5em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
              Monitor de Ordens Ativas
            </h3>
          </div>

          <AnimatePresence mode="popLayout">
            {orders && orders.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {orders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <OrderCard 
                      order={{
                        id: order.id,
                        client: order.client || 'Cliente não identificado',
                        description: order.items?.[0]?.desc || 'Sem descrição',
                        status: order.status,
                        deliveryDate: order.deliveryDate,
                        value: order.totalValue || 0,
                        isDelayed: order.isDelayed || false
                      }} 
                      onClick={() => setEditingOrder(order)}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              !ordersLoading && <EmptyState />
            )}
            {ordersLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            )}
          </AnimatePresence>
        </section>

        <footer className="pt-8 pb-4 border-t border-white/5 opacity-30">
          <p className="text-[7px] md:text-[9px] text-muted-foreground uppercase tracking-[0.5em] text-center">
            VISCOMM MANAGEMENT TERMINAL v1.2 • CLOUD SYNC ACTIVE
          </p>
        </footer>
      </main>
    </div>
  );
}
