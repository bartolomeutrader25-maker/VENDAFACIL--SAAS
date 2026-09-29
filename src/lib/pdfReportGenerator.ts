import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Company, Sale, Expense, Product } from '../types/index.js';

export type ReportType = 'sales' | 'expenses' | 'stock' | 'dre';

export interface ReportCompanyInfo {
  name?: string;
  nif?: string;
  phone?: string;
  email?: string;
  address?: string;
  currency?: string;
}

export interface SalesReportData {
  periodLabel: string;
  sales: Sale[];
  summary: {
    totalSales: number;
    costOfGoods: number;
    grossProfit: number;
    salesCount: number;
    averageTicket: number;
    profitMargin: number;
  };
  paymentMethods?: Array<{ method: string; count: number; total: number; percentage: number }>;
  topProducts?: Array<{ name: string; totalQuantity: number; totalRevenue: number; profit?: number }>;
}

export interface ExpensesReportData {
  periodLabel: string;
  expenses: Expense[];
  summary: {
    totalExpenses: number;
    expensesCount: number;
    maxExpense: number;
    avgExpense: number;
  };
  expensesByCategory?: Array<{ category: string; count: number; total: number; percentage: number }>;
}

export interface StockReportData {
  products: Product[];
  summary: {
    totalProducts: number;
    totalStockUnits: number;
    totalStockCostValue: number;
    totalStockRetailValue: number;
    potentialStockProfit: number;
    lowStockCount: number;
    outOfStockCount: number;
    normalStockCount: number;
    batchesCount?: number;
    expiringSoonCount?: number;
    expiredCount?: number;
  };
}

export interface DreReportData {
  periodLabel: string;
  grossRevenue: number;
  costOfGoods: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  salesCount: number;
  avgTicket: number;
  expensesByCategory?: Array<{ category: string; total: number; percentage: number }>;
}

const formatMoney = (val: number, currency: string = 'Kz'): string => {
  return `${(val || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('pt-PT')} ${d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateStr;
  }
};

const getPaymentLabel = (method: string): string => {
  const map: Record<string, string> = {
    dinheiro: 'Dinheiro',
    multicaixa_express: 'MCX Express',
    transferencia: 'Transferência',
    cartao: 'Cartão / TPA',
    credito_fiado: 'Fiado (Crédito)',
    outro: 'Outro',
  };
  return map[method] || method;
};

const getExpenseCategoryLabel = (cat: string): string => {
  const map: Record<string, string> = {
    compra_mercadoria: 'Compra de Mercadoria',
    transporte: 'Transporte / Logística',
    energia: 'Energia / Eletricidade',
    agua: 'Água',
    internet: 'Internet & Comunicações',
    salarios: 'Salários & Encargos',
    renda: 'Renda / Aluguer',
    marketing: 'Marketing & Publicidade',
    outros: 'Outras Despesas',
  };
  return map[cat] || cat;
};

/**
 * Standard PDF Header with company branding, title, period and metadata
 */
function drawHeader(
  doc: jsPDF,
  company: ReportCompanyInfo | null,
  title: string,
  subTitle: string,
  periodLabel?: string
) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Accent Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Emerald sub-stripe
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 5, pageWidth, 2, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  const companyName = company?.name || 'VendaFácil Comércio';
  doc.text(companyName.toUpperCase(), 14, 18);

  // Company Contact / NIF Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  let detailsY = 23;
  const detailsParts: string[] = [];
  if (company?.nif) detailsParts.push(`NIF: ${company.nif}`);
  if (company?.phone) detailsParts.push(`Tel: ${company.phone}`);
  if (company?.email) detailsParts.push(`E-mail: ${company.email}`);
  if (company?.address) detailsParts.push(`Endereço: ${company.address}`);

  const detailsLine = detailsParts.join('  •  ');
  if (detailsLine) {
    doc.text(detailsLine, 14, detailsY);
    detailsY += 4;
  }

  // Right-aligned report emission badge
  const now = new Date();
  const emissionStr = `Emissão: ${now.toLocaleDateString('pt-PT')} às ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(emissionStr, pageWidth - 14, 17, { align: 'right' });

  if (periodLabel) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(`Período: ${periodLabel}`, pageWidth - 14, 22, { align: 'right' });
  }

  // Horizontal divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 29, pageWidth - 14, 29);

  // Title Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 37);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(subTitle, 14, 42);

  return 47; // return current Y position
}

