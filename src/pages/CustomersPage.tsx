import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageSquare,
  CreditCard,
  History,
  X,
  Check,
  ShoppingBag,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, Sale } from '../types/index.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { ReceiptModal } from '../components/common/ReceiptModal.js';

export const CustomersPage: React.FC = () => {
  const { company } = useAuth();
  const { success, error, warning } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [nif, setNif] = useState('');
  const [notes, setNotes] = useState('');

  // Customer History Modal
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);

  const curr = company?.currency || 'Kz';

  const formatCurrency = (val: number) => {
    return `${(val || 0).toLocaleString('pt-PT')} ${curr}`;
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const list = await api.getCustomers();
      setCustomers(list);
    } catch (e: any) {
      error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNif('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setNif(c.nif || '');
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      warning('Preencha o nome do cliente');
      return;
    }

    try {
      const payload = {
        name,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        nif: nif.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingCustomer) {
        const updated = await api.updateCustomer(editingCustomer.id, payload);
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        success('Cliente atualizado!');
      } else {
        const created = await api.createCustomer(payload);
        setCustomers((prev) => [created, ...prev]);
        success('Cliente registado com sucesso!');
      }
      setIsModalOpen(false);
    } catch (e: any) {
      error('Erro ao guardar cliente');
    }
  };

  const openCustomerHistory = async (cust: Customer) => {
    setHistoryCustomer(cust);
    try {
      setLoadingHistory(true);
      const res = await api.getCustomerHistory(cust.id);
      setCustomerSales(res.sales || []);
    } catch (e: any) {
      error('Erro ao carregar histórico');
    } finally {
      setLoadingHistory(false);
    }
  };

  const openWhatsApp = (phoneNum?: string, custName?: string) => {
    if (!phoneNum) {
      warning('Cliente não possui número de telefone registado');
      return;
    }
    const cleanPhone = phoneNum.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá ${custName || ''}, uma mensagem da ${company?.name || 'VendaFácil'}!`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });
  }, [customers, searchTerm]);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Gestão de Clientes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {customers.length} clientes registados • Histórico de compras e dívidas de fiado
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Customer List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-50 to-teal-100 text-emerald-800 font-black text-base flex items-center justify-center shrink-0">
                    {cust.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate">{cust.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{cust.phone || 'Sem telefone'}</span>
                    </p>
                  </div>
                </div>

                {cust.totalDebt > 0 && (
                  <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full shrink-0">
                    Fiado: {formatCurrency(cust.totalDebt)}
                  </span>
                )}
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Gasto</span>
                  <span className="font-bold text-slate-800">{formatCurrency(cust.totalPurchases)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Saldo Devedor</span>
                  <span className={`font-black ${cust.totalDebt > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                    {formatCurrency(cust.totalDebt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
              <button
                onClick={() => openCustomerHistory(cust)}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                <span>Histórico</span>
              </button>

              <div className="flex items-center gap-1.5">
                {cust.phone && (
                  <button
                    onClick={() => openWhatsApp(cust.phone, cust.name)}
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                    title="Enviar WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => openEditModal(cust)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200/80">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">Nenhum cliente encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Registe os seus clientes para controlar vendas e fiado</p>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-base text-slate-900">
                  {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCustomer} className="py-4 space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Teresa da Conceição"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+244 923 000 000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">NIF / BI (Opcional)</label>
                    <input
                      type="text"
                      value={nif}
                      onChange={(e) => setNif(e.target.value)}
                      placeholder="000000000LA000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Endereço / Bairro</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: Maianga, Rua 4"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Observações Internas</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Cliente VIP / Paga sempre no fim do mês"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-sm"
                  >
                    Guardar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer History Modal */}
      <AnimatePresence>
        {historyCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-base text-slate-900">Histórico de Compras</h3>
                  <p className="text-xs text-slate-500">{historyCustomer.name}</p>
                </div>
                <button
                  onClick={() => setHistoryCustomer(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                {loadingHistory ? (
                  <p className="text-center py-6 text-xs text-slate-400">A carregar compras...</p>
                ) : customerSales.length > 0 ? (
                  customerSales.map((sale) => (
                    <div
                      key={sale.id}
                      onClick={() => setSelectedSaleForReceipt(sale)}
                      className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">Venda #{sale.saleNumber}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(sale.createdAt).toLocaleDateString('pt-PT')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {sale.items.length} item(s) • Pagamento: {sale.paymentMethod.replace('_', ' ')}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-sm text-slate-900 block">
                          {formatCurrency(sale.total)}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold hover:underline">
                          Ver Recibo →
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-xs text-slate-400">
                    Nenhuma compra registada para este cliente.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Digital Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedSaleForReceipt}
        onClose={() => setSelectedSaleForReceipt(null)}
        sale={selectedSaleForReceipt}
        company={company}
      />
    </div>
  );
};
