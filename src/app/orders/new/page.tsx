
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, serverTimestamp, query, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
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
  Save, 
  Search, 
  CreditCard,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Schema de Validação
const orderItemSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  quantity: z.number().min(1, 'Mínimo 1'),
  unitValue: z.number().min(0, 'Valor inválido'),
});

const orderSchema = z.object({
  client: z.string().min(3, 'Cliente é obrigatório'),
  emissionDate: z.string(),
  deliveryDate: z.string().min(1, 'Data de entrega é obrigatória'),
  seller: z.string().min(1, 'Selecione um vendedor'),
  observations: z.string().optional(),
  status: z.string(),
  paymentMethod: z.enum(['Dinheiro', 'Pix', 'Cartão', 'Boleto']),
  cardMachine: z.string().optional(),
  installments: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'Adicione pelo menos um item'),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function NewOrderPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [suggestedClients, setSuggestedClients] = useState<string[]>([]);

  const { 
    register, 
    control, 
    handleSubmit, 
    watch, 
    setValue, 
    formState: { errors } 
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      emissionDate: new Date().toISOString().split('T')[0],
      status: 'Arte',
      paymentMethod: 'Pix',
      items: [{ code: '', quantity: 1, unitValue: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const paymentMethod = useWatch({ control, name: 'paymentMethod' });
  const watchedItems = useWatch({ control, name: 'items' });

  // Cálculo automático do Total
  const total = watchedItems?.reduce((acc, item) => 
    acc + ((item.quantity || 0) * (item.unitValue || 0)), 0) || 0;

  // Smart Search Logic para Clientes
  useEffect(() => {
    if (clientSearch.length > 2) {
      // Simulação de busca no Firestore (coleção 'clients')
      // Em produção: query(collection(firestore, 'clients'), where('name', '>=', clientSearch)...)
      const mockClients = ['Posto Central', 'Barbearia VIP', 'Restaurante Sabor', 'Mega Store LTDA'];
      setSuggestedClients(mockClients.filter(c => c.toLowerCase().includes(clientSearch.toLowerCase())));
    } else {
      setSuggestedClients([]);
    }
  }, [clientSearch]);

  const onSubmit = async (data: OrderFormValues) => {
    if (!firestore) return;
    setLoading(true);
    
    try {
      await addDoc(collection(firestore, 'orders'), {
        ...data,
        totalValue: total,
        createdAt: serverTimestamp(),
        isPriority: false,
        isDelayed: false
      });
      router.push('/');
    } catch (error) {
      console.error("Erro ao salvar OS:", error);
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
              <ChevronLeft className="w-6 h-6 text-primary" />
            </Button>
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-white uppercase">Nova Ordem de Serviço</h2>
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Abertura de Protocolo • VisComm ERP</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Lado Esquerdo: Dados Gerais e Itens */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Seção Cliente Smart Search */}
            <Card className="glass-card border-none overflow-visible">
              <CardHeader>
                <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Identificação do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative group">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 block">Nome do Cliente / Empresa</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      {...register('client')}
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setValue('client', e.target.value);
                      }}
                      placeholder="Busque ou digite um novo cliente..."
                      className="bg-[#1E1E1E] border-white/5 pl-10 h-12 focus-visible:ring-2 focus-visible:ring-primary focus-visible:shadow-[0_0_15px_rgba(255,95,31,0.3)] transition-all"
                    />
                  </div>
                  
                  {/* Dropdown de Sugestões */}
                  <AnimatePresence>
                    {suggestedClients.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                      >
                        {suggestedClients.map((client) => (
                          <button
                            key={client}
                            type="button"
                            onClick={() => {
                              setClientSearch(client);
                              setValue('client', client);
                              setSuggestedClients([]);
                            }}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                          >
                            <User className="w-4 h-4" /> {client}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {errors.client && <p className="text-[10px] text-destructive uppercase mt-1">{errors.client.message}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Seção Dados do Pedido */}
            <Card className="glass-card border-none">
              <CardHeader>
                <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Logística e Prazos</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Data Emissão</Label>
                  <Input type="date" {...register('emissionDate')} className="bg-[#1E1E1E] border-white/5 h-12 focus-visible:ring-primary" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Data Entrega</Label>
                  <Input type="date" {...register('deliveryDate')} className="bg-[#1E1E1E] border-white/5 h-12 focus-visible:ring-primary" />
                  {errors.deliveryDate && <p className="text-[10px] text-destructive uppercase">{errors.deliveryDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Responsável (Vendedor)</Label>
                  <Select onValueChange={(v) => setValue('seller', v)}>
                    <SelectTrigger className="bg-[#1E1E1E] border-white/5 h-12 focus:ring-primary">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      <SelectItem value="Carlos">Carlos Eduardo</SelectItem>
                      <SelectItem value="Mariana">Mariana Silva</SelectItem>
                      <SelectItem value="Roberto">Roberto Júnior</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.seller && <p className="text-[10px] text-destructive uppercase">{errors.seller.message}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Itens do Pedido */}
            <Card className="glass-card border-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Itens da Produção</CardTitle>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => append({ code: '', quantity: 1, unitValue: 0 })}
                  className="border-primary/50 text-primary hover:bg-primary/10 rounded-full"
                >
                  <Plus className="w-4 h-4 mr-2" /> Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={field.id} 
                    className="flex flex-col md:flex-row gap-4 p-4 rounded-xl bg-white/5 border border-white/5 relative group"
                  >
                    <div className="flex-[2] space-y-2">
                      <Label className="text-[10px] uppercase tracking-tighter text-muted-foreground">Cód / Produto</Label>
                      <Input 
                        {...register(`items.${index}.code`)}
                        placeholder="Ex: LONA-440G"
                        className="bg-[#1E1E1E] border-white/5 h-10 focus:ring-primary"
                      />
                    </div>
                    <div className="w-full md:w-24 space-y-2">
                      <Label className="text-[10px] uppercase tracking-tighter text-muted-foreground">Qtd</Label>
                      <Input 
                        type="number"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        className="bg-[#1E1E1E] border-white/5 h-10 focus:ring-primary text-center"
                      />
                    </div>
                    <div className="w-full md:w-32 space-y-2">
                      <Label className="text-[10px] uppercase tracking-tighter text-muted-foreground">Valor Unit.</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.unitValue`, { valueAsNumber: true })}
                        className="bg-[#1E1E1E] border-white/5 h-10 focus:ring-primary"
                      />
                    </div>
                    <div className="w-full md:w-32 space-y-2">
                      <Label className="text-[10px] uppercase tracking-tighter text-muted-foreground">Subtotal</Label>
                      <Input 
                        readOnly
                        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((watchedItems?.[index]?.quantity || 0) * (watchedItems?.[index]?.unitValue || 0))}
                        className="bg-transparent border-none h-10 font-bold text-white cursor-default"
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

            <Card className="glass-card border-none">
              <CardHeader>
                <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Observações do Projeto</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  {...register('observations')}
                  placeholder="Instruções especiais de acabamento, serralheria ou instalação..."
                  className="bg-[#1E1E1E] border-white/5 min-h-[100px] focus:ring-primary"
                />
              </CardContent>
            </Card>
          </div>

          {/* Lado Direito: Pagamento e Finalização */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="glass-card border-none sticky top-8 overflow-hidden">
              <div className="h-2 bg-primary w-full shadow-[0_0_15px_#FF5F1F]" />
              <CardHeader>
                <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Fechamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Meio de Pagamento */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Forma de Pagamento</Label>
                    <Select onValueChange={(v) => setValue('paymentMethod', v as any)} defaultValue="Pix">
                      <SelectTrigger className="bg-[#1E1E1E] border-white/5 h-12">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="Pix">Pix</SelectItem>
                        <SelectItem value="Cartão">Cartão (Crédito/Débito)</SelectItem>
                        <SelectItem value="Boleto">Boleto Faturado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campos Condicionais Cartão */}
                  <AnimatePresence>
                    {paymentMethod === 'Cartão' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden pt-2 border-t border-white/5"
                      >
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Máquina / Operadora</Label>
                          <Select onValueChange={(v) => setValue('cardMachine', v)}>
                            <SelectTrigger className="bg-[#1E1E1E] border-white/5 h-10">
                              <SelectValue placeholder="Stone, Cielo..." />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                              <SelectItem value="Stone">Stone</SelectItem>
                              <SelectItem value="Cielo">Cielo</SelectItem>
                              <SelectItem value="PagSeguro">PagSeguro</SelectItem>
                              <SelectItem value="Moderninha">Moderninha</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Parcelas</Label>
                          <Select onValueChange={(v) => setValue('installments', v)}>
                            <SelectTrigger className="bg-[#1E1E1E] border-white/5 h-10">
                              <SelectValue placeholder="À vista" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                              <SelectItem value="1x">À vista (1x)</SelectItem>
                              {Array.from({ length: 11 }, (_, i) => (
                                <SelectItem key={i + 2} value={`${i + 2}x`}>{i + 2}x</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">Total da OS</span>
                    <span className="text-2xl font-black text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                    </span>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest hover:bg-primary/90 transition-all hover:shadow-[0_0_25px_rgba(255,95,31,0.8)] rounded-xl"
                >
                  {loading ? (
                    "Processando..."
                  ) : (
                    <span className="flex items-center gap-2">
                      Gerar Ordem de Serviço <Save className="w-5 h-5" />
                    </span>
                  )}
                </Button>
                
                <p className="text-[9px] text-muted-foreground uppercase text-center tracking-[0.2em] leading-relaxed">
                  Ao confirmar, a OS entrará no estágio de 'Arte' e será vinculada ao fluxo de produção.
                </p>
              </CardContent>
            </Card>
          </div>
        </form>
      </main>
    </div>
  );
}
