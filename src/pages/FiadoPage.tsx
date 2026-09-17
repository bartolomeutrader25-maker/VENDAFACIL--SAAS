import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Search,
  MessageSquare,
  CheckCircle2,
  DollarSign,
  Clock,
  AlertCircle,
  X,
  Check,
  ChevronRight,
  Filter,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Receivable, PaymentMethod } from '../types/index.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const FiadoPage: React.FC = () => {
  const { company } = useAuth();
  const { success, error, warning } = useToast();

  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('pending');

  // Pay Modal State
  const [payingReceivable, setPayingReceivable] = useState<Receivable | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('dinheiro');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const curr = company?.currency || 'Kz';

  const formatCurrency = (val: number) => {
    return `${(val || 0).toLocaleString('pt-PT')} ${curr}`;
  };

  const loadReceivables = async () => {
    try {
      setLoading(true);
      const list = await api.getReceivables();
      setReceivables(list);
    } catch (e: any) {
      error('Erro ao carregar contas de fiado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivables();
  }, []);

  const totalPending = useMemo(() => {
    return receivables
      .filter((r) => r.status !== 'pago')
      .reduce((acc, r) => acc + (r.totalAmount - r.paidAmount), 0);
  }, [receivables]);

  const totalCollected = useMemo(() => {
    return receivables.reduce((acc, r) => acc + r.paidAmount, 0);
  }, [receivables]);

  const pendingCount = useMemo(() => {
    return receivables.filter((r) => r.status !== 'pago').length;
  }, [receivables]);

  const openPayModal = (rec: Receivable) => {
    setPayingReceivable(rec);
    setPayAmount(rec.totalAmount - rec.paidAmount);
    setPayMethod('dinheiro');
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingReceivable || payAmount <= 0) return;

    try {
      setIsSubmitting(true);
      const updated = await api.payReceivable(payingReceivable.id, {
        amount: Number(payAmount),
        paymentMethod: payMethod,
      });

      setReceivables((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      success(`Pagamento de ${formatCurrency(payAmount)} registado!`);
      setPayingReceivable(null);
    } catch (e: any) {
      error(e.message || 'Erro ao amortizar fiado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendWhatsAppReminder = (rec: Receivable) => {
    if (!rec.customerPhone) {
      warning('Este cliente não tem telefone cadastrado');
      return;
    }

    const remaining = rec.totalAmount - rec.paidAmount;
    const cleanPhone = rec.customerPhone.replace(/\D/g, '');
    const msg = `Olá *${rec.customerName}*, esperamos que esteja tudo bem!\n\nLembramos gentilmente da conta pendente no valor de *${formatCurrency(remaining)}* na *${company?.name || 'VendaFácil'}*.\n\nCaso já tenha efetuado o pagamento, por favor desconsidere esta mensagem. Obrigado! 🙏`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredReceivables = useMemo(() => {
    return receivables.filter((r) => {
      const matchSearch =
        r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.customerPhone && r.customerPhone.includes(searchTerm));

      let matchStatus = true;
      if (statusFilter === 'pending') matchStatus = r.status !== 'pago';
      if (statusFilter === 'paid') matchStatus = r.status === 'pago';

      return matchSearch && matchStatus;
    });
  }, [receivables, searchTerm, statusFilter]);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Contas a Receber (Fiado)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Controlo de vendas a crédito, amortizações e lembretes por WhatsApp
          </p>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">Total a Receber (Pendente)</span>
          <p className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
            {formatCurrency(totalPending)}
          </p>
          <span className="text-[11px] text-amber-600 font-bold">{pendingCount} conta(s) em aberto</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">Total Já Liquidado</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {formatCurrency(totalCollected)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Valores recuperados com sucesso</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">Taxa de Recuperação</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {totalPending + totalCollected > 0
              ? `${Math.round((totalCollected / (totalPending + totalCollected)) * 100)}%`
              : '100%'}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Índice de liquidação do fiado</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Pendentes ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'paid'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Liquidados
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Todos
            </button>
          </div>
        </div>
      </div>

      {/* Receivables List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReceivables.map((rec) => {
          const remaining = rec.totalAmount - rec.paidAmount;
          const isPaid = rec.status === 'pago';
          const isPartial = rec.status === 'parcial';

          return (
            <div
              key={rec.id}
              className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                isPaid ? 'border-slate-200/80 opacity-80' : 'border-amber-200 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{rec.customerName}</h4>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPartial
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isPaid ? 'Liquidado' : isPartial ? 'Parcial' : 'Pendente'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {rec.customerPhone ? `Tel: ${rec.customerPhone}` : 'Sem telefone'} • Venda #{rec.saleNumber}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Saldo a Pagar</span>
                    <span className={`font-black text-base ${isPaid ? 'text-slate-500 line-through' : 'text-amber-700'}`}>
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3.5 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>Pago: {formatCurrency(rec.paidAmount)}</span>
                    <span>Total: {formatCurrency(rec.totalAmount)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round((rec.paidAmount / rec.totalAmount) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">
                  {new Date(rec.createdAt).toLocaleDateString('pt-PT')}
                </span>

                <div className="flex items-center gap-2">
                  {rec.customerPhone && !isPaid && (
                    <button
                      onClick={() => sendWhatsAppReminder(rec)}
                      className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors"
                      title="Enviar Lembrete WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Cobrar</span>
                    </button>
                  )}

                  {!isPaid ? (
                    <button
                      onClick={() => openPayModal(rec)}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-sm"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Amortizar</span>
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Pago
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredReceivables.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200/80">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="font-bold text-slate-700">Nenhuma conta a receber encontrada</p>
            <p className="text-xs text-slate-400 mt-1">Todas as contas foram liquidadas ou não existem dívidas</p>
          </div>
        )}
      </div>

      {/* Pay Settlement Modal */}
      <AnimatePresence>
        {payingReceivable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-base text-slate-900">Receber Fiado</h3>
                  <p className="text-xs text-slate-500">{payingReceivable.customerName}</p>
                </div>
                <button
                  onClick={() => setPayingReceivable(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmPayment} className="py-4 space-y-3.5 text-xs">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex justify-between items-center text-amber-900 font-bold">
                  <span>Saldo Pendente:</span>
                  <span>{formatCurrency(payingReceivable.totalAmount - payingReceivable.paidAmount)}</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor a Receber ({curr}) *</label>
                  <input
                    type="number"
                    min="1"
                    max={payingReceivable.totalAmount - payingReceivable.paidAmount}
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-black text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="dinheiro">Dinheiro (Numerário)</option>
                    <option value="multicaixa_express">Multicaixa Express</option>
                    <option value="transferencia">Transferência Bancária</option>
                    <option value="cartao">TPA / Cartão</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPayingReceivable(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold transition-colors shadow-sm"
                  >
                    Confirmar Recebimento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
