import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Package,
  AlertTriangle,
  Users,
  CreditCard,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  Plus,
  Receipt,
  FileText,
  RotateCcw,
  Compass
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../lib/api.js';
import { Sale } from '../types/index.js';
import { ReceiptModal } from '../components/common/ReceiptModal.js';

interface DashboardPageProps {
  onNavigate: (route: string) => void;
  onOpenTour?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenTour }) => {
  const { user, company } = useAuth();
  const { error } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);

  const curr = company?.currency || 'Kz';

  const formatCurrency = (val: number) => {
    return `${(val || 0).toLocaleString('pt-PT')} ${curr}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboard();
      setData(res);
    } catch (e: any) {
      error('Erro ao carregar dados do painel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const chartData = useMemo(() => {
    if (!data?.salesTrend) return [];
    return data.salesTrend.map((item: any) => ({
      date: item.date,
      vendas: item.total,
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {getGreeting()}, {user?.name.split(' ')[0]} 👋
            </h1>
            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {company?.name || 'VendaFácil'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Aqui está o resumo financeiro e operacional do seu negócio em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('pdv')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nova Venda</span>
          </button>
          <button
            onClick={() => onNavigate('ia')}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-purple-600/20 transition-all"
            title="Perguntar à Inteligência Artificial"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Perguntar à IA</span>
          </button>
        </div>
      </div>

      {/* Guided Tour Quick-Start Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-md shadow-emerald-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-emerald-700/30">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-[10px] uppercase font-extrabold tracking-wider text-emerald-300">
                Tour Guiado
              </span>
              <span className="text-xs text-emerald-200/90 font-semibold">Novo no VendaFácil?</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
              Guia Passo a Passo: Aprenda a Faturar em 3 Minutos
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Veja como registar o seu 1º produto, realizar a 1ª venda no PDV, cadastrar clientes, gerir fiado e tire qualquer dúvida diretamente com a nossa IA.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          <button
            onClick={() => (onOpenTour ? onOpenTour() : onNavigate('tour'))}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>Iniciar Tour Guiado</span>
          </button>
          <button
            onClick={() => onNavigate('ia')}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-300" />
            <span>Dúvidas com IA</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner if any */}
      {data?.lowStockProducts && data.lowStockProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-900"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold">
                Atenção: {data.lowStockProducts.length} produto(s) com stock crítico ou em ruptura!
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {data.lowStockProducts.slice(0, 2).map((p: any) => `${p.name} (${p.stockQuantity} un)`).join(', ')}
                {data.lowStockProducts.length > 2 ? '...' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('stock')}
            className="text-xs font-bold bg-amber-200/70 hover:bg-amber-200 text-amber-900 px-3 py-1.5 rounded-xl transition-colors shrink-0"
          >
            Repor Stock
          </button>
        </motion.div>
      )}

      {/* 4 Main Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Vendas Hoje */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Vendas de Hoje</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(data?.metrics?.todaySales || 0)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-600 font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{data?.metrics?.todaySalesCount || 0} vendas efetuadas</span>
          </div>
        </div>

        {/* Card 2: Lucro Estimado */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:border-teal-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Lucro Estimado</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-teal-700 mt-2">
            {formatCurrency(data?.metrics?.todayProfit || 0)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-teal-600 font-bold">
            <span>Margem líquida real</span>
          </div>
        </div>

        {/* Card 3: Produtos Vendidos */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Produtos Vendidos</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-2">
            {data?.metrics?.todayItemsCount || 0} <span className="text-sm font-semibold text-slate-400">un</span>
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-blue-600 font-bold">
            <span>{data?.metrics?.totalProducts || 0} ativos no catálogo</span>
          </div>
        </div>

        {/* Card 4: Fiado a Receber */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Fiado a Receber</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-amber-700 mt-2">
            {formatCurrency(data?.metrics?.pendingReceivables || 0)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-600 font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>{data?.metrics?.receivablesCount || 0} dívidas pendentes</span>
          </div>
        </div>
      </div>

      {/* Sales Trend Chart & Top Products Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Sales Chart (2 columns on large) */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Evolução de Vendas (Últimos 7 Dias)</h3>
              <p className="text-xs text-slate-500">Faturamento diário em {curr}</p>
            </div>
            <button
              onClick={() => onNavigate('relatorios')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>Ver Relatórios</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Faturamento']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="vendas"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem dados suficientes para exibir gráfico
              </div>
            )}
          </div>
        </div>

        {/* Top 5 Products Ranking */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900">Produtos Mais Vendidos</h3>
            <span className="text-[11px] text-slate-400 font-medium">Top 5</span>
          </div>

          <div className="space-y-3.5">
            {data?.topProducts && data.topProducts.length > 0 ? (
              data.topProducts.slice(0, 5).map((prod: any, idx: number) => {
                const maxQty = data.topProducts[0]?.totalQuantity || 1;
                const percent = Math.round((prod.totalQuantity / maxQty) * 100);

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 truncate">{prod.name}</span>
                      </div>
                      <span className="text-slate-900 font-bold shrink-0 ml-2">
                        {prod.totalQuantity} un
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhum produto vendido ainda
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts Grid */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl shadow-slate-900/10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
          Ações Rápidas do Gestor
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={() => onNavigate('pdv')}
            className="p-3.5 rounded-2xl bg-slate-800 hover:bg-emerald-950/60 hover:border-emerald-500 border border-slate-700/80 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="block text-xs font-bold text-white">Nova Venda</span>
            <span className="text-[10px] text-slate-400">PDV Rápido</span>
          </button>

          <button
            onClick={() => onNavigate('produtos')}
            className="p-3.5 rounded-2xl bg-slate-800 hover:bg-blue-950/60 hover:border-blue-500 border border-slate-700/80 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
            <span className="block text-xs font-bold text-white">Novo Produto</span>
            <span className="text-[10px] text-slate-400">Cadastrar item</span>
          </button>

          <button
            onClick={() => onNavigate('caixa')}
            className="p-3.5 rounded-2xl bg-slate-800 hover:bg-purple-950/60 hover:border-purple-500 border border-slate-700/80 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="block text-xs font-bold text-white">Gerir Caixa</span>
            <span className="text-[10px] text-slate-400">Abrir / Fechar</span>
          </button>

          <button
            onClick={() => onNavigate('fiado')}
            className="p-3.5 rounded-2xl bg-slate-800 hover:bg-amber-950/60 hover:border-amber-500 border border-slate-700/80 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="block text-xs font-bold text-white">Cobrar Fiado</span>
            <span className="text-[10px] text-slate-400">Lembretes WhatsApp</span>
          </button>

          <button
            onClick={() => onNavigate('despesas')}
            className="p-3.5 rounded-2xl bg-slate-800 hover:bg-rose-950/60 hover:border-rose-500 border border-slate-700/80 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <span className="block text-xs font-bold text-white">Registar Despesa</span>
            <span className="text-[10px] text-slate-400">Custos diários</span>
          </button>

          <button
            onClick={() => onNavigate('ia')}
            className="p-3.5 rounded-2xl bg-slate-800 hover:bg-indigo-950/60 hover:border-indigo-500 border border-slate-700/80 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="block text-xs font-bold text-white">Consultor IA</span>
            <span className="text-[10px] text-slate-400">Perguntas de lucro</span>
          </button>
        </div>
      </div>

      {/* Recent Sales Table / Feed */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Últimas Vendas Realizadas</h3>
            <p className="text-xs text-slate-500">Histórico imediato das transações</p>
          </div>
          <button
            onClick={() => onNavigate('pdv')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            Ver Todas
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {data?.recentSales && data.recentSales.length > 0 ? (
            data.recentSales.map((sale: Sale) => (
              <div
                key={sale.id}
                className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-xl transition-colors cursor-pointer"
                onClick={() => setSelectedSaleForReceipt(sale)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">#{sale.saleNumber}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(sale.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {sale.customerName || 'Cliente Balcão'} • {sale.items.length} item(s)
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-sm text-slate-900 block">
                    {formatCurrency(sale.total)}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {sale.paymentMethod.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma venda registada hoje.
            </div>
          )}
        </div>
      </div>

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
