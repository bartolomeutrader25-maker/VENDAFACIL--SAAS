import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  Tag,
  Search,
  X,
  CreditCard,
  Building2,
  TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense } from '../types/index.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const ExpensesPage: React.FC = () => {
  const { company } = useAuth();
  const { success, error, warning } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Aluguer');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');

  const curr = company?.currency || 'Kz';

  const categoriesList = [
    'Aluguer',
    'Salários',
    'Energia & Água',
    'Fornecedores',
    'Transporte & Logística',
    'Internet & Telefone',
    'Manutenção & Reparos',
    'Alimentação Equipa',
    'Outros',
  ];

  const formatCurrency = (val: number) => {
    return `${(val || 0).toLocaleString('pt-PT')} ${curr}`;
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const list = await api.getExpenses();
      setExpenses(list);
    } catch (e: any) {
      error('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((acc, exp) => acc + exp.amount, 0);
  }, [expenses]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) {
      warning('Preencha a descrição e valor da despesa');
      return;
    }

    try {
      const created = await api.createExpense({
        description,
        category,
        amount: Number(amount),
        paymentMethod,
      });

      setExpenses((prev) => [created, ...prev]);
      success('Despesa registada!');
      setIsModalOpen(false);
      setDescription('');
      setAmount(0);
    } catch (e: any) {
      error('Erro ao registar despesa');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Deseja apagar este registo de despesa?')) return;
    try {
      await api.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      success('Despesa removida');
    } catch (e: any) {
      error('Erro ao remover despesa');
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [expenses, searchTerm, selectedCategory]);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Registo de Despesas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Controle de custos fixos, variáveis e saídas operacionais
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-rose-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Nova Despesa</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Total de Despesas Registadas</span>
            <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">
              {formatCurrency(totalExpenses)}
            </p>
            <span className="text-xs text-slate-400 mt-0.5 block">{expenses.length} lançamentos efetuados</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 mb-2 block">Despesas por Categoria</span>
          <div className="flex flex-wrap gap-1.5">
            {categoriesList.slice(0, 5).map((cat) => {
              const catTotal = expenses
                .filter((e) => e.category === cat)
                .reduce((acc, e) => acc + e.amount, 0);
              if (catTotal === 0) return null;
              return (
                <span key={cat} className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                  {cat}: {formatCurrency(catTotal)}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar despesa por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todas as Categorias</option>
            {categoriesList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 sm:px-5">Data</th>
                <th className="p-3.5 sm:px-4">Descrição</th>
                <th className="p-3.5 sm:px-4">Categoria</th>
                <th className="p-3.5 sm:px-4">Pagamento</th>
                <th className="p-3.5 sm:px-4 text-right">Valor</th>
                <th className="p-3.5 sm:px-5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5 sm:px-5 text-slate-500 whitespace-nowrap">
                    {new Date(exp.date).toLocaleDateString('pt-PT')}
                  </td>
                  <td className="p-3.5 sm:px-4 font-bold text-slate-900">
                    {exp.description}
                  </td>
                  <td className="p-3.5 sm:px-4">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-3.5 sm:px-4 text-slate-600 capitalize">
                    {exp.paymentMethod}
                  </td>
                  <td className="p-3.5 sm:px-4 text-right font-black text-rose-600 text-sm">
                    -{formatCurrency(exp.amount)}
                  </td>
                  <td className="p-3.5 sm:px-5 text-right">
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Apagar Despesa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-bold text-slate-700">Nenhuma despesa registada</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
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
                <h3 className="font-black text-base text-slate-900">Nova Despesa</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="py-4 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Descrição do Custo *</label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Renda da Loja referente a Maio"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Categoria</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    >
                      {categoriesList.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Valor ({curr}) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-black focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="dinheiro">Dinheiro (Gaveta / Caixa)</option>
                    <option value="multicaixa_express">Multicaixa Express</option>
                    <option value="transferencia">Transferência Bancária</option>
                    <option value="cartao">Cartão de Débito</option>
                  </select>
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
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-sm"
                  >
                    Gravar Despesa
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
