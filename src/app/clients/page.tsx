'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Plus, Building2, Mail, X, Save, Trash2, 
  ChevronRight, FileBadge, MapPin, Smartphone, MessageCircle, Loader2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AdminGuard } from '@/components/auth/AdminGuard';

function ClientsContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '', company: '', cpfCnpj: '', stateInscription: '', email: '', landline: '', mobile: '',
    zip: '', street: '', number: '', neighborhood: '', complement: ''
  });

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'clients'));
  }, [firestore, user]);

  useEffect(() => {
    if (!clientsQuery) return;
    const unsubscribe = onSnapshot(clientsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setClients(data);
    });
    return () => unsubscribe();
  }, [clientsQuery]);

  const openWhatsApp = (number: string) => {
    if (!number) return;
    const cleanNum = number.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanNum}`, '_blank');
  };

  const filteredClients = useMemo(() => clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.cpfCnpj && client.cpfCnpj.includes(searchTerm))
  ), [clients, searchTerm]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    
    setIsSubmitting(true);
    const clientRef = editingClient ? doc(firestore, 'clients', editingClient.id) : doc(collection(firestore, 'clients'));
    const fullAddress = `${formData.street}, ${formData.number} - ${formData.neighborhood}`;

    const payload = {
      ...formData,
      id: clientRef.id,
      address: fullAddress,
      updatedAt: serverTimestamp(),
      ...(editingClient ? {} : { createdAt: serverTimestamp() })
    };

    setDoc(clientRef, payload, { merge: true })
      .then(() => {
        toast({ title: "Cadastro Atualizado" });
        closeModal();
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: clientRef.path,
          operation: editingClient ? 'update' : 'create',
          requestResourceData: payload
        }));
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    if (window.confirm("Remover este parceiro da base permanentemente?")) {
      deleteDoc(doc(firestore, 'clients', id))
        .then(() => {
          toast({ title: "Cliente Removido" });
          closeModal();
        })
        .catch(() => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `clients/${id}`,
            operation: 'delete'
          }));
        });
    }
  };

  const openModal = (client: any = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({ 
        name: client.name || '', company: client.company || '', cpfCnpj: client.cpfCnpj || '',
        stateInscription: client.stateInscription || '', email: client.email || '',
        landline: client.landline || '', mobile: client.mobile || '', zip: client.zip || '',
        street: client.street || '', number: client.number || '', neighborhood: client.neighborhood || '', complement: client.complement || ''
      });
    } else {
      setEditingClient(null);
      setFormData({ 
        name: '', company: '', cpfCnpj: '', stateInscription: '',
        email: '', landline: '', mobile: '',
        zip: '', street: '', number: '', neighborhood: '', complement: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const labelClass = "text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block";
  const inputClass = "w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-colors";

  return (
    <div className="p-4 md:p-8 space-y-8 mt-14 md:mt-0">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <Users size={16} className="text-primary" />
             <span className="text-primary text-[10px] font-black uppercase tracking-[0.3em]">CRM Terminal</span>
           </div>
           <h1 className="text-4xl font-black text-white tracking-tight uppercase">Base de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Parceiros</span></h1>
        </div>
        <button onClick={() => openModal()} className="group flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all shadow-[0_0_20px_rgba(255,95,31,0.4)]"><Plus size={18} /> Novo Cadastro</button>
      </header>

      <div className="relative group max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={20} />
        <input type="text" placeholder="Buscar Cliente, Empresa ou Documento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-600 outline-none transition-all focus:border-primary/50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredClients.map((client) => (
            <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={client.id} onClick={() => openModal(client)} className="group relative bg-[#09090b] border border-zinc-800 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-primary/40 hover:bg-zinc-900/40 hover:-translate-y-0.5">
              <div className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-primary font-black text-lg">{client.name.substring(0,2).toUpperCase()}</div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-white leading-tight truncate group-hover:text-primary transition-colors uppercase">{client.name}</h3>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1 truncate uppercase font-bold mt-0.5"><Building2 size={10} /> {client.company || 'Pessoa Física'}</p>
                  </div>
                </div>
                <ChevronRight className="text-zinc-800 group-hover:text-primary group-hover:translate-x-1 transition-all" size={16} />
              </div>
              <div className="space-y-1.5">
                 <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400"><Smartphone size={12} className="text-zinc-600 group-hover:text-primary transition-colors" /><span>{client.mobile || client.landline || 'Sem contato'}</span></div>
                 <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400"><Mail size={12} className="text-zinc-600 group-hover:text-primary transition-colors" /><span className="truncate">{client.email || 'Sem e-mail'}</span></div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={closeModal}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl bg-[#09090b] border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/30">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">{editingClient ? 'Ficha do Cliente' : 'Novo Cadastro'}</h2>
                <button onClick={closeModal} className="p-2 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-800"><X size={20}/></button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-[#050505]">
                <form id="clientForm" onSubmit={handleSave} className="space-y-8">
                  <section>
                    <h3 className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-white/5 pb-2"><FileBadge size={14} /> Dados Fiscais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="lg:col-span-2"><label className={labelClass}>Nome Completo *</label><input required className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                      <div className="lg:col-span-2"><label className={labelClass}>Razão Social / Fantasia</label><input className={inputClass} value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} /></div>
                      <div><label className={labelClass}>CPF / CNPJ</label><input className={inputClass} value={formData.cpfCnpj} onChange={e => setFormData({...formData, cpfCnpj: e.target.value})} /></div>
                      <div><label className={labelClass}>Inscrição Estadual</label><input className={inputClass} value={formData.stateInscription} onChange={e => setFormData({...formData, stateInscription: e.target.value})} /></div>
                    </div>
                  </section>
                  <section>
                    <h3 className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-white/5 pb-2"><Smartphone size={14} /> Contato</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div><label className={labelClass}>Telefone Fixo</label><input className={inputClass} value={formData.landline} onChange={e => setFormData({...formData, landline: e.target.value})} /></div>
                       <div><label className={labelClass}>Celular / WhatsApp</label><div className="flex gap-2"><input className={`${inputClass} flex-1`} value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />{formData.mobile && <button type="button" onClick={() => openWhatsApp(formData.mobile)} className="bg-green-600 p-3 rounded-xl text-white hover:bg-green-500 transition-colors shadow-lg shadow-green-900/20"><MessageCircle size={18} /></button>}</div></div>
                       <div><label className={labelClass}>E-mail</label><input type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                    </div>
                  </section>
                  <section>
                    <h3 className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-white/5 pb-2"><MapPin size={14} /> Endereço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                       <div><label className={labelClass}>CEP</label><input className={inputClass} value={formData.zip} onChange={e => setFormData({...formData, zip: e.target.value})} /></div>
                       <div className="md:col-span-2"><label className={labelClass}>Rua / Avenida</label><input className={inputClass} value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} /></div>
                       <div><label className={labelClass}>Número</label><input className={inputClass} value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} /></div>
                       <div className="md:col-span-2"><label className={labelClass}>Bairro</label><input className={inputClass} value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} /></div>
                       <div className="md:col-span-2"><label className={labelClass}>Complemento</label><input className={inputClass} value={formData.complement} onChange={e => setFormData({...formData, complement: e.target.value})} /></div>
                    </div>
                  </section>
                </form>
              </div>
              <div className="p-6 border-t border-zinc-800 bg-zinc-900/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                {editingClient && (
                  <button 
                    type="button" 
                    onClick={() => handleDelete(editingClient.id)} 
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors font-black text-[10px] uppercase tracking-widest"
                  >
                    <Trash2 size={16} /> Excluir
                  </button>
                )} 
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:ml-auto">
                   <button 
                     type="button" 
                     onClick={closeModal} 
                     className="w-full sm:w-auto px-6 py-3 rounded-xl border border-zinc-700 text-white hover:bg-zinc-800 font-black text-[10px] uppercase tracking-widest"
                   >
                     Cancelar
                   </button>
                   <button 
                     form="clientForm" 
                     type="submit" 
                     disabled={isSubmitting} 
                     className="w-full sm:w-auto px-10 py-3 rounded-xl bg-primary text-black hover:bg-white transition-all font-black text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(255,95,31,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                   >
                     {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Gravar</>}
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <AdminGuard>
      <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
        <ClientsContent />
      </Suspense>
    </AdminGuard>
  );
}
