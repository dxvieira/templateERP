
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, FileText, ChevronLeft, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const orderSchema = z.object({
  client: z.string().min(3, 'Nome do cliente é obrigatório'),
  deliveryDate: z.string().min(1, 'Data de entrega é obrigatória'),
  status: z.enum(['Arte', 'Impressão', 'Serralheria', 'Acabamento', 'Instalação']),
  paymentMethod: z.string().min(1, 'Forma de pagamento é obrigatória'),
  items: z.array(z.object({
    description: z.string().min(1, 'Descrição é obrigatória'),
    quantity: z.number().min(1, 'Qtd mín 1'),
    unitValue: z.number().min(0, 'Valor inválido'),
  })).min(1, 'Adicione pelo menos um item'),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      status: 'Arte',
      paymentMethod: 'Pix',
      items: [{ description: '', quantity: 1, unitValue: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchedItems = watch('items');
  const total = watchedItems.reduce((acc, item) => acc + (item.quantity * item.unitValue), 0);

  const generatePDF = (orderId: string, data: OrderFormValues) => {
    const doc = new jsPDF();
    const primaryColor = [255, 95, 31]; // #FF5F1F

    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text('VISCOMM', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Comunicação Visual & Sinalização', 14, 25);
    
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`ORDEM DE SERVIÇO #${orderId.slice(-6).toUpperCase()}`, 120, 20);

    // Client Info
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.line(14, 35, 196, 35);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('DADOS DO CLIENTE', 14, 45);
    doc.setFontSize(10);
    doc.text(`Cliente: ${data.client}`, 14, 52);
    doc.text(`Data de Entrega: ${new Date(data.deliveryDate).toLocaleDateString('pt-BR')}`, 14, 58);
    doc.text(`Status Inicial: ${data.status}`, 14, 64);
    doc.text(`Forma de Pagamento: ${data.paymentMethod}`, 14, 70);

    // Table
    const tableBody = data.items.map(item => [
      item.description,
      item.quantity.toString(),
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitValue),
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantity * item.unitValue)
    ]);

    autoTable(doc, {
      startY: 80,
      head: [['Descrição', 'Qtd', 'V. Unitário', 'Subtotal']],
      body: tableBody,
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL GERAL: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}`, 140, finalY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Assinatura do Responsável:', 14, finalY + 30);
    doc.line(14, finalY + 35, 80, finalY + 35);
    
    doc.text('Assinatura do Cliente:', 120, finalY + 30);
    doc.line(120, finalY + 35, 186, finalY + 35);

    doc.save(`OS-${orderId.slice(-6).toUpperCase()}.pdf`);
  };

  const onSubmit = async (data: OrderFormValues) => {
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        ...data,
        value: total,
        createdAt: serverTimestamp(),
        isPriority: false,
        isDelayed: false
      });

      generatePDF(docRef.id, data);
      router.push('/');
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white/10">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div>
              <h2 className="text-2xl font-black tracking-tighter text-white uppercase">Nova Ordem de Serviço</h2>
              <p className="text-muted-foreground text-xs uppercase tracking-widest">Cadastro de projeto • VisComm ERP</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <Card className="glass-card border-none">
              <CardHeader>
                <CardTitle className="text-xs font-bold text-primary uppercase tracking-[0.3em]">Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Cliente</Label>
                    <Input 
                      {...register('client')}
                      placeholder="Nome completo ou Razão Social"
                      className="bg-white/5 border-white/10 focus:border-primary transition-all h-12"
                    />
                    {errors.client && <p className="text-[10px] text-destructive uppercase">{errors.client.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Data de Entrega</Label>
                    <Input 
                      type="date"
                      {...register('deliveryDate')}
                      className="bg-white/5 border-white/10 focus:border-primary transition-all h-12"
                    />
                    {errors.deliveryDate && <p className="text-[10px] text-destructive uppercase">{errors.deliveryDate.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Estágio Inicial</Label>
                    <Select onValueChange={(v) => setValue('status', v as any)} defaultValue="Arte">
                      <SelectTrigger className="bg-white/5 border-white/10 h-12">
                        <SelectValue placeholder="Selecione o estágio" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="Arte">Arte</SelectItem>
                        <SelectItem value="Impressão">Impressão</SelectItem>
                        <SelectItem value="Serralheria">Serralheria</SelectItem>
                        <SelectItem value="Acabamento">Acabamento</SelectItem>
                        <SelectItem value="Instalação">Instalação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Forma de Pagamento</Label>
                    <Input 
                      {...register('paymentMethod')}
                      placeholder="Ex: Pix, Cartão 3x, Faturado"
                      className="bg-white/5 border-white/10 h-12"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-primary uppercase tracking-[0.3em]">Itens da OS</CardTitle>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => append({ description: '', quantity: 1, unitValue: 0 })}
                  className="border-primary/50 text-primary hover:bg-primary/10 rounded-full"
                >
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col md:flex-row gap-4 p-4 rounded-xl bg-white/5 border border-white/5 relative group">
                    <div className="flex-1 space-y-2">
                      <Label className="text-[10px] uppercase tracking-tighter text-muted-foreground">Descrição</Label>
                      <Input 
                        {...register(`items.${index}.description`)}
                        placeholder="Ex: Lona 440g Fosca"
                        className="bg-transparent border-white/10"
                      />
                    </div>
                    <div className="w-full md:w-24 space-y-2">
                      <Label className="text-[10px] uppercase tracking-tighter text-muted-foreground">Qtd</Label>
                      <Input 
                        type="number"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        className="bg-transparent border-white/10"
                      />
                    </div>
                    <div className="w-full md:w-32 space-y-2">
                      <Label className="text-[10px] uppercase tracking-tighter text-muted-foreground">Valor Unit.</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.unitValue`, { valueAsNumber: true })}
                        className="bg-transparent border-white/10"
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
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="glass-card border-none sticky top-8">
              <CardHeader>
                <CardTitle className="text-xs font-bold text-primary uppercase tracking-[0.3em]">Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="text-xs text-muted-foreground uppercase">Subtotal</span>
                  <span className="font-mono text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xl font-black">
                  <span className="text-primary uppercase tracking-tighter">Total</span>
                  <span className="text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest hover:bg-primary/90 transition-all hover:shadow-[0_0_25px_rgba(255,95,31,0.8)] rounded-xl"
                  >
                    {loading ? (
                      "Processando..."
                    ) : (
                      <span className="flex items-center gap-2">
                        Salvar e Gerar PDF <FileText className="w-5 h-5" />
                      </span>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground uppercase text-center tracking-widest">
                    Ao salvar, o PDF será baixado automaticamente
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </main>
    </div>
  );
}
