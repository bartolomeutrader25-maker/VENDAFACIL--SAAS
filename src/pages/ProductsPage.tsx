import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Barcode,
  X,
  Check,
  TrendingUp,
  Boxes,
  ArrowUpDown,
  Filter,
  FolderTree,
  Sparkles,
  Copy,
  Mic,
  Calendar,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category } from '../types/index.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { ProductThumbnail } from '../components/common/ProductThumbnail.js';
import { ProductImageUploader } from '../components/common/ProductImageUploader.js';
import { CategoryManagementModal } from '../components/common/CategoryManagementModal.js';
import { AiAudioProductRegistrationModal } from '../components/AiAudioProductRegistrationModal.js';

export const ProductsPage: React.FC = () => {
  const { company } = useAuth();
  const { success, error, warning } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiAudioModalOpen, setIsAiAudioModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(5);
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('un');

  const curr = company?.currency || 'Kz';

  const formatCurrency = (val: number) => {
    return `${(val || 0).toLocaleString('pt-PT')} ${curr}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodList, catList] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
      ]);
      setProducts(prodList);
      setCategories(catList);
      if (catList.length > 0 && !categoryId) {
        setCategoryId(catList[0].id);
      }
    } catch (e: any) {
      error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setIsDuplicating(false);
    setName('');
    setImageUrl('');
    setCostPrice(0);
    setSellingPrice(0);
    setStockQuantity(10);
    setMinStock(5);
    setExpirationDate('');
    setBarcode('');
    setUnit('un');
    if (categories.length > 0) setCategoryId(categories[0].id);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setIsDuplicating(false);
    setName(p.name);
    setImageUrl(p.imageUrl || '');
    setCategoryId(p.categoryId || '');
    setCostPrice(p.costPrice);
    setSellingPrice(p.sellingPrice ?? p.salePrice ?? 0);
    setStockQuantity(p.stockQuantity ?? p.currentStock ?? 0);
    setMinStock(p.minStock);
    setExpirationDate(p.expirationDate || '');
    setBarcode(p.barcode || '');
    setUnit(p.unit || 'un');
    setIsModalOpen(true);
  };

  const openDuplicateModal = (p: Product) => {
    setEditingProduct(null);
    setIsDuplicating(true);
    setName(`${p.name} (Cópia)`);
    setImageUrl(p.imageUrl || '');
    setCategoryId(p.categoryId || '');
    setCostPrice(p.costPrice);
    setSellingPrice(p.sellingPrice ?? p.salePrice ?? 0);
    setStockQuantity(p.stockQuantity ?? p.currentStock ?? 0);
    setMinStock(p.minStock);
    setExpirationDate(p.expirationDate || '');
    setBarcode(''); // Clear barcode to avoid duplicates
    setUnit(p.unit || 'un');
    setIsModalOpen(true);
  };

  const calculateMargin = () => {
    if (sellingPrice <= 0) return 0;
    const profit = sellingPrice - costPrice;
    return Math.round((profit / sellingPrice) * 100);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      warning('Preencha o nome do produto');
      return;
    }

    try {
      const payload = {
        name,
        imageUrl: imageUrl.trim() || undefined,
        categoryId,
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        salePrice: Number(sellingPrice) || 0,
        stockQuantity: Number(stockQuantity) || 0,
        currentStock: Number(stockQuantity) || 0,
        minStock: Number(minStock) || 0,
        expirationDate: expirationDate ? expirationDate.trim() : undefined,
        barcode: barcode.trim() || undefined,
        unit,
      };

      if (editingProduct) {
        const updated = await api.updateProduct(editingProduct.id, payload);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        success('Produto atualizado!');
      } else {
        const created = await api.createProduct(payload);
        setProducts((prev) => [created, ...prev]);
        success(isDuplicating ? 'Produto duplicado com sucesso!' : 'Produto adicionado ao catálogo!');
      }

      setIsModalOpen(false);
    } catch (e: any) {
      error(e.message || 'Erro ao guardar produto');
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (!confirm(`Deseja realmente apagar o produto "${prodName}"?`)) return;
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      success('Produto removido');
    } catch (e: any) {
      error('Erro ao remover produto');
    }
  };

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => (p.stockQuantity ?? 0) <= (p.minStock ?? 5));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm));
      const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
      let matchStock = true;
      if (stockFilter === 'low') matchStock = p.stockQuantity <= p.minStock && p.stockQuantity > 0;
      if (stockFilter === 'out') matchStock = p.stockQuantity <= 0;

      return matchSearch && matchCat && matchStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  // Export functions (CSV & Excel)
  const exportProductsToCSV = (targetProducts = filteredProducts) => {
    if (targetProducts.length === 0) {
      warning('Não existem produtos para exportar com os filtros atuais.');
      return;
    }

    const headers = [
      'Nome do Produto',
      'Categoria',
      'Código de Barras',
      'Preço de Compra (' + curr + ')',
      'Preço de Venda (' + curr + ')',
      'Margem Lucro (%)',
      'Stock Actual',
      'Stock Mínimo',
      'Unidade',
      'Data de Vencimento',
      'Estado Stock'
    ];

    const rows = targetProducts.map((p) => {
      const profit = p.sellingPrice - p.costPrice;
      const margin = p.sellingPrice > 0 ? Math.round((profit / p.sellingPrice) * 100) : 0;
      const isOut = p.stockQuantity <= 0;
      const isLow = p.stockQuantity <= p.minStock && !isOut;
      const stockStatus = isOut ? 'Sem Stock' : isLow ? 'Stock Baixo' : 'Normal';

      const escapeCell = (val: any) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      return [
        escapeCell(p.name),
        escapeCell(p.categoryName || 'Geral'),
        escapeCell(p.barcode || ''),
        p.costPrice,
        p.sellingPrice,
        margin,
        p.stockQuantity,
        p.minStock,
        escapeCell(p.unit || 'un'),
        escapeCell(p.expirationDate || ''),
        escapeCell(stockStatus)
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `produtos_${company?.name ? company.name.toLowerCase().replace(/\s+/g, '_') : 'vendafacil'}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success(`Exportados ${targetProducts.length} produtos em formato CSV!`);
  };

  const exportProductsToExcel = (targetProducts = filteredProducts) => {
    if (targetProducts.length === 0) {
      warning('Não existem produtos para exportar com os filtros atuais.');
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const tableRows = targetProducts.map((p) => {
      const profit = p.sellingPrice - p.costPrice;
      const margin = p.sellingPrice > 0 ? Math.round((profit / p.sellingPrice) * 100) : 0;
      const isOut = p.stockQuantity <= 0;
      const isLow = p.stockQuantity <= p.minStock && !isOut;
      const stockStatus = isOut ? 'Sem Stock' : isLow ? 'Stock Baixo' : 'Normal';

      return `
        <tr>
          <td>${p.name}</td>
          <td>${p.categoryName || 'Geral'}</td>
          <td style="mso-number-format:'\\@';">${p.barcode || ''}</td>
          <td style="text-align:right;">${p.costPrice}</td>
          <td style="text-align:right;">${p.sellingPrice}</td>
          <td style="text-align:center;">${margin}%</td>
          <td style="text-align:center; font-weight:bold; ${isLow || isOut ? 'color:#b91c1c;' : ''}">${p.stockQuantity}</td>
          <td style="text-align:center;">${p.minStock}</td>
          <td style="text-align:center;">${p.unit || 'un'}</td>
          <td style="text-align:center;">${p.expirationDate || ''}</td>
          <td style="text-align:center; font-weight:bold; ${isLow || isOut ? 'color:#b91c1c; background-color:#fee2e2;' : 'color:#15803d; background-color:#dcfce7;'}">${stockStatus}</td>
        </tr>
      `;
    }).join('');

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"/>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Produtos</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            th { background-color: #059669; color: #ffffff; font-weight: bold; border: 1px solid #e2e8f0; padding: 8px; }
            td { border: 1px solid #e2e8f0; padding: 6px; }
          </style>
        </head>
        <body>
          <h2>Lista de Produtos - ${company?.name || 'VendaFácil'} (${new Date().toLocaleDateString('pt-PT')})</h2>
          <table>
            <thead>
              <tr>
                <th>Nome do Produto</th>
                <th>Categoria</th>
                <th>Código de Barras</th>
                <th>Preço de Compra (${curr})</th>
                <th>Preço de Venda (${curr})</th>
                <th>Margem (%)</th>
                <th>Stock Actual</th>
                <th>Stock Mínimo</th>
                <th>Unidade</th>
                <th>Data de Vencimento</th>
                <th>Estado Stock</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `produtos_${company?.name ? company.name.toLowerCase().replace(/\s+/g, '_') : 'vendafacil'}_${dateStr}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success(`Exportados ${targetProducts.length} produtos para Excel (.xls)!`);
  };

  return (
    <div className="space-y-5">
      {/* Top Header with Add Product CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Catálogo de Produtos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {products.length} itens cadastrados com controlo de preço, imagens e categorias
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Export Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => exportProductsToExcel(filteredProducts)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 hover:bg-white hover:shadow-2xs transition-all cursor-pointer"
              title="Exportar lista atual para Excel (.xls)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <span className="w-px h-4 bg-slate-300"></span>
            <button
              onClick={() => exportProductsToCSV(filteredProducts)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-white hover:shadow-2xs transition-all cursor-pointer"
              title="Exportar lista atual em formato CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>CSV</span>
            </button>
          </div>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-2xs transition-all shrink-0 cursor-pointer"
          >
            <FolderTree className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Categorias</span>
            <span className="sm:hidden">Cat.</span>
          </button>

          <button
            onClick={() => setIsAiAudioModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 via-emerald-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 active:scale-98 text-white px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all shrink-0 cursor-pointer border border-emerald-500/30"
            title="Registar produto falando por áudio e tirando foto"
          >
            <div className="flex items-center -space-x-1">
              <Mic className="w-4 h-4 text-amber-300" />
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Registar por Áudio/Foto</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Alerta de Stock Baixo Banner */}
      {lowStockProducts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-amber-50/70 to-rose-50 border border-amber-200 rounded-3xl p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700 shadow-2xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-amber-950 text-sm sm:text-base">
                    Alerta de Stock Baixo & Reposição Necessária
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                    {lowStockProducts.length} {lowStockProducts.length === 1 ? 'item crítico' : 'itens críticos'}
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 mt-0.5">
                  Existem produtos que atingiram ou estão abaixo do limite mínimo definido de stock.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  stockFilter === 'low'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                    : 'bg-white hover:bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                {stockFilter === 'low' ? 'Ver Todos os Produtos' : 'Filtrar Críticos'}
              </button>
              <button
                onClick={() => exportProductsToExcel(lowStockProducts)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white shadow-2xs transition-colors cursor-pointer"
                title="Exportar apenas a lista de compras para reposição de stock em Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Lista de Compras</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome ou código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todos os Stocks ({products.length})</option>
              <option value="low">⚠️ Stock Baixo ({lowStockProducts.filter(p => p.stockQuantity > 0).length})</option>
              <option value="out">❌ Sem Stock ({products.filter(p => p.stockQuantity <= 0).length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table / Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 sm:px-5">Nome do Produto</th>
                <th className="p-3.5 sm:px-4">Categoria</th>
                <th className="p-3.5 sm:px-4 text-right">Preço de Compra</th>
                <th className="p-3.5 sm:px-4 text-right">Preço de Venda</th>
                <th className="p-3.5 sm:px-4 text-center">Stock Actual</th>
                <th className="p-3.5 sm:px-4 text-center">Stock Mínimo</th>
                <th className="p-3.5 sm:px-4 text-center">Data de Vencimento</th>
                <th className="p-3.5 sm:px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.map((prod) => {
                const profit = prod.sellingPrice - prod.costPrice;
                const margin = prod.sellingPrice > 0 ? Math.round((profit / prod.sellingPrice) * 100) : 0;
                const isOut = prod.stockQuantity <= 0;
                const isLow = prod.stockQuantity <= prod.minStock && !isOut;

                // Check expiration status
                let isExpired = false;
                let isExpiringSoon = false;
                if (prod.expirationDate) {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const exp = new Date(prod.expirationDate);
                  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  if (diffDays < 0) isExpired = true;
                  else if (diffDays <= 30) isExpiringSoon = true;
                }

                return (
                  <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 sm:px-5">
                      <div className="flex items-center gap-3">
                        <ProductThumbnail
                          imageUrl={prod.imageUrl}
                          name={prod.name}
                          categoryName={prod.categoryName}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{prod.name}</p>
                          {prod.barcode && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                              <Barcode className="w-3 h-3" />
                              <span>{prod.barcode}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 sm:px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200/80">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              categories.find((c) => c.id === prod.categoryId || c.name === prod.categoryName)?.color || '#10B981',
                          }}
                        />
                        <span className="truncate max-w-[130px]">{prod.categoryName || 'Geral'}</span>
                      </span>
                    </td>
                    <td className="p-3.5 sm:px-4 text-right text-slate-500">
                      {formatCurrency(prod.costPrice)}
                    </td>
                    <td className="p-3.5 sm:px-4 text-right">
                      <span className="font-bold text-emerald-700 text-sm">{formatCurrency(prod.sellingPrice)}</span>
                      <span className={`block text-[10px] font-bold ${
                        margin >= 30 ? 'text-emerald-600' : margin > 0 ? 'text-blue-600' : 'text-rose-600'
                      }`}>
                        {margin}% margem
                      </span>
                    </td>
                    <td className="p-3.5 sm:px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isOut ? 'bg-rose-100 text-rose-800' : isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {isOut && <AlertTriangle className="w-3 h-3" />}
                        <span>{prod.stockQuantity} {prod.unit || 'un'}</span>
                      </span>
                    </td>
                    <td className="p-3.5 sm:px-4 text-center text-slate-600 font-bold">
                      {prod.minStock} {prod.unit || 'un'}
                    </td>
                    <td className="p-3.5 sm:px-4 text-center">
                      {prod.expirationDate ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                            isExpired
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isExpiringSoon
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                          title={isExpired ? 'Produto Vencido!' : isExpiringSoon ? 'Vence em menos de 30 dias' : 'Válido'}
                        >
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{new Date(prod.expirationDate).toLocaleDateString('pt-PT')}</span>
                          {isExpired && <span className="text-[9px] uppercase px-1 bg-rose-200 text-rose-900 rounded font-black">Vencido</span>}
                          {isExpiringSoon && !isExpired && <span className="text-[9px] uppercase px-1 bg-amber-200 text-amber-900 rounded font-black">Breve</span>}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Não definida</span>
                      )}
                    </td>
                    <td className="p-3.5 sm:px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDuplicateModal(prod)}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Duplicar Produto"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(prod)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-bold text-slate-700">Nenhum produto encontrado</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div>
                  <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                    {isDuplicating && <Copy className="w-4 h-4 text-blue-600" />}
                    {isDuplicating
                      ? 'Duplicar Produto'
                      : editingProduct
                      ? 'Editar Produto'
                      : 'Novo Produto'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isDuplicating
                      ? 'Criação de um novo produto baseado nos dados copiados. Pode ajustar preços, stock e foto.'
                      : 'Insira os dados, categoria e foto do produto para identificação nas vendas'}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="py-4 space-y-4 text-xs">
                {/* Product Image Uploader */}
                <ProductImageUploader
                  imageUrl={imageUrl}
                  onChange={setImageUrl}
                  productName={name}
                  categoryName={categories.find((c) => c.id === categoryId)?.name}
                />

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Arroz 1kg Tio Lucas, Corte Degradê, Paracetamol..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">Categoria *</label>
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        + Gerir / Nova
                      </button>
                    </div>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unidade</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="un">Unidade (un)</option>
                      <option value="kg">Quilograma (kg)</option>
                      <option value="lt">Litro (lt)</option>
                      <option value="cx">Caixa (cx)</option>
                      <option value="pct">Pacote (pct)</option>
                      <option value="srv">Serviço (srv)</option>
                      <option value="hr">Hora (hr)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Preço de Custo ({curr})</label>
                    <input
                      type="number"
                      min="0"
                      value={costPrice}
                      onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Preço de Venda ({curr}) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-emerald-800 font-black focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Profit Margin indicator */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Margem de Lucro Estimada:</span>
                  <span className="font-bold text-emerald-700">{calculateMargin()}% ({formatCurrency(sellingPrice - costPrice)}/un)</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Stock Atual</label>
                    <input
                      type="number"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Alerta Stock Mínimo</label>
                    <input
                      type="number"
                      min="0"
                      value={minStock}
                      onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Data de Validade (Vencimento)</label>
                    <input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Código de Barras (Opcional)</label>
                    <div className="relative">
                      <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="Ex: 560123456789"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
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
                    className={`flex-1 py-2.5 rounded-xl font-bold transition-colors shadow-sm text-white ${
                      isDuplicating
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isDuplicating ? 'Duplicar e Criar Produto' : 'Guardar Produto'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Audio & Photo Registration Modal */}
      <AiAudioProductRegistrationModal
        isOpen={isAiAudioModalOpen}
        onClose={() => setIsAiAudioModalOpen(false)}
        categories={categories}
        currency={curr}
        onProductCreated={(newProd) => {
          setProducts((prev) => [newProd, ...prev]);
        }}
      />

      {/* Category Management Modal */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onCategoriesChanged={loadData}
        onSelectCategory={(newCatId) => setCategoryId(newCatId)}
      />
    </div>
  );
};
