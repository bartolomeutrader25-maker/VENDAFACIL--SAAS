import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Unlock,
  DollarSign,
  Clock,
  History,
  CheckCircle2,
  AlertTriangle,
  X,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CashRegister, CashMovement } from '../types/index.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const CashRegisterPage: React.FC = () => {
  const { company, user } = useAuth();
  const { success, error, warning } = useToast();

  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null);
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  // Open Modal
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState<number>(5000);
  const [openNotes, setOpenNotes] = useState('');

  // Movement Modal (Sangria / Suprimento)
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'entrada' | 'saida'>('saida');
  const [movementAmount, setMovementAmount] = useState<number>(0);
  const [movementReason, setMovementReason] = useState('');

  // Close Modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [actualBalance, setActualBalance] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');

  const curr = company?.currency || 'Kz';

  const formatCurrency = (val: number) => {
    return `${(val || 0).toLocaleString('pt-PT')} ${curr}`;
  };

  const loadCashData = async () => {
    try {
      setLoading(true);
      const [currentRes, historyRes] = await Promise.all([
        api.getCurrentCashRegister(),
        api.getCashRegisterHistory(),
      ]);
      setCurrentRegister(currentRes.cashRegister);
      setHistory(historyRes || []);
      if (currentRes.cashRegister) {
        setActualBalance(currentRes.cashRegister.currentBalance);
      }
    } catch (e: any) {
      error('Erro ao carregar dados do caixa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashData();
  }, []);

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.openCashRegister({
        openingBalance: Number(openingBalance) || 0,
        notes: openNotes,
      });
      setCurrentRegister(res);
      success('Caixa aberto com sucesso!');
      setIsOpenModalOpen(false);
      loadCashData();
    } catch (e: any) {
      error(e.message || 'Erro ao abrir caixa');
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (movementAmount <= 0) return;
    try {
      const res = await api.addCashMovement({
        type: movementType,
        amount: Number(movementAmount),
        reason: movementReason,
      });
      setCurrentRegister(res);
      success(movementType === 'saida' ? 'Sangria registada com sucesso!' : 'Suprimento registado!');
      setIsMovementModalOpen(false);
      setMovementAmount(0);
      setMovementReason('');
    } catch (e: any) {
      error(e.message || 'Erro ao registar movimento');
    }
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.closeCashRegister({
        actualBalance: Number(actualBalance) || 0,
        notes: closeNotes,
      });
      success('Caixa fechado com sucesso!');
      setIsCloseModalOpen(false);
      setCurrentRegister(null);
      loadCashData();
    } catch (e: any) {
      error(e.message || 'Erro ao fechar caixa');
    }
  };

  const expectedClosingBalance = currentRegister ? currentRegister.currentBalance : 0;
  const difference = actualBalance - expectedClosingBalance;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Gestão de Caixa
            </h1>
            <span
              className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                currentRegister?.status === 'aberto'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {currentRegister?.status === 'aberto' ? '● Caixa Aberto' : 'Caixa Fechado'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Abertura, fecho, sangrias e conciliação de numerário diário
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentRegister?.status === 'aberto' ? (
            <>
              <button
                onClick={() => {
                  setMovementType('saida');
                  setIsMovementModalOpen(true);
                }}
                className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3 py-2 rounded-xl font-bold text-xs transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Sangria</span>
              </button>
              <button
                onClick={() => {
                  setMovementType('entrada');
                  setIsMovementModalOpen(true);
                }}
                className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 px-3 py-2 rounded-xl font-bold text-xs transition-colors"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Suprimento</span>
              </button>
              <button
                onClick={() => setIsCloseModalOpen(true)}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md shadow-rose-600/20 transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Fechar Caixa</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsOpenModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all"
            >
              <Unlock className="w-4 h-4 stroke-[3]" />
              <span>Abrir Novo Caixa</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-white rounded-2xl border border-slate-200/80 max-w-xs">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'current'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Caixa Atual
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Histórico de Fechos
        </button>
      </div>

      {/* TAB 1: CURRENT ACTIVE CASH REGISTER */}
      {activeTab === 'current' ? (
        currentRegister?.status === 'aberto' ? (
          <div className="space-y-4">
            {/* 4 Overview Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-bold text-slate-500">Saldo Atual em Caixa</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                  {formatCurrency(currentRegister.currentBalance)}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">Físico esperado na gaveta</span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-bold text-slate-500">Fundo Inicial</span>
                <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
                  {formatCurrency(currentRegister.openingBalance)}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">Troco de abertura</span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-bold text-slate-500">Vendas em Numerário</span>
                <p className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
                  {formatCurrency(currentRegister.totalSalesCash)}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">Entradas de vendas</span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-bold text-slate-500">Outros Métodos (TPA/Exp)</span>
                <p className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
                  {formatCurrency(currentRegister.totalSalesOther)}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">Não afeta a gaveta física</span>
              </div>
            </div>

            {/* Movements List for the current session */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Movimentações Desta Sessão</h3>
                  <p className="text-xs text-slate-500">
                    Aberto em {new Date(currentRegister.openedAt).toLocaleString('pt-PT')} por {currentRegister.userName}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {currentRegister.movements && currentRegister.movements.length > 0 ? (
                  currentRegister.movements.map((mov) => {
                    const isEntry = mov.type === 'entrada';
                    return (
                      <div key={mov.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isEntry ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isEntry ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 capitalize">
                              {mov.type === 'entrada' ? 'Suprimento (Entrada)' : 'Sangria (Retirada)'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {mov.reason || 'Sem motivo'} • {new Date(mov.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <span className={`font-black text-sm ${isEntry ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isEntry ? `+${formatCurrency(mov.amount)}` : `-${formatCurrency(mov.amount)}`}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Nenhuma sangria ou suprimento registado nesta sessão de caixa.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Empty state when closed */
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-2xs">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900">O caixa está fechado no momento</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              Abra uma nova sessão de caixa informando o fundo de maneio inicial para começar a registar vendas e controlar trocos.
            </p>
            <button
              onClick={() => setIsOpenModalOpen(true)}
              className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 px-6 rounded-2xl shadow-md shadow-emerald-600/20 transition-all"
            >
              Abrir Caixa Agora
            </button>
          </div>
        )
      ) : (
        /* TAB 2: CASH REGISTER CLOSING HISTORY */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-base text-slate-900">Histórico de Fechos Anteriores</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 sm:px-5">Abertura / Fecho</th>
                  <th className="p-3.5 sm:px-4">Operador</th>
                  <th className="p-3.5 sm:px-4 text-right">Fundo Inicial</th>
                  <th className="p-3.5 sm:px-4 text-right">Vendas Dinheiro</th>
                  <th className="p-3.5 sm:px-4 text-right">Saldo Final Físico</th>
                  <th className="p-3.5 sm:px-4 text-center">Diferença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {history.map((reg) => {
                  const diff = reg.difference || 0;
                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 sm:px-5">
                        <p className="font-bold text-slate-900">
                          {new Date(reg.openedAt).toLocaleDateString('pt-PT')}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(reg.openedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} até{' '}
                          {reg.closedAt ? new Date(reg.closedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : 'Em aberto'}
                        </p>
                      </td>
                      <td className="p-3.5 sm:px-4 font-semibold text-slate-700">{reg.userName}</td>
                      <td className="p-3.5 sm:px-4 text-right text-slate-500">{formatCurrency(reg.openingBalance)}</td>
                      <td className="p-3.5 sm:px-4 text-right font-bold text-emerald-700">{formatCurrency(reg.totalSalesCash)}</td>
                      <td className="p-3.5 sm:px-4 text-right font-black text-slate-900">{formatCurrency(reg.actualBalance || 0)}</td>
                      <td className="p-3.5 sm:px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-black text-[10px] ${
                            diff === 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : diff > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {diff === 0 ? 'Exato' : diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      Nenhum fecho de caixa histórico registado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Open Cash Register Modal */}
      <AnimatePresence>
        {isOpenModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-base text-slate-900">Abertura de Caixa</h3>
                <button
                  onClick={() => setIsOpenModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleOpenRegister} className="py-4 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fundo de Troco Inicial ({curr}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-black text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Valor em notas e moedas na gaveta ao iniciar o dia.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Observações (Opcional)</label>
                  <input
                    type="text"
                    value={openNotes}
                    onChange={(e) => setOpenNotes(e.target.value)}
                    placeholder="Ex: Turno da manhã"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpenModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-sm"
                  >
                    Confirmar Abertura
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Movement Modal (Sangria / Suprimento) */}
      <AnimatePresence>
        {isMovementModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-base text-slate-900">
                  {movementType === 'saida' ? 'Registar Sangria (Retirada)' : 'Registar Suprimento (Entrada)'}
                </h3>
                <button
                  onClick={() => setIsMovementModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddMovement} className="py-4 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor ({curr}) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-black text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Motivo da Movimentação *</label>
                  <input
                    type="text"
                    required
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    placeholder="Ex: Pagamento Fornecedor de Pão / Reforço Troco"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMovementModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-sm"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Close Cash Register Modal with Difference Reconciliation */}
      <AnimatePresence>
        {isCloseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-base text-slate-900">Fecho de Caixa & Conciliação</h3>
                <button
                  onClick={() => setIsCloseModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCloseRegister} className="py-4 space-y-3.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Saldo Teórico Esperado:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(expectedClosingBalance)}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Valor Físico Contado na Gaveta ({curr}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={actualBalance}
                    onChange={(e) => setActualBalance(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-black text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Difference indicator */}
                <div
                  className={`p-3 rounded-2xl border flex justify-between items-center font-bold ${
                    difference === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : difference > 0
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <span>Diferença / Quebra:</span>
                  <span>{difference === 0 ? '0 Kz (Exato)' : formatCurrency(difference)}</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Observações do Fecho</label>
                  <input
                    type="text"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="Ex: Turno encerrado sem divergências"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCloseModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-sm"
                  >
                    Confirmar Fecho
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
