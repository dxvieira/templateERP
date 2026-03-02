
'use client';

import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, limit } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, Search, Plus, Phone, Mail, X, Save, Trash2, 
  ChevronRight, FileBadge, Lock, ShieldCheck, ArrowRight, Smartphone, MessageCircle, Loader2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function SuppliersContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  // --- SEGURANÇA ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isPassError, setIsPassError] = useState(false);

  // --- GERENCIADOR ---
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '', 
    cnpj: '', 
    email: '', 
    landline: '', 
    mobile: '',
    category: ''
  });

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '@impactoADM') {
      setIsAuthenticated(true);
      setIsPassError(false);
    } else {
      setIsPassError(true);
      setTimeout(() => setIsPassError(false), 500);
    }
  };

  // Auth Guard: Só constrói a query se o usuário estiver autenticado e validado
  const suppliersQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isAuthenticated) return null;
    return query(collection(firestore, 'suppliers'), limit(100));
  }, [firestore, user, isAuthenticated]);

  useEffect(() => {
    if (!suppliersQuery) return;
    
    const unsubscribe = onSnapshot(suppliersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setSuppliers(data);
    }, (error) => {
        // Tratamento de erro conforme solicitado
        if (error.code === 'permission-denied') {
          console.warn('Acesso negado: Verifique suas permissões no Firestore.');
          toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você não tem permissão para listar fornecedores.' });
        }
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'suppliers',
            operation: 'list'
        }));
    });
    return () => unsubscribe();
  }, [suppliersQuery, toast]);

  const openWhatsApp = (number: string) => {
    if (!number) return;
    const cleanNum = number.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanNum}`, '_blank');
  };

  // Memoização da filtragem para performance
  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(term) ||
      s.category?.toLowerCase().includes(term) ||
      (s.cnpj && s.cnpj.includes(searchTerm))
    );
  }, [suppliers, searchTerm]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    
    setIsSubmitting(true);
    const supplierRef = editingSupplier ? doc(firestore, 'suppliers', editingSupplier.id) : doc(collection(firestore, 'suppliers'));

    const payload = {
      ...formData,
      id: supplierRef.id,
      updatedAt: serverTimestamp(),
      ...(editingSupplier ? {} : { createdAt: serverTimestamp() })
    };

    setDoc(supplierRef, payload, { merge: true })
      .then(() => {
        toast({ title: editingSupplier ? "Registro Atualizado" : "Novo Fornecedor Cadastrado" });
        closeModal();
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: supplierRef.path,
          operation: editingSupplier ? 'update' : 'create',
          requestResourceData: payload
        }));
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!firestore) return;
    if (window.confirm("Remover este fornecedor da base permanentemente?")) {
      deleteDoc(doc(firestore, 'suppliers', id))
        .then(() => {
          toast({ title: "Fornecedor Removido" });
          closeModal();
        })
        .catch(() => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `suppliers/${id}`,
            operation: 'delete'
          }));
        });
    }
  }, [firestore, toast]);

  const openModal = useCallback((supplier: any = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ 
        name: supplier.name || '', 
        cnpj: supplier.cnpj || '',
        email: supplier.email || '',
        landline: supplier.landline || '',
        mobile: supplier.mobile || '',
        category: supplier.category || ''
      });
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', cnpj: '', email: '', landline: '', mobile: '', category: '' });
    }
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1, x: isPassError ? [0, -10, 10, -10, 10, 0] : 0 }} className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className={`p-4 rounded-full mb-4 transition-colors duration-300 ${isPassError ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
              <Truck size={32} />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Acesso Restrito</h2>
            <p className="text-zinc-500 text-sm mt-2">Gestão de Fornecedores</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <input type="password" placeholder="Senha Mestra" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className={`w-full bg-zinc-900/50 border rounded-xl py-4 text-center text-white tracking-[0.5em] outline-none transition-all ${isPassError ? 'border-destructive' : 'border-zinc-800 focus:border-primary'}`} />
            <button type="submit" className="w-full py-4 rounded-xl bg-primary text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-2">
              Acessar Cadeia de Suprimentos <ArrowRight size={16} />
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const labelClass = "text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block";
  const inputClass = "w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-primary outline-none transition-colors";

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-x-hidden selection:bg-primary selection:text-black">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 space-y-8 mt-16 md:mt-0">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
             <div className="flex items-center gap-2 mb-2">
               <Truck size={16} className="text-primary" />
               <span className="text-primary text-[10px] font-black uppercase tracking-[0.3em]">Supply Chain</span>
             </div>
             <h1 className="text-4xl font-black text-white tracking-tight uppercase">
               Rede de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Fornecedores</span>
             </h1>
          </div>
          <button onClick={() => openModal()} className="group flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-black font-black uppercase tracking-wider text-[10px] hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,95,31,0.4)]">
            <Plus size={18} /> Novo Fornecedor
          </button>
        </header>

        <div className="relative group max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={20} />
          <input type="text" placeholder="Buscar Fornecedor, Produto ou CNPJ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-600 outline-none transition-all focus:border-primary/50" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredSuppliers.map((supplier) => (
              <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={supplier.id} onClick={() => openModal(supplier)} className="group relative bg-[#09090b] border border-zinc-800 rounded-3xl p-6 cursor-pointer transition-all hover:border-primary/40 hover:bg-zinc-900/40 hover:-translate-y-1">
                <div className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="shrink-0 w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-primary font-black text-xl">
                      {supplier.name.substring(0,2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-white leading-tight truncate group-hover:text-primary transition-colors uppercase">{supplier.name}</h3>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1">{supplier.category || 'Suprimentos Diversos'}</p>
                    </div>
                  </div>
                  <ChevronRight className="text-zinc-800 group-hover:text-primary group-hover:translate-x-1 transition-all" size={20} />
                </div>
                <div className="space-y-2 border-t border-zinc-800/50 pt-4">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase">
                     <Smartphone size={14} className="text-primary" />
                     <span>{supplier.mobile || supplier.landline || 'Sem contato'}</span>
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase">
                     <FileBadge size={14} className="text-zinc-600" />
                     <span className="font-mono">{supplier.cnpj || 'Sem CNPJ'}</span>
                   </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={closeModal}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-[#09090b] border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/30">
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter">{editingSupplier ? 'Editar Fornecedor' : 'Novo Cadastro'}</h2>
                  <button onClick={closeModal} className="p-2 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-800"><X size={20}/></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-[#050505]">
                  <form id="supplierForm" onSubmit={handleSave} className="space-y-8">
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Nome do Fornecedor *</label>
                        <input required className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Acrílicos Industrial" />
                      </div>
                      <div>
                        <label className={labelClass}>CNPJ</label>
                        <input className={inputClass} value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} placeholder="00.000.000/0001-00" />
                      </div>
                      <div>
                        <label className={labelClass}>Categoria / Produto</label>
                        <input className={inputClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Ex: Chapas, Tintas, Lonas..." />
                      </div>
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                          <label className={labelClass}>Celular / WhatsApp</label>
                          <div className="flex gap-2">
                             <input className={`${inputClass} flex-1`} value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} placeholder="(00) 90000-0000" />
                             {formData.mobile && (
                               <button type="button" onClick={() => openWhatsApp(formData.mobile)} className="bg-green-600 p-3 rounded-xl text-white hover:bg-green-500 transition-colors shadow-lg shadow-green-900/20"><MessageCircle size={18} /></button>
                             )}
                          </div>
                       </div>
                       <div>
                          <label className={labelClass}>Telefone Fixo</label>
                          <input className={inputClass} value={formData.landline} onChange={e => setFormData({...formData, landline: e.target.value})} placeholder="(00) 0000-0000" />
                       </div>
                       <div className="md:col-span-2">
                          <label className={labelClass}>E-mail</label>
                          <input type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="comercial@fornecedor.com" />
                       </div>
                    </section>
                  </form>
                </div>

                <div className="p-6 border-t border-zinc-800 bg-zinc-900/30 flex justify-between items-center gap-4">
                  {editingSupplier && (
                    <button type="button" onClick={() => handleDelete(editingSupplier.id)} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors font-black text-[10px] uppercase tracking-widest"><Trash2 size={16} /> Excluir</button>
                  )} 
                  <div className="flex gap-3 ml-auto">
                     <button type="button" onClick={closeModal} className="px-6 py-3 rounded-xl border border-zinc-700 text-white hover:bg-zinc-800 font-black text-[10px] uppercase tracking-widest">Cancelar</button>
                     <button form="supplierForm" type="submit" disabled={isSubmitting} className="px-10 py-3 rounded-xl bg-primary text-black font-black uppercase tracking-widest shadow-[0_0_20px_rgba(255,95,31,0.4)] disabled:opacity-50 flex items-center gap-2">
                       {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Salvar Cadastro</>}
                     </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
      <SuppliersContent />
    </Suspense>
  );
}