/**
 * Standard PDF Footer with page numbers and security stamp
 */
function applyFooters(doc: jsPDF, companyName: string = 'VendaFácil') {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Bottom divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Relatório gerencial gerado automaticamente pelo VendaFácil SaaS • ${companyName}`,
      14,
      pageHeight - 7
    );

    doc.setFont('helvetica', 'bold');
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - 14,
      pageHeight - 7,
      { align: 'right' }
    );
  }
}

/**
 * Draw a clean 4-cell or 3-cell metric summary banner
 */
function drawMetricBoxes(
  doc: jsPDF,
  startY: number,
  metrics: Array<{ label: string; value: string; hint?: string; highlight?: boolean }>
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const totalWidth = pageWidth - margin * 2;
  const gap = 3;
  const count = metrics.length;
  const boxWidth = (totalWidth - gap * (count - 1)) / count;
  const boxHeight = 16;

  metrics.forEach((m, idx) => {
    const x = margin + idx * (boxWidth + gap);

    // Card background
    if (m.highlight) {
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(16, 185, 129); // emerald-500
    } else {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
    }
    doc.roundedRect(x, startY, boxWidth, boxHeight, 2, 2, 'FD');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(m.highlight ? 4 : 100, m.highlight ? 120 : 116, m.highlight ? 87 : 139);
    doc.text(m.label.toUpperCase(), x + 3.5, startY + 5);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(m.highlight ? 5 : 15, m.highlight ? 150 : 23, m.highlight ? 105 : 42);
    doc.text(m.value, x + 3.5, startY + 10.5);

    // Hint
    if (m.hint) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(m.hint, x + 3.5, startY + 14.2);
    }
  });

  return startY + boxHeight + 6;
}

// ============================================================================
// 1. SALES REPORT PDF GENERATOR
// ============================================================================
export const generateSalesReportPdf = (
  company: ReportCompanyInfo | null,
  data: SalesReportData
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const curr = company?.currency || 'Kz';
  const startY = drawHeader(
    doc,
    company,
    'RELATÓRIO DETALHADO DE VENDAS',
    'Extrato analítico de transações, faturamento bruto e margem de contribuição',
    data.periodLabel
  );

  // Metrics Bar
  const metricsY = drawMetricBoxes(doc, startY, [
    {
      label: 'Faturamento Bruto',
      value: formatMoney(data.summary.totalSales, curr),
      hint: `${data.summary.salesCount} vendas realizadas`,
      highlight: true,
    },
    {
      label: 'Custo CMV',
      value: formatMoney(data.summary.costOfGoods, curr),
      hint: 'Custo de compra',
    },
    {
      label: 'Lucro Bruto',
      value: formatMoney(data.summary.grossProfit, curr),
      hint: `Margem: ${data.summary.profitMargin || 0}%`,
      highlight: true,
    },
    {
      label: 'Ticket Médio',
      value: formatMoney(data.summary.averageTicket, curr),
      hint: 'Média por venda',
    },
  ]);

  // Main Sales Table
  const tableRows = data.sales.map((s) => {
    const itemsCount = s.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;
    return [
      s.saleNumber || `#${s.id.substring(0, 7)}`,
      formatDateTime(s.createdAt),
      s.customerName || 'Cliente Balcão',
      getPaymentLabel(s.paymentMethod),
      `${itemsCount} un`,
      formatMoney(s.total, curr),
      formatMoney(s.profit, curr),
      s.userName || 'Operador',
    ];
  });

  autoTable(doc, {
    startY: metricsY,
    head: [['Nº Venda', 'Data / Hora', 'Cliente', 'Pagamento', 'Itens', 'Total Venda', 'Lucro', 'Atendente']],
    body: tableRows.length > 0 ? tableRows : [['-', 'Sem vendas no período selecionado', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', cellWidth: 22 },
      1: { halign: 'left', cellWidth: 26 },
      2: { halign: 'left' },
      3: { halign: 'left', cellWidth: 24 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 25 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 23, textColor: [5, 150, 105] },
      7: { halign: 'left', cellWidth: 20 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    foot: [
      [
        'TOTAL GERAL',
        '',
        `${data.summary.salesCount} vendas`,
        '',
        '',
        formatMoney(data.summary.totalSales, curr),
        formatMoney(data.summary.grossProfit, curr),
        '',
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'right',
    },
  });

  let lastY = (doc as any).lastAutoTable.finalY + 8;
  const pageHeight = doc.internal.pageSize.getHeight();

  // If there's payment methods or top products breakdown and space allows (or add new page)
  if (data.paymentMethods && data.paymentMethods.length > 0) {
    if (lastY + 45 > pageHeight - 20) {
      doc.addPage();
      lastY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('DISTRIBUIÇÃO POR FORMA DE PAGAMENTO', 14, lastY);

    const pmRows = data.paymentMethods.map((pm) => [
      getPaymentLabel(pm.method),
      `${pm.count} transações`,
      formatMoney(pm.total, curr),
      `${pm.percentage}%`,
    ]);

    autoTable(doc, {
      startY: lastY + 3,
      head: [['Forma de Pagamento', 'Transações', 'Faturamento Total', 'Participação (%)']],
      body: pmRows,
      theme: 'striped',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'right', fontStyle: 'bold' },
        3: { halign: 'right' },
      },
    });

    lastY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Top products table if available
  if (data.topProducts && data.topProducts.length > 0) {
    if (lastY + 45 > pageHeight - 20) {
      doc.addPage();
      lastY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('PRODUTOS MAIS VENDIDOS NO PERÍODO', 14, lastY);

    const tpRows = data.topProducts.slice(0, 10).map((tp, idx) => [
      `#${idx + 1}`,
      tp.name,
      `${tp.totalQuantity} un`,
      formatMoney(tp.totalRevenue, curr),
      tp.profit ? formatMoney(tp.profit, curr) : '-',
    ]);

    autoTable(doc, {
      startY: lastY + 3,
      head: [['Rank', 'Produto', 'Qtd Vendida', 'Receita Total', 'Lucro']],
      body: tpRows,
      theme: 'striped',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15, fontStyle: 'bold' },
        1: { fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 30, textColor: [5, 150, 105] },
      },
    });
  }

  applyFooters(doc, company?.name || 'VendaFácil');
  return doc;
};

// ============================================================================
// 2. EXPENSES REPORT PDF GENERATOR
// ============================================================================
export const generateExpensesReportPdf = (
  company: ReportCompanyInfo | null,
  data: ExpensesReportData
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const curr = company?.currency || 'Kz';
  const startY = drawHeader(
    doc,
    company,
    'RELATÓRIO DE DESPESAS OPERACIONAIS',
    'Demonstrativo detalhado de saídas de caixa, centros de custo e despesas fixas/variáveis',
    data.periodLabel
  );

  // Metrics Bar
  const metricsY = drawMetricBoxes(doc, startY, [
    {
      label: 'Total de Despesas',
      value: formatMoney(data.summary.totalExpenses, curr),
      hint: `${data.summary.expensesCount} lançamentos`,
      highlight: true,
    },
    {
      label: 'Maior Despesa',
      value: formatMoney(data.summary.maxExpense, curr),
      hint: 'Pico no período',
    },
    {
      label: 'Média por Lançamento',
      value: formatMoney(data.summary.avgExpense, curr),
      hint: 'Valor médio por saída',
    },
    {
      label: 'Qtd Registos',
      value: `${data.summary.expensesCount} despesas`,
      hint: 'Total de lançamentos',
    },
  ]);

  // Main Expenses Table
  const tableRows = data.expenses.map((e) => [
    formatDate(e.date || e.createdAt),
    getExpenseCategoryLabel(e.category),
    e.description || '-',
    getPaymentLabel(e.paymentMethod),
    e.userName || 'Admin',
    formatMoney(e.amount, curr),
  ]);

  autoTable(doc, {
    startY: metricsY,
    head: [['Data', 'Categoria', 'Descrição do Gasto', 'Pagamento', 'Registado Por', 'Valor']],
    body: tableRows.length > 0 ? tableRows : [['-', '-', 'Nenhuma despesa registada no período', '-', '-', '-']],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [225, 29, 72], // rose-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 24 },
      1: { fontStyle: 'bold', halign: 'left', cellWidth: 38 },
      2: { halign: 'left' },
      3: { halign: 'left', cellWidth: 26 },
      4: { halign: 'left', cellWidth: 24 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 30, textColor: [225, 29, 72] },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    foot: [
      [
        'TOTAL GERAL',
        '',
        `${data.summary.expensesCount} despesas listadas`,
        '',
        '',
        formatMoney(data.summary.totalExpenses, curr),
      ],
    ],
    footStyles: {
      fillColor: [255, 241, 242], // rose-50
      textColor: [225, 29, 72],
      fontStyle: 'bold',
      halign: 'right',
    },
  });

  let lastY = (doc as any).lastAutoTable.finalY + 8;
  const pageHeight = doc.internal.pageSize.getHeight();

  // Breakdown by Category
  if (data.expensesByCategory && data.expensesByCategory.length > 0) {
    if (lastY + 45 > pageHeight - 20) {
      doc.addPage();
      lastY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('CONSOLIDAÇÃO POR CATEGORIA DE DESPESA', 14, lastY);

    const catRows = data.expensesByCategory.map((c) => [
      getExpenseCategoryLabel(c.category),
      `${c.count} lançamentos`,
      formatMoney(c.total, curr),
      `${c.percentage}%`,
    ]);

    autoTable(doc, {
      startY: lastY + 3,
      head: [['Categoria de Gasto', 'Qtd Lançamentos', 'Total Gasto', '% do Total']],
      body: catRows,
      theme: 'striped',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'right', fontStyle: 'bold' },
        3: { halign: 'right' },
      },
    });
  }

  applyFooters(doc, company?.name || 'VendaFácil');
  return doc;
};

// ============================================================================
// 3. STOCK & INVENTORY REPORT PDF GENERATOR (includes Lote & Validade)
// ============================================================================
export const generateStockReportPdf = (
  company: ReportCompanyInfo | null,
  data: StockReportData
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'landscape', // Landscape is ideal for stock with Lote, Validade, Custo, Venda
    unit: 'mm',
    format: 'a4',
  });

  const curr = company?.currency || 'Kz';
  const startY = drawHeader(
    doc,
    company,
    'RELATÓRIO GERAL DE ESTOQUE, LOTES & INVENTÁRIO FÍSICO',
    'Posição valorizada do inventário, controle de lotes, datas de validade e alertas de ruptura',
    'Posição Atual em Tempo Real'
  );

  // Metrics Bar in Landscape (5 boxes)
  const metricsY = drawMetricBoxes(doc, startY, [
    {
      label: 'Produtos Cadastrados',
      value: `${data.summary.totalProducts} produtos`,
      hint: `${data.summary.totalStockUnits} unidades físicas`,
    },
    {
      label: 'Capital Investido (Custo)',
      value: formatMoney(data.summary.totalStockCostValue, curr),
      hint: 'Valor total em estoque',
      highlight: true,
    },
    {
      label: 'Valor Projetado (Venda)',
      value: formatMoney(data.summary.totalStockRetailValue, curr),
      hint: 'Receita bruta esperada',
    },
    {
      label: 'Lucro Projetado em Estoque',
      value: formatMoney(data.summary.potentialStockProfit, curr),
      hint: 'Margem potencial',
      highlight: true,
    },
    {
      label: 'Alertas de Estoque',
      value: `${data.summary.lowStockCount} baixos / ${data.summary.outOfStockCount} esgotados`,
      hint: `${data.summary.expiredCount || 0} expirados`,
    },
  ]);

  const todayStr = new Date().toISOString().substring(0, 10);

  // Main Stock Table
  const tableRows = data.products.map((p) => {
    const stock = Number(p.currentStock) || 0;
    const minStock = Number(p.minStock) || 0;
    const cost = Number(p.costPrice) || 0;
    const sale = Number(p.salePrice) || 0;
    const totalCost = stock * cost;

    let status = 'Normal';
    if (stock <= 0) {
      status = 'ESGOTADO';
    } else if (stock <= minStock) {
      status = 'BAIXO';
    }

    if (p.expirationDate && p.expirationDate < todayStr) {
      status += ' / VENCIDO';
    }

    return [
      p.code || p.barcode || `#${p.id.substring(0, 6)}`,
      p.name,
      p.categoryName || 'Geral',
      p.batchNumber ? `Lote: ${p.batchNumber}` : '-',
      p.expirationDate ? formatDate(p.expirationDate) : '-',
      `${stock} ${p.unit || 'un'}`,
      `${minStock} ${p.unit || 'un'}`,
      formatMoney(cost, curr),
      formatMoney(sale, curr),
      formatMoney(totalCost, curr),
      status,
    ];
  });

  autoTable(doc, {
    startY: metricsY,
    head: [
      [
        'Cód / Barras',
        'Produto',
        'Categoria',
        'Nº Lote',
        'Validade',
        'Estoque',
        'Mín',
        'P. Custo',
        'P. Venda',
        'Total Custo',
        'Situação',
      ],
    ],
    body: tableRows.length > 0 ? tableRows : [['-', 'Nenhum produto cadastrado no catálogo', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold' },
      1: { fontStyle: 'bold' },
      2: { cellWidth: 24 },
      3: { cellWidth: 25, textColor: [180, 83, 9] }, // amber for lote
      4: { cellWidth: 22 },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 16 },
      7: { halign: 'right', cellWidth: 25 },
      8: { halign: 'right', fontStyle: 'bold', cellWidth: 25 },
      9: { halign: 'right', fontStyle: 'bold', cellWidth: 26, textColor: [5, 150, 105] },
      10: { halign: 'center', fontStyle: 'bold', cellWidth: 28 },
    },
    didParseCell: (data) => {
      // Highlight row if stock low or esgotado
      if (data.section === 'body' && data.column.index === 10) {
        const text = String(data.cell.raw);
        if (text.includes('ESGOTADO') || text.includes('VENCIDO')) {
          data.cell.styles.textColor = [225, 29, 72]; // red
        } else if (text.includes('BAIXO')) {
          data.cell.styles.textColor = [217, 119, 6]; // amber
        } else {
          data.cell.styles.textColor = [5, 150, 105]; // green
        }
      }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    foot: [
      [
        'TOTAL GERAL',
        `${data.summary.totalProducts} produtos`,
        '',
        '',
        '',
        `${data.summary.totalStockUnits} un`,
        '',
        '',
        formatMoney(data.summary.totalStockRetailValue, curr),
        formatMoney(data.summary.totalStockCostValue, curr),
        '',
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'right',
    },
  });

  applyFooters(doc, company?.name || 'VendaFácil');
  return doc;
};

// ============================================================================
// 4. FINANCIAL P&L (DRE) REPORT PDF GENERATOR
// ============================================================================
export const generateDreReportPdf = (
  company: ReportCompanyInfo | null,
  data: DreReportData
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const curr = company?.currency || 'Kz';
  const startY = drawHeader(
    doc,
    company,
    'DEMONSTRAÇÃO DE RESULTADOS DO EXERCÍCIO (DRE)',
    'Demonstrativo financeiro oficial de lucros, custos de mercadoria e margem líquida real',
    data.periodLabel
  );

  // Metrics Bar
  const metricsY = drawMetricBoxes(doc, startY, [
    {
      label: 'Faturamento Bruto',
      value: formatMoney(data.grossRevenue, curr),
      hint: `${data.salesCount} vendas`,
    },
    {
      label: 'Margem Bruta',
      value: formatMoney(data.grossProfit, curr),
      hint: data.grossRevenue > 0 ? `${Math.round((data.grossProfit / data.grossRevenue) * 100)}% das vendas` : '0%',
    },
    {
      label: 'Total Despesas',
      value: `-${formatMoney(data.totalExpenses, curr)}`,
      hint: 'Custos operacionais',
    },
    {
      label: 'LUCRO LÍQUIDO REAL',
      value: formatMoney(data.netProfit, curr),
      hint: `Margem: ${data.profitMargin}%`,
      highlight: true,
    },
  ]);

  // P&L Structured Statement Table
  const dreRows = [
    ['1. FATURAMENTO BRUTO DE VENDAS', formatMoney(data.grossRevenue, curr), '100.0%'],
    ['   (-) Devoluções e Abatimentos', formatMoney(0, curr), '0.0%'],
    ['2. RECEITA OPERACIONAL LÍQUIDA', formatMoney(data.grossRevenue, curr), '100.0%'],
    ['   (-) Custo das Mercadorias Vendidas (CMV)', `-${formatMoney(data.costOfGoods, curr)}`, data.grossRevenue > 0 ? `${Math.round((data.costOfGoods / data.grossRevenue) * 100)}%` : '0.0%'],
    ['3. RESULTADO / LUCRO BRUTO', formatMoney(data.grossProfit, curr), data.grossRevenue > 0 ? `${Math.round((data.grossProfit / data.grossRevenue) * 100)}%` : '0.0%'],
    ['   (-) Despesas Operacionais Totais', `-${formatMoney(data.totalExpenses, curr)}`, data.grossRevenue > 0 ? `${Math.round((data.totalExpenses / data.grossRevenue) * 100)}%` : '0.0%'],
  ];

  // Add individual expense breakdown lines if present
  if (data.expensesByCategory && data.expensesByCategory.length > 0) {
    data.expensesByCategory.forEach((c) => {
      dreRows.push([
        `       • ${getExpenseCategoryLabel(c.category)}`,
        `-${formatMoney(c.total, curr)}`,
        data.grossRevenue > 0 ? `${Math.round((c.total / data.grossRevenue) * 100)}%` : '-',
      ]);
    });
  }

  dreRows.push([
    '4. LUCRO LÍQUIDO DO PERÍODO (RESULTADO FINAL)',
    formatMoney(data.netProfit, curr),
    `${data.profitMargin}%`,
  ]);

  autoTable(doc, {
    startY: metricsY,
    head: [['Estrutura da DRE (Demonstração Financeira)', 'Valor Total', 'Margem (%)']],
    body: dreRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 50 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 30 },
    },
    didParseCell: (data) => {
      const rawText = String(data.cell.raw);
      if (rawText.startsWith('4. LUCRO LÍQUIDO')) {
        data.cell.styles.fillColor = [236, 253, 245]; // emerald-50
        data.cell.styles.textColor = [5, 150, 105];
        data.cell.styles.fontStyle = 'bold';
      } else if (rawText.startsWith('3. RESULTADO') || rawText.startsWith('1. FATURAMENTO')) {
        data.cell.styles.fillColor = [248, 250, 252];
      }
    },
  });

  applyFooters(doc, company?.name || 'VendaFácil');
  return doc;
};

/**
 * Downloads a generated PDF document safely in the browser
 */
export const downloadPdf = (doc: jsPDF, filename: string): void => {
  doc.save(filename);
};
