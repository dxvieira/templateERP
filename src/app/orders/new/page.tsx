
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Trash2, 
  ChevronLeft, 
  FileDown, 
  Search, 
  Loader2,
  CheckCircle2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Validação
const orderItemSchema = z.object({
  desc: z.string().min(1, 'Descrição é obrigatória'),
  quantity: z.number().min(1, 'Mínimo 1'),
  unitValue: z.number().min(0, 'Valor inválido'),
});

const orderSchema = z.object({
  client: z.string().min(3, 'Cliente é obrigatório'),
  emissionDate: z.string(),
  deliveryDate: z.string().min(1, 'Data de entrega é obrigatória'),
  seller: z.string().min(1, 'Selecione um vendedor'),
  observations: z.string().optional(),
  status: z.enum(['Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação']),
  paymentMethod: z.enum(['Dinheiro', 'Pix', 'Cartão', 'Boleto']),
  cardMachine: z.string().optional(),
  installments: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'Adicione pelo menos um item'),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function NewOrderPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  // Hydration safety for dates
  useEffect(() => {
    setCurrentDate(new Date().toISOString().split('T')[0]);
  }, []);

  const { 
    register, 
    control, 
    handleSubmit, 
    setValue, 
    formState: { errors } 
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      emissionDate: new Date().toISOString().split('T')[0],
      status: 'Arte',
      paymentMethod: 'Pix',
      items: [{ desc: '', quantity: 1, unitValue: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const paymentMethod = useWatch({ control, name: 'paymentMethod' });
  const watchedItems = useWatch({ control, name: 'items' });

  const total = useMemo(() => 
    watchedItems?.reduce((acc, item) => 
      acc + ((item.quantity || 0) * (item.unitValue || 0)), 0) || 0,
  [watchedItems]);

  const generatePDF = (data: OrderFormValues, docId: string) => {
    const doc = new jsPDF();
    const primaryColor = [255, 95, 31]; // #FF5F1F

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('VISCOMM COMMAND CENTER', 15, 20);
    doc.setFontSize(12);
    doc.text(`ORDEM DE SERVIÇO #${docId.slice(-6).toUpperCase()}`, 15, 30);

    // Client Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text('DADOS DO CLIENTE', 15, 50);
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.line(15, 52, 60, 52);

    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${data.client}`, 15, 60);
    doc.text(`Vendedor: ${data.seller}`, 15, 65);
    doc.text(`Emissão: ${data.emissionDate}`, 120, 60);
    doc.text(`Entrega: ${data.deliveryDate}`, 120, 65);

    // Items Table
    autoTable(doc, {
      startY: 75,
      head: [['DESCRIÇÃO', 'QTD', 'VALOR UNIT.', 'SUBTOTAL']],
      body: data.items.map(item => [
        item.desc,
        item.quantity,
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitValue),
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantity * item.unitValue),
      ]),
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 15, right: 15 },
    });

    // Footer & Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`PAGAMENTO: ${data.paymentMethod.toUpperCase()}`, 15, finalY);
    doc.setFontSize(14);
    doc.text(`TOTAL GERAL: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}`, 130, finalY);

    // Signature
    doc.setDrawColor(200, 200, 200);
    doc.line(40, finalY + 40, 90, finalY + 40);
    doc.line(120, finalY + 40, 170, finalY + 40);
    doc.setFontSize(8);
    doc.text('ASSINATURA RESPONSÁVEL', 45, finalY + 45);
    doc.text('ASSINATURA CLIENTE', 130, finalY + 45);

    doc.save(`OS_${data.client.replace(/\s+/g, '_')}_${docId.slice(-4)}.pdf`);
  };

  const onSubmit = useCallback(async (data: OrderFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    try {
      const docRef = await addDoc(collection(firestore, 'orders'), {
        ...data,
        totalValue: total,
        createdAt: serverTimestamp(),
        isPriority: false,
        isDelayed: false
      });

      generatePDF(data, docRef.id);
      router.push('/');
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: 'orders',
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
      setIsSubmitting(false);
    }
  }, [firestore, total, router]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white/10">
              <ChevronLeft className="w-6 h-6 text-primary" />
            </Button>
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-white uppercase">Nova OS Digital</h2>
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Protocolo de Produção • VisComm</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <Card className="glass-card border-none">
              <CardHeader>
                <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Cliente e Vendas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Cliente / Empresa</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      {...register('client')}
                      placeholder="Nome do cliente..."
                      className="bg-[#1E1E1E] border-white/5 pl-10 focus:ring-primary"
                    />
                  </div>
                  {errors.client && <p className="text-[10px] text-destructive">{errors.client.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Vendedor Responsável</Label>
                  <Select onValueChange={(v) => setValue('seller', v)}>
                    <SelectTrigger className="bg-[#1E1E1E] border-white/5">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      <SelectItem value="Carlos">Carlos Eduardo</SelectItem>
                      <SelectItem value="Mariana">Mariana Silva</SelectItem>
                      <SelectItem value="Roberto">Roberto Costa</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.seller && <p className="text-[10px] text-destructive">{errors.seller.message}</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Itens da Produção</CardTitle>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => append({ desc: '', quantity: 1, unitValue: 0 })}
                  className="border-primary/50 text-primary hover:bg-primary/10 rounded-full"
                >
                  <Plus className="w-4 h-4 mr-2" /> Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={field.id} 
                    className="flex flex-col md:flex-row gap-4 p-4 rounded-xl bg-white/5 border border-white/5 relative group"
                  >
                    <div className="flex-[2] space-y-2">
                      <Label className="text-[10px] uppercase text-muted-foreground">Descrição</Label>
                      <Input 
                        {...register(`items.${index}.desc`)}
                        placeholder="Ex: Lona 440g c/ Ilhós"
                        className="bg-[#1E1E1E] border-white/5 h-10"
                      />
                    </div>
                    <div className="w-full md:w-20 space-y-2">
                      <Label className="text-[10px] uppercase text-muted-foreground">Qtd</Label>
                      <Input 
                        type="number"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        className="bg-[#1E1E1E] border-white/5 h-10 text-center"
                      />
                    </div>
                    <div className="w-full md:w-28 space-y-2">
                      <Label className="text-[10px] uppercase text-muted-foreground">Valor Unit.</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.unitValue`, { valueAsNumber: true })}
                        className="bg-[#1E1E1E] border-white/5 h-10"
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => remove(index)}
                        className="text-destructive hover:bg-destructive/10"
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="glass-card border-none sticky top-8">
              <CardHeader>
                <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Configuração e Fechamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Status Inicial</Label>
                  <Select onValueChange={(v) => setValue('status', v as any)} defaultValue="Arte">
                    <SelectTrigger className="bg-[#1E1E1E] border-white/5 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      <SelectItem value="Arte">Arte Final</SelectItem>
                      <SelectItem value="Impressão">Impressão</SelectItem>
                      <SelectItem value="Serralheria">Serralheria</SelectItem>
                      <SelectItem value="Acabamento">Acabamento</SelectItem>
                      <SelectItem value="Instalação">Instalação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Data de Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-[#1E1E1E] border-white/5 h-12" />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Pagamento</Label>
                  <Select onValueChange={(v) => setValue('paymentMethod', v as any)} defaultValue="Pix">
                    <SelectTrigger className="bg-[#1E1E1E] border-white/5 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Pix">Pix</SelectItem>
                      <SelectItem value="Cartão">Cartão</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase">Valor Total</span>
                    <span className="text-2xl font-black text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                    </span>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,95,31,0.5)] rounded-xl"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      Salvar e Gerar PDF <FileDown className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </form>
      </main>
    </div>
  );
}

