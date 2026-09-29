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
  ShoppingBag,
  FileText,
  Boxes,
  Receipt,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  Eye,
  X,
  Filter
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
import {
  generateSalesReportPdf,
  generateExpensesReportPdf,
  generateStockReportPdf,
  generateDreReportPdf,
  downloadPdf,
  ReportType
} from '../lib/pdfReportGenerator.js';
import { Product, Expense, Sale } from '../types/index.js';

const PERIOD_LABELS: Record<string, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  '7days': 'Últimos 7 Dias',
  '30days': 'Últimos 30 Dias',
  month: 'Este Mês',
  year: 'Este Ano',
  all: 'Todo o Histórico',
};

export const ReportsPage: React.FC = () => {
  const { company } = useAuth();
  const { error, success } = useToast();

  const [period, setPeriod] = useState<string>('30days');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exportingType, setExportingType] = useState<string | null>(null);

  // Custom Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('sales');
  const [modalPeriod, setModalPeriod] = useState<string>('30days');

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

  const summary = data?.summary || {
    grossRevenue: 0,
    costOfGoods: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalSalesCount: 0,
    avgTicket: 0,
    profitMargin: 0,
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!data?.chartData || data.chartData.length === 0) {
      error('Sem dados suficientes para exportar em CSV');
      return;
    }
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

  // 1. Export Sales PDF
  const handleExportSalesPdf = async (customPeriod?: string, openPreview: boolean = false) => {
    const targetPeriod = customPeriod || period;
    try {
      setExportingType('sales');
      let reportData = data;
      if (targetPeriod !== period) {
        reportData = await api.getReports(targetPeriod);
      }

      const sales: Sale[] = reportData?.salesList || [];
      const grossRevenue = reportData?.summary?.grossRevenue ?? reportData?.summary?.totalSales ?? 0;
      const costOfGoods = reportData?.summary?.costOfGoods ?? (grossRevenue - (reportData?.summary?.totalProfit ?? 0));
      const grossProfit = reportData?.summary?.grossProfit ?? reportData?.summary?.totalProfit ?? 0;
      const salesCount = reportData?.summary?.totalSalesCount ?? reportData?.summary?.salesCount ?? sales.length;
      const averageTicket = reportData?.summary?.avgTicket ?? (salesCount > 0 ? Math.round(grossRevenue / salesCount) : 0);
      const profitMargin = grossRevenue > 0 ? Math.round((grossProfit / grossRevenue) * 100) : 0;

      const doc = generateSalesReportPdf(company, {
        periodLabel: PERIOD_LABELS[targetPeriod] || targetPeriod,
        sales,
        summary: {
          totalSales: grossRevenue,
          costOfGoods,
          grossProfit,
          salesCount,
          averageTicket,
          profitMargin,
        },
        paymentMethods: reportData?.paymentMethods || [],
        topProducts: reportData?.topProducts || reportData?.topSelling || [],
      });

      const fileName = `Relatorio_Vendas_${targetPeriod}_${new Date().toISOString().substring(0, 10)}.pdf`;

      if (openPreview) {
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
      } else {
        downloadPdf(doc, fileName);
      }

      success(`Relatório de Vendas em PDF ${openPreview ? 'aberto' : 'descarregado'} com sucesso!`);
    } catch (e: any) {
      error(`Erro ao gerar PDF de Vendas: ${e?.message || 'Falha inesperada'}`);
    } finally {
      setExportingType(null);
    }
  };

  // 2. Export Expenses PDF
  const handleExportExpensesPdf = async (customPeriod?: string, openPreview: boolean = false) => {
    const targetPeriod = customPeriod || period;
    try {
      setExportingType('expenses');
      let reportData = data;
      if (targetPeriod !== period) {
        reportData = await api.getReports(targetPeriod);
      }

      const expenses: Expense[] = reportData?.expensesList || [];
      const totalExpenses = reportData?.summary?.totalExpenses ?? expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
      const maxExpense = expenses.reduce((max, e) => Math.max(max, e.amount || 0), 0);
      const avgExpense = expenses.length > 0 ? Math.round(totalExpenses / expenses.length) : 0;

      const doc = generateExpensesReportPdf(company, {
        periodLabel: PERIOD_LABELS[targetPeriod] || targetPeriod,
        expenses,
        summary: {
          totalExpenses,
          expensesCount: expenses.length,
          maxExpense,
          avgExpense,
        },
        expensesByCategory: reportData?.expensesByCategory || [],
      });

      const fileName = `Relatorio_Despesas_${targetPeriod}_${new Date().toISOString().substring(0, 10)}.pdf`;

      if (openPreview) {
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
      } else {
        downloadPdf(doc, fileName);
      }

      success(`Relatório de Despesas em PDF ${openPreview ? 'aberto' : 'descarregado'} com sucesso!`);
    } catch (e: any) {
      error(`Erro ao gerar PDF de Despesas: ${e?.message || 'Falha inesperada'}`);
    } finally {
      setExportingType(null);
    }
  };

  // 3. Export Stock & Inventory PDF (includes Lote & Validade)
  const handleExportStockPdf = async (openPreview: boolean = false) => {
    try {
      setExportingType('stock');
      let products: Product[] = data?.productsList;
      if (!products || products.length === 0) {
        products = await api.getProducts();
      }

      // Compute or use server stock summary
      const stockSummary = data?.stockSummary || (() => {
        let totalStockUnits = 0;
        let totalStockCostValue = 0;
        let totalStockRetailValue = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let normalStockCount = 0;
        let batchesCount = 0;
        let expiringSoonCount = 0;
        let expiredCount = 0;

        const now = new Date();
        const thirtyDaysAhead = new Date(now.getTime() + 30 * 86400000).toISOString().substring(0, 10);
        const todayStr = now.toISOString().substring(0, 10);

        products.forEach((p) => {
          const stock = Number(p.currentStock) || 0;
          const minStock = Number(p.minStock) || 0;
          const cost = Number(p.costPrice) || 0;
          const sale = Number(p.salePrice) || 0;
          totalStockUnits += stock;
          totalStockCostValue += stock * cost;
          totalStockRetailValue += stock * sale;

          if (stock <= 0) outOfStockCount++;
          else if (stock <= minStock) lowStockCount++;
          else normalStockCount++;

          if (p.batchNumber) batchesCount++;
          if (p.expirationDate) {
            if (p.expirationDate < todayStr) expiredCount++;
            else if (p.expirationDate <= thirtyDaysAhead) expiringSoonCount++;
          }
        });

        return {
          totalProducts: products.length,
          totalStockUnits,
          totalStockCostValue,
          totalStockRetailValue,
          potentialStockProfit: Math.max(0, totalStockRetailValue - totalStockCostValue),
          lowStockCount,
          outOfStockCount,
          normalStockCount,
          batchesCount,
          expiringSoonCount,
          expiredCount,
        };
      })();

      const doc = generateStockReportPdf(company, {
        products,
        summary: stockSummary,
      });

      const fileName = `Relatorio_Estoque_Inventario_${new Date().toISOString().substring(0, 10)}.pdf`;

      if (openPreview) {
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
      } else {
        downloadPdf(doc, fileName);
      }

      success(`Relatório de Estoque e Inventário em PDF ${openPreview ? 'aberto' : 'descarregado'} com sucesso!`);
    } catch (e: any) {
      error(`Erro ao gerar PDF de Estoque: ${e?.message || 'Falha inesperada'}`);
    } finally {
      setExportingType(null);
    }
  };

  // 4. Export Financial / DRE PDF
  const handleExportDrePdf = async (customPeriod?: string, openPreview: boolean = false) => {
    const targetPeriod = customPeriod || period;
    try {
      setExportingType('dre');
      let reportData = data;
      if (targetPeriod !== period) {
        reportData = await api.getReports(targetPeriod);
      }

      const grossRevenue = reportData?.summary?.grossRevenue ?? reportData?.summary?.totalSales ?? 0;
      const costOfGoods = reportData?.summary?.costOfGoods ?? (grossRevenue - (reportData?.summary?.totalProfit ?? 0));
      const grossProfit = reportData?.summary?.grossProfit ?? reportData?.summary?.totalProfit ?? 0;
      const totalExpenses = reportData?.summary?.totalExpenses ?? 0;
      const netProfit = reportData?.summary?.netProfit ?? (grossProfit - totalExpenses);
      const salesCount = reportData?.summary?.totalSalesCount ?? reportData?.summary?.salesCount ?? 0;
      const avgTicket = reportData?.summary?.avgTicket ?? (salesCount > 0 ? Math.round(grossRevenue / salesCount) : 0);
      const profitMargin = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;

      const doc = generateDreReportPdf(company, {
        periodLabel: PERIOD_LABELS[targetPeriod] || targetPeriod,
        grossRevenue,
        costOfGoods,
        grossProfit,
        totalExpenses,
        netProfit,
        profitMargin,
        salesCount,
        avgTicket,
        expensesByCategory: reportData?.expensesByCategory || [],
      });

      const fileName = `Relatorio_Financeiro_DRE_${targetPeriod}_${new Date().toISOString().substring(0, 10)}.pdf`;

      if (openPreview) {
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
      } else {
        downloadPdf(doc, fileName);
      }

      success(`Demonstração de Resultados (DRE) em PDF ${openPreview ? 'aberta' : 'descarregada'} com sucesso!`);
    } catch (e: any) {
      error(`Erro ao gerar DRE em PDF: ${e?.message || 'Falha inesperada'}`);
    } finally {
      setExportingType(null);
    }
  };

  const handleModalExport = (openPreview: boolean = false) => {
    if (selectedReportType === 'sales') {
      handleExportSalesPdf(modalPeriod, openPreview);
    } else if (selectedReportType === 'expenses') {
      handleExportExpensesPdf(modalPeriod, openPreview);
    } else if (selectedReportType === 'stock') {
      handleExportStockPdf(openPreview);
    } else if (selectedReportType === 'dre') {
      handleExportDrePdf(modalPeriod, openPreview);
    }
    setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Relatórios Financeiros & Gestão
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 pl-10">
            Demonstração de Resultados (DRE), controle de despesas, estoque físico e exportação oficial em PDF
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7days">Últimos 7 Dias</option>
              <option value="30days">Últimos 30 Dias</option>
              <option value="month">Este Mês</option>
              <option value="year">Este Ano</option>
              <option value="all">Todo o Histórico</option>
            </select>
          </div>

          {/* Quick PDF Center Button */}
          <button
            onClick={() => {
              setModalPeriod(period);
              setIsExportModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Central de PDFs</span>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer"
            title="Exportar dados do gráfico em CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* DEDICATED PDF EXPORT HUB - 4 INTERACTIVE ACTION CARDS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-6 rounded-3xl text-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Documentos Gerenciais Oficiais
            </span>
            <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
              Exportar Relatórios em Documentos PDF
            </h2>
          </div>
          <span className="text-xs text-slate-300">
            Período selecionado: <strong className="text-emerald-400">{PERIOD_LABELS[period] || period}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 pt-1">
          {/* 1. SALES REPORT PDF CARD */}
          <div className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 p-4 rounded-2xl flex flex-col justify-between transition-all group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                  Transações
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                  Relatório de Vendas
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                  Listagem completa com clientes, meios de pagamento, totais e margem de contribuição.
                </p>
              </div>
              <div className="pt-1 flex items-baseline justify-between text-xs border-t border-slate-700/60">
                <span className="text-slate-400 font-medium">Vendas no período:</span>
                <span className="font-bold text-white">{summary.totalSalesCount} transações</span>
              </div>
            </div>

            <button
              onClick={() => handleExportSalesPdf()}
              disabled={exportingType === 'sales'}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {exportingType === 'sales' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>A Gerar PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Vendas (PDF)</span>
                </>
              )}
            </button>
          </div>

          {/* 2. EXPENSES REPORT PDF CARD */}
          <div className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 p-4 rounded-2xl flex flex-col justify-between transition-all group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                  Despesas
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                  Relatório de Despesas
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                  Saídas de caixa, custos fixos e variáveis, organizados por categorias e formas de pagamento.
                </p>
              </div>
              <div className="pt-1 flex items-baseline justify-between text-xs border-t border-slate-700/60">
                <span className="text-slate-400 font-medium">Total despesas:</span>
                <span className="font-bold text-rose-400">{formatCurrency(summary.totalExpenses)}</span>
              </div>
            </div>

            <button
              onClick={() => handleExportExpensesPdf()}
              disabled={exportingType === 'expenses'}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {exportingType === 'expenses' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>A Gerar PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Despesas (PDF)</span>
                </>
              )}
            </button>
          </div>

          {/* 3. STOCK & INVENTORY PDF CARD */}
          <div className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 p-4 rounded-2xl flex flex-col justify-between transition-all group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Boxes className="w-4 h-4" />
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  Inventário & Lotes
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  Relatório de Estoque
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                  Inventário físico valorizado, número de lote, validade, preço de custo e alertas de ruptura.
                </p>
              </div>
              <div className="pt-1 flex items-baseline justify-between text-xs border-t border-slate-700/60">
                <span className="text-slate-400 font-medium">Itens em catálogo:</span>
                <span className="font-bold text-amber-400">
                  {data?.stockSummary?.totalProducts || data?.productsList?.length || '0'} produtos
                </span>
              </div>
            </div>

            <button
              onClick={() => handleExportStockPdf()}
              disabled={exportingType === 'stock'}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {exportingType === 'stock' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>A Gerar PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Estoque (PDF)</span>
                </>
              )}
            </button>
          </div>

          {/* 4. DRE / FINANCIAL P&L PDF CARD */}
          <div className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 p-4 rounded-2xl flex flex-col justify-between transition-all group">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  DRE Executiva
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Demonstração DRE
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                  Demonstração contábil com faturamento bruto, CMV, lucro bruto e lucro líquido real.
                </p>
              </div>
              <div className="pt-1 flex items-baseline justify-between text-xs border-t border-slate-700/60">
                <span className="text-slate-400 font-medium">Lucro Líquido:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(summary.netProfit)}</span>
              </div>
            </div>

            <button
              onClick={() => handleExportDrePdf()}
              disabled={exportingType === 'dre'}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {exportingType === 'dre' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>A Gerar PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar DRE (PDF)</span>
                </>
              )}
            </button>
          </div>
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
          <span className="text-[11px] text-rose-600 font-bold">Custos fixos e saídas</span>
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
            <p className="text-xs text-slate-500">Visualização comparativa diária das vendas</p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">
            {PERIOD_LABELS[period] || period}
          </span>
        </div>

        <div className="h-72 w-full">
          {data?.chartData && data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => {
                    if (val && typeof val === 'string' && val.includes('-')) {
                      const parts = val.split('-');
                      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
                    }
                    return val;
                  }}
                />
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
            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
              <BarChart3 className="w-8 h-8 text-slate-300" />
              <span>Sem dados de vendas registrados no período selecionado</span>
            </div>
          )}
        </div>
      </div>

      {/* Two columns: Payment Methods Breakdown & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Payment Methods Breakdown */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">Vendas por Forma de Pagamento</h3>
            <span className="text-[11px] text-slate-400 font-semibold">{summary.totalSalesCount} transações</span>
          </div>
          <div className="space-y-3">
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
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">Produtos Mais Vendidos</h3>
            <span className="text-[11px] text-slate-400 font-semibold">Top ranking</span>
          </div>
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

      {/* CUSTOM EXPORT MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-black text-base text-slate-900">Central de Exportação PDF</h3>
                  <p className="text-xs text-slate-400">Gere e baixe relatórios formatados para impressão</p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Select Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                1. Selecione o Tipo de Relatório
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReportType('sales')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedReportType === 'sales'
                      ? 'border-blue-500 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold">Vendas</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Transações, clientes e margens</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedReportType('expenses')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedReportType === 'expenses'
                      ? 'border-rose-500 bg-rose-50/50 text-rose-900 ring-2 ring-rose-500/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold">Despesas</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Custos, centros e pagamentos</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedReportType('stock')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedReportType === 'stock'
                      ? 'border-amber-500 bg-amber-50/50 text-amber-900 ring-2 ring-amber-500/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold">Estoque & Lotes</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Inventário físico e validade</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedReportType('dre')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedReportType === 'dre'
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold">DRE Completa</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Lucro real e demonstrativo</p>
                </button>
              </div>
            </div>

            {/* Step 2: Select Period (Only for non-stock reports) */}
            {selectedReportType !== 'stock' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  2. Período do Relatório
                </label>
                <select
                  value={modalPeriod}
                  onChange={(e) => setModalPeriod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="today">Hoje</option>
                  <option value="yesterday">Ontem</option>
                  <option value="7days">Últimos 7 Dias</option>
                  <option value="30days">Últimos 30 Dias</option>
                  <option value="month">Este Mês</option>
                  <option value="year">Este Ano</option>
                  <option value="all">Todo o Histórico</option>
                </select>
              </div>
            ) : (
              <div className="bg-amber-50/60 border border-amber-200/80 p-3 rounded-xl text-xs text-amber-900">
                <span className="font-bold block">📦 Inventário em Tempo Real:</span>
                O relatório de estoque reflete o estado atual dos produtos, contagens físicas, lotes cadastrados e alertas de validade.
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => handleModalExport(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Abrir PDF em nova aba para visualização e impressão"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Visualizar</span>
              </button>

              <button
                type="button"
                onClick={() => handleModalExport(false)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
