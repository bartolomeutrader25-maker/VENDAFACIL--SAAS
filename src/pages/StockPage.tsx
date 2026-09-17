import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  Package,
  Calendar,
  X,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, StockMovement, StockMovementType } from '../types/index.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const StockPage: React.FC = () => {
  const { company } = useAuth();
  const { success, error, warning } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [movementType, setMovementType] = useState<StockMovementType>('entrada');
  const [quantity, setQuantity] = useState<number>(1);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [reason, setReason] = useState('');

  const curr = company?.currency || 'Kz';

  const formatCurrency = (val: number) => {
    return `${(val || 0).toLocaleString('pt-PT')} ${curr}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodList, movList] = await Promise.all([
        api.getProducts(),
        api.getStockMovements(),
      ]);
      setProducts(prodList);
      setMovements(movList);
      if (prodList.length > 0 && !selectedProductId) {
        setSelectedProductId(prodList[0].id);
      }
    } catch (e: any) {
      error('Erro ao carregar dados de stock');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalCostValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + p.costPrice * Math.max(0, p.stockQuantity ?? p.currentStock ?? 0), 0);
  }, [products]);

  const totalSalesPotential = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.sellingPrice ?? p.salePrice ?? 0) * Math.max(0, p.stockQuantity ?? p.currentStock ?? 0), 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => (p.stockQuantity ?? p.currentStock ?? 0) <= p.minStock).length;
  }, [products]);

  const handleOpenMovementModal = (type: StockMovementType, prodId?: string) => {
    setMovementType(type);
    if (prodId) setSelectedProductId(prodId);
    else if (products.length > 0) setSelectedProductId(products[0].id);
    setQuantity(1);
    setCostPrice(0);
    setReason('');
    setIsModalOpen(true);
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) {
      warning('Selecione um produto e quantidade válida');
      return;
    }

    try {
      const created = await api.createStockMovement({
        productId: selectedProductId,
        type: movementType,
        quantity: Number(quantity),
        costPrice: Number(costPrice) || undefined,
        reason: reason.trim() || undefined,
      });

      setMovements((prev) => [created, ...prev]);
      success('Movimentação de stock registada!');
      setIsModalOpen(false);
      loadData();
    } catch (e: any) {
      error(e.message || 'Erro ao movimentar stock');
    }
  };

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchSearch =
        m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.reason && m.reason.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });
  }, [movements, searchTerm]);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Gestão de Stock & Inventário
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Valor patrimonial, entradas de fornecedores e histórico de saídas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenMovementModal('entrada')}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Entrada de Mercadoria</span>
          </button>
          <button
            onClick={() => handleOpenMovementModal('saida')}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Saída / Ajuste</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">Valor em Stock (Custo)</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(totalCostValuation)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Investimento total em mercadoria</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">Potencial de Venda (Faturamento)</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {formatCurrency(totalSalesPotential)}
          </p>
          <span className="text-[11px] text-emerald-600 font-bold">
            Lucro Potencial: {formatCurrency(totalSalesPotential - totalCostValuation)}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">Alertas de Reposição</span>
          <p className={`text-xl sm:text-2xl font-black mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {lowStockCount} <span className="text-sm font-semibold text-slate-400">itens críticos</span>
          </p>
          <span className="text-[11px] text-slate-400 font-medium">Abaixo do stock mínimo configurado</span>
        </div>
      </div>

      {/* Movements History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="font-bold text-base text-slate-900">Histórico de Movimentações</h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por produto ou motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 sm:px-5">Data/Hora</th>
                <th className="p-3.5 sm:px-4">Produto</th>
                <th className="p-3.5 sm:px-4 text-center">Tipo</th>
                <th className="p-3.5 sm:px-4 text-center">Qtd</th>
                <th className="p-3.5 sm:px-4">Operador / Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredMovements.map((mov) => {
                const isEntry = mov.type === 'entrada' || mov.type === 'devolucao';

                return (
                  <tr key={mov.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 sm:px-5 text-slate-500 whitespace-nowrap">
                      {new Date(mov.createdAt).toLocaleString('pt-PT')}
                    </td>
                    <td className="p-3.5 sm:px-4 font-bold text-slate-900">
                      {mov.productName}
                    </td>
                    <td className="p-3.5 sm:px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        isEntry ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {mov.type}
                      </span>
                    </td>
                    <td className="p-3.5 sm:px-4 text-center font-bold text-sm">
                      <span className={isEntry ? 'text-emerald-700' : 'text-rose-700'}>
                        {isEntry ? `+${mov.quantity}` : `-${mov.quantity}`}
                      </span>
                    </td>
                    <td className="p-3.5 sm:px-4 text-slate-600">
                      <span className="font-semibold text-slate-800">{mov.userName}</span>
                      {mov.reason && <span className="text-slate-400 ml-1">({mov.reason})</span>}
                    </td>
                  </tr>
                );
              })}

              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Boxes className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-bold text-slate-700">Nenhuma movimentação registada</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movement Modal */}
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
                  {movementType === 'entrada' ? 'Registar Entrada de Mercadoria' : 'Registar Saída / Ajuste'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMovement} className="py-4 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selecionar Produto *</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Atual: {p.stockQuantity} un)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipo de Movimento</label>
                    <select
                      value={movementType}
                      onChange={(e) => setMovementType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="entrada">Entrada (Compra / Fornecedor)</option>
                      <option value="saida">Saída Manual / Perda</option>
                      <option value="ajuste">Ajuste de Balanço</option>
                      <option value="devolucao">Devolução de Cliente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Quantidade *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-black focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {movementType === 'entrada' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Preço de Custo Unitário ({curr})</label>
                    <input
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Motivo / Observações</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex: Fatura Fornecedor nº 459 / Contagem Física"
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
                    Confirmar Stock
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
