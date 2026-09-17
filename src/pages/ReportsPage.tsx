import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  Printer,
  Package,
  CreditCard,
  PieChart as PieIcon,
  ShoppingBag
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const ReportsPage: React.FC = () => {
  const { company } = useAuth();
  const { error, success } = useToast();

  const [period, setPeriod] = useState<string>('30days');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const curr = company?.currency || 'Kz';

  const formatCurrency = (val: number) => {
    return `${(val || 0).toLocaleString('pt-PT')} ${curr}`;
  };

  const loadReports = async (selectedPeriod: string) => {
    try {
      setLoading(true);
      const res = await api.getReports(selectedPeriod);
      setData(res);
    } catch (e: any) {
      error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(period);
  }, [period]);

  const handleExportCSV = () => {
    if (!data?.chartData) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Data,Vendas,Lucro\n' +
      data.chartData.map((e: any) => `${e.date},${e.total},${e.profit}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_vendas_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Relatório CSV exportado!');
  };

  const summary = data?.summary || {
    grossRevenue: 0,
    costOfGoods: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalSalesCount: 0,
    avgTicket: 0,
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Relatórios Financeiros & Lucro Real
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Demonstração de Resultados (DRE), margens reais e desempenho de vendas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
          >
            <option value="today">Hoje</option>
            <option value="7days">Últimos 7 Dias</option>
            <option value="30days">Últimos 30 Dias</option>
            <option value="month">Este Mês</option>
            <option value="year">Este Ano</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* DRE - FINANCIAL P&L SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Gross Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">Faturamento Bruto</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(summary.grossRevenue)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            {summary.totalSalesCount} vendas • Ticket Médio: {formatCurrency(summary.avgTicket)}
          </span>
        </div>

        {/* Cost of Goods */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">Custo Mercadoria (CMV)</span>
          <p className="text-xl sm:text-2xl font-black text-slate-700 mt-1">
            -{formatCurrency(summary.costOfGoods)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Custo de compra dos produtos</span>
        </div>

        {/* Expenses */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">Despesas Operacionais</span>
          <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
            -{formatCurrency(summary.totalExpenses)}
          </p>
          <span className="text-[11px] text-rose-600 font-bold">Custos fixos e despesas</span>
        </div>

        {/* Real Net Profit */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-xs font-bold text-emerald-800">LUCRO LÍQUIDO REAL</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {formatCurrency(summary.netProfit)}
          </p>
          <span className="text-[11px] text-emerald-600 font-bold">
            {summary.grossRevenue > 0
              ? `Margem Líquida: ${Math.round((summary.netProfit / summary.grossRevenue) * 100)}%`
              : '0%'}
          </span>
        </div>
      </div>

      {/* Sales & Profit Progression Chart */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Faturamento vs Lucro Líquido no Período</h3>
            <p className="text-xs text-slate-500">Visualização comparativa diária</p>
          </div>
        </div>

        <div className="h-72 w-full">
          {data?.chartData && data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    formatCurrency(Number(val)),
                    name === 'total' ? 'Faturamento' : 'Lucro',
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Legend />
                <Bar dataKey="total" name="Faturamento" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Lucro" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Sem dados suficientes no período selecionado
            </div>
          )}
        </div>
      </div>

      {/* Two columns: Payment Methods Breakdown & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Payment Methods Breakdown */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
          <h3 className="font-bold text-base text-slate-900">Vendas por Forma de Pagamento</h3>
          <div className="space-y-2.5">
            {data?.paymentMethods && data.paymentMethods.length > 0 ? (
              data.paymentMethods.map((pm: any, idx: number) => {
                const percent =
                  summary.grossRevenue > 0
                    ? Math.round((pm.total / summary.grossRevenue) * 100)
                    : 0;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800 capitalize">{pm.method.replace('_', ' ')}</span>
                      <span className="text-slate-900 font-bold">
                        {formatCurrency(pm.total)} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">Nenhum dado de pagamento disponível</p>
            )}
          </div>
        </div>

        {/* Top Selling Products in Period */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
          <h3 className="font-bold text-base text-slate-900">Produtos Mais Vendidos</h3>
          <div className="space-y-3">
            {data?.topProducts && data.topProducts.length > 0 ? (
              data.topProducts.slice(0, 5).map((p: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 font-bold text-slate-700 flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-slate-900 font-bold truncate">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-slate-900 block">{formatCurrency(p.totalRevenue)}</span>
                    <span className="text-[10px] text-slate-400">{p.totalQuantity} unidades</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">Nenhum produto vendido no período</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
