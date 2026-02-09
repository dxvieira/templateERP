
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, doc, serverTimestamp, query, orderBy, setDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Users, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Schema de validação - Todos os campos opcionais
const clientSchema = z.object({
  name: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().email('Email inválido').or(z.literal('')).default(''),
  zipCode: z.string().default(''),
  street: z.string().default(''),
  neighborhood: z.string().default(''),
  city: z.string().default(''),
  state: z.string().default(''),
  number: z.string().default(''),
  complement: z.string().default(''),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function ClientsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch, 
    reset,
    formState: { errors } 
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      zipCode: '',
      street: '',
      neighborhood: '',
      city: '',
      state: '',
      number: '',
      complement: '',
    }
  });

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(collection(firestore, 'clients'), orderBy('createdAt', 'desc'));
  }, [firestore, user, isUserLoading]);

  const { data: clients, isLoading } = useCollection(clientsQuery);

  const watchedZip = watch('zipCode');

  useEffect(() => {
    if (watchedZip?.length === 8) {
      handleSearchCep(watchedZip);
    }
  }, [watchedZip]);

  const handleSearchCep = async (cep: string) => {
    setIsSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setValue('street', data.logradouro || '');
        setValue('neighborhood', data.bairro || '');
        setValue('city', data.localidade || '');
        setValue('state', data.uf || '');
        toast({
          title: "CEP Localizado",
          description: `${data.logradouro}, ${data.localidade}`,
        });
      }
    } catch (error) {
      // Falha silenciosa na busca de CEP
    } finally {
      setIsSearchingCep(false);
    }
  };

  const onSubmit = async (data: ClientFormValues) => {
    if (!firestore || !user) return;

    const clientRef = doc(collection(firestore, 'clients'));
    const clientData = {
      id: clientRef.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: {
        zip: data.zipCode,
        street: data.street,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        number: data.number,
        complement: data.complement || '',
      },
      createdAt: serverTimestamp(),
    };

    setDoc(clientRef, clientData).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: clientRef.path,
        operation: 'create',
        requestResourceData: clientData
      }));
    });

    toast({
      title: "Cadastro Realizado",
      description: data.name ? `${data.name} salvo no banco.` : "Cliente sem nome salvo no banco.",
    });
    
    setIsModalOpen(false);
    reset();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row overflow-x-hidden">
      <DashboardSidebar />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-8 mt-16 md:mt-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-xl md:text-3xl font-black tracking-tighter text-white uppercase">Meus Clientes</h2>
            </div>
            <p className="text-muted-foreground text-[8px] md:text-[10px] uppercase tracking-[0.4em] font-medium">Base de Dados Cloud</p>
          </motion.div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-black font-black uppercase tracking-widest px-8 h-12 md:h-14 rounded-2xl hover:shadow-[0_0_30px_rgba(255,95,31,0.6)] hover:bg-primary transition-all gap-3 active:scale-95">
                <Plus className="w-5 h-5" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-white/10 text-white p-0 rounded-3xl">
              <DialogHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
                <DialogTitle className="text-xl font-black uppercase tracking-tighter text-primary flex items-center gap-2">
                  <Plus className="w-6 h-6" /> Novo Cadastro
                </DialogTitle>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Os campos são opcionais para preenchimento rápido</p>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nome Completo</Label>
                    <Input {...register('name')} placeholder="Ex: João Silva Ltda" className="bg-black/40 border-white/10 h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">WhatsApp / Contato</Label>
                    <Input {...register('phone')} placeholder="(00) 00000-0000" className="bg-black/40 border-white/10 h-12" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">E-mail Comercial</Label>
                    <Input {...register('email')} type="email" placeholder="cliente@empresa.com" className="bg-black/40 border-white/10 h-12" />
                    {errors.email && <p className="text-[10px] text-destructive">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-6">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Localização</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">CEP</Label>
                      <div className="relative">
                        <Input {...register('zipCode')} maxLength={8} placeholder="00000000" className="bg-black/40 border-white/10 h-12 pr-10" />
                        {isSearchingCep && <Loader2 className="w-4 h-4 text-primary animate-spin absolute right-3 top-4" />}
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Rua / Logradouro</Label>
                      <Input {...register('street')} className="bg-black/40 border-white/10 h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Bairro</Label>
                      <Input {...register('neighborhood')} className="bg-black/40 border-white/10 h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Cidade</Label>
                      <Input {...register('city')} className="bg-black/40 border-white/10 h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">UF</Label>
                      <Input {...register('state')} className="bg-black/40 border-white/10 h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Número</Label>
                      <Input {...register('number')} placeholder="123" className="bg-black/40 border-white/10 h-12" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Complemento</Label>
                      <Input {...register('complement')} placeholder="Bloco / Sala / Andar" className="bg-black/40 border-white/10 h-12" />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest rounded-2xl">
                  Gravar Cadastro
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {clients?.map((client, idx) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-white/5 border-white/5 hover:border-primary/30 transition-all group cursor-pointer overflow-hidden">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-black text-white uppercase tracking-tight truncate">
                        {client.name || 'Sem Nome'}
                      </h4>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">ID: #{client.id.slice(-4)}</p>
                    </div>

                    <div className="space-y-2 pt-2">
                      {client.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3 text-primary" />
                          {client.phone}
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3 text-primary" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {(client.address?.city || client.address?.state) && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          {client.address.city} {client.address.state && `- ${client.address.state}`}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="col-span-full flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          )}

          {!isLoading && (!clients || clients.length === 0) && (
            <div className="col-span-full text-center py-20 opacity-30">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xs uppercase tracking-[0.3em]">Nenhum cliente cadastrado</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
