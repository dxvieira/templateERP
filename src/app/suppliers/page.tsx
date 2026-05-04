'use client';

import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, limit } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, Search, Plus, X, Save, Trash2, 
  ChevronRight, FileBadge, Smartphone, MessageCircle, Loader2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AdminGuard } from '@/components/auth/AdminGuard';

function SuppliersContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '', cnpj: '', email: '', landline: '', mobile: '', category: ''
  });

  const suppliersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'suppliers'), limit(100));
  }, [firestore, user]);

  useEffect(() => {
    if (!suppliersQuery) return;
    const unsubscribe = onSnapshot(suppliersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setSuppliers(data);
    }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'suppliers', operation: 'list' }));
    });
    return () => unsubscribe();
  }, [suppliersQuery]);

  const openWhatsApp = (number: string) => {
    if (!number) return;
    const cleanNum = number.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanNum}`, '_blank');
  };

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
    const payload = { ...formData, id: supplierRef.id, updatedAt: serverTimestamp(), ...(editingSupplier ? {} : { createdAt: serverTimestamp() }) };

    setDoc(supplierRef, payload, { merge: true })
      .then(() => { toast({ title: editingSupplier ? "Registro Atualizado" : "Novo Fornecedor" }); closeModal(); })
      .catch((err) => { errorEmitter.emit('permission-error', new FirestorePermissionError({ path: supplierRef.path, operation: editingSupplier ? 'update' : 'create', requestResourceData: payload })); })
      .finally(() => setIsSubmitting(false));
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!firestore) return;
    if (window.confirm("Remover permanentemente?")) {
      deleteDoc(doc(firestore, 'suppliers', id))
        .then(() => { toast({ title: "Removido" }); closeModal(); })
        .catch(() => { errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `suppliers/${id}`, operation: 'delete' })); });
    }
  }, [firestore]);

  const openModal = useCallback((supplier: any = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ name: supplier.name || '', cnpj: supplier.cnpj || '', email: supplier.email || '', landline: supplier.landline || '', mobile: supplier.mobile || '', category: supplier.category || '' });
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', cnpj: '', email: '', landline: '', mobile: '', category: '' });
    }
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => { setIsModalOpen(false); setEditingSupplier(null); }, []);

  const labelClass = "text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 block";
  const inputClass = "w-full bg-secondary/50 border border-border rounded-xl p-3 text-sm text-foreground focus:border-primary outline-none transition-colors";

  return (
    <div className="p-4 md:p-8 space-y-8 mt-14 md:mt-0">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-1"
        >
          <div className="flex items-center gap-4">
            {/* Icon Container with orange halo */}
            <motion.div
              animate={{ 
                y: [0, -4, 0],
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-secondary/50 border border-border backdrop-blur-sm overflow-hidden group"
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_70%,#FF5F1F_100%)] opacity-40 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-[1px] bg-background rounded-[15px] z-10 flex items-center justify-center">
                <Truck className="text-primary w-6 h-6" />
              </div>
            </motion.div>

            {/* Title with Orange Shimmering Gradient */}
            <div className="flex flex-col">
              <motion.h1 
                className="text-4xl font-black text-foreground tracking-tighter uppercase leading-none flex items-center gap-2"
              >
                <span>REDE DE</span>
                <motion.span 
                  animate={{ 
                    backgroundImage: [
                      'linear-gradient(90deg, #FF5F1F 0%, #FF8F5F 50%, #FF5F1F 100%)',
                      'linear-gradient(90deg, #FF8F5F 0%, #FF5F1F 50%, #FF8F5F 100%)',
                      'linear-gradient(90deg, #FF5F1F 0%, #FF8F5F 50%, #FF5F1F 100%)'
                    ]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{ backgroundSize: '200% auto' }}
                  className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-600"
                >
                  FORNECEDORES
                </motion.span>
              </motion.h1>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '40%' }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-[2px] bg-gradient-to-r from-primary/50 to-transparent mt-1"
              />
            </div>
          </div>
        </motion.div>
        <button onClick={() => openModal()} className="group flex items-center h-14 gap-4 px-8 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] hover:bg-white hover:scale-105 transition-all shadow-[0_0_25px_rgba(255,95,31,0.4)] active:scale-95"><Plus size={18} /> Novo Fornecedor</button>
      </header>

      <div className="relative group max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
        <input type="text" placeholder="Buscar Fornecedor, Produto ou CNPJ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-4 text-foreground placeholder-zinc-600 outline-none transition-all focus:border-primary/50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredSuppliers.map((supplier) => (
            <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={supplier.id} onClick={() => openModal(supplier)} className="group relative bg-card border border-border rounded-3xl p-6 cursor-pointer transition-all hover:border-primary/40 hover:bg-secondary/40 hover:-translate-y-1">
              <div className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="shrink-0 w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center text-primary font-black text-xl">{supplier.name.substring(0,2).toUpperCase()}</div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors uppercase">{supplier.name}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">{supplier.category || 'Suprimentos Diversos'}</p>
                  </div>
                </div>
                <ChevronRight className="text-zinc-800 group-hover:text-primary group-hover:translate-x-1 transition-all" size={20} />
              </div>
              <div className="space-y-2 border-t border-border/50 pt-4">
                 <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase"><Smartphone size={14} className="text-primary" /><span>{supplier.mobile || supplier.landline || 'Sem contato'}</span></div>
                 <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase"><FileBadge size={14} className="text-muted-foreground" /><span className="font-mono">{supplier.cnpj || 'Sem CNPJ'}</span></div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={closeModal}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-border bg-secondary/30">
                <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">{editingSupplier ? 'Editar Fornecedor' : 'Novo Cadastro'}</h2>
                <button onClick={closeModal} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary"><X size={20}/></button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-background">
                <form id="supplierForm" onSubmit={handleSave} className="space-y-8">
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><label className={labelClass}>Nome do Fornecedor *</label><input required className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Acrílicos Industrial" /></div>
                    <div><label className={labelClass}>CNPJ</label><input className={inputClass} value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} placeholder="00.000.000/0001-00" /></div>
                    <div><label className={labelClass}>Categoria / Produto</label><input className={inputClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Ex: Chapas, Tintas..." /></div>
                  </section>
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div><label className={labelClass}>Celular / WhatsApp</label><div className="flex gap-2"><input className={`${inputClass} flex-1`} value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} placeholder="(00) 90000-0000" />{formData.mobile && <button type="button" onClick={() => openWhatsApp(formData.mobile)} className="bg-green-600 p-3 rounded-xl text-foreground hover:bg-green-500 transition-colors shadow-lg shadow-green-900/20"><MessageCircle size={18} /></button>}</div></div>
                     <div><label className={labelClass}>Telefone Fixo</label><input className={inputClass} value={formData.landline} onChange={e => setFormData({...formData, landline: e.target.value})} placeholder="(00) 0000-0000" /></div>
                     <div className="md:col-span-2"><label className={labelClass}>E-mail</label><input type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="comercial@fornecedor.com" /></div>
                  </section>
                </form>
              </div>
              <div className="p-6 border-t border-border bg-secondary/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                {editingSupplier && (
                  <button 
                    type="button" 
                    onClick={() => handleDelete(editingSupplier.id)} 
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-foreground transition-colors font-black text-[10px] uppercase tracking-widest"
                  >
                    <Trash2 size={16} /> Excluir
                  </button>
                )} 
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:ml-auto">
                   <button 
                     type="button" 
                     onClick={closeModal} 
                     className="w-full sm:w-auto px-6 py-3 rounded-xl border border-border text-foreground hover:bg-secondary font-black text-[10px] uppercase tracking-widest"
                   >
                     Cancelar
                   </button>
                   <button 
                     form="supplierForm" 
                     type="submit" 
                     disabled={isSubmitting} 
                     className="w-full sm:w-auto px-10 py-3 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest shadow-[0_0_20px_rgba(255,95,31,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                   >
                     {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Salvar Cadastro</>}
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

export default function SuppliersPage() {
  return (
    <AdminGuard>
      <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
        <SuppliersContent />
      </Suspense>
    </AdminGuard>
  );
}
