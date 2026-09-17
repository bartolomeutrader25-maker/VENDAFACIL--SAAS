import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ScanBarcode,
  Plus,
  Minus,
  Trash2,
  Check,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  X,
  Receipt,
  RotateCcw,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Product, Customer, Sale, PaymentMethod } from '../types/index.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { ReceiptModal } from '../components/common/ReceiptModal.js';
import { BarcodeScannerModal } from '../components/common/BarcodeScannerModal.js';
import { ProductThumbnail } from '../components/common/ProductThumbnail.js';

interface CartItem {
  product: Product;
  quantity: number;
}

export const PosSalePage: React.FC = () => {
  const { company, user } = useAuth();
  const { success, error, warning } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Modals & Flow
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const curr = company?.currency || 'Kz';

  const formatCurrency = (val: number) => {
    return `${(val || 0).toLocaleString('pt-PT')} ${curr}`;
  };

  const loadData = async () => {
    try {
      const [prodList, catList, custList] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getCustomers(),
      ]);
      setProducts(prodList);
      setCategories(catList);
      setCustomers(custList);
    } catch (e: any) {
      error('Erro ao carregar dados do PDV');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm)) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchSearch && p.isActive;
    });
  }, [products, selectedCategory, searchTerm]);

  const addToCart = (product: Product) => {
    const availableStock = product.stockQuantity ?? product.currentStock ?? 0;
    if (availableStock <= 0) {
      warning(`Atenção: O produto ${product.name} está esgotado no stock!`);
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setReceivedAmount('');
    setDiscountAmount(0);
    setNotes('');
  };

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.sellingPrice * item.quantity, 0);
  }, [cart]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const changeAmount = useMemo(() => {
    if (paymentMethod !== 'dinheiro') return 0;
    const rec = parseFloat(receivedAmount) || 0;
    return Math.max(0, rec - total);
  }, [receivedAmount, total, paymentMethod]);

  const handleBarcodeScanned = (barcode: string) => {
    const found = products.find((p) => p.barcode === barcode);
    if (found) {
      addToCart(found);
      success(`Produto adicionado: ${found.name}`);
    } else {
      warning(`Nenhum produto encontrado com o código: ${barcode}`);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    try {
      const created = await api.createCustomer({
        name: newCustName,
        phone: newCustPhone,
      });
      setCustomers((prev) => [...prev, created]);
      setSelectedCustomer(created);
      setIsNewCustomerModalOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      success(`Cliente ${created.name} adicionado!`);
    } catch (e: any) {
      error('Erro ao cadastrar cliente');
    }
  };

  const handleFinishSale = async () => {
    if (cart.length === 0) {
      warning('Adicione produtos ao carrinho antes de finalizar');
      return;
    }

    if (paymentMethod === 'credito_fiado' && !selectedCustomer) {
      warning('Para vendas a Fiado / Crédito, é obrigatório selecionar um cliente');
      return;
    }

    try {
      setIsSubmitting(true);
      const salePayload = {
        customerId: selectedCustomer?.id,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.product.sellingPrice,
        })),
        paymentMethod,
        discount: discountAmount,
        receivedAmount: paymentMethod === 'dinheiro' ? (parseFloat(receivedAmount) || total) : total,
        paidAmount: paymentMethod === 'credito_fiado' ? (parseFloat(receivedAmount) || 0) : total,
        notes,
      };

      const result = await api.createSale(salePayload);
      setCompletedSale(result);

      // Trigger Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {}

      success('Venda concluída com sucesso!');
      clearCart();
      loadData(); // refresh stock numbers
    } catch (e: any) {
      error(e.message || 'Erro ao finalizar venda');
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentOptions: { id: PaymentMethod; label: string; icon: any }[] = [
    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
    { id: 'multicaixa_express', label: 'Express', icon: Smartphone },
    { id: 'transferencia', label: 'Transferência', icon: Building2 },
    { id: 'cartao', label: 'TPA / Cartão', icon: CreditCard },
    { id: 'credito_fiado', label: 'Fiado (Crédito)', icon: User },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* LEFT COLUMN: CATALOG & BARCODE SEARCH (8 cols on large) */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        {/* Search and Barcode Quick Bar */}
        <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar produto por nome, código ou referência..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 sm:px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-colors shadow-sm shrink-0"
            title="Leitor de Código de Barras"
          >
            <ScanBarcode className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Scanner</span>
          </button>
        </div>

        {/* Categories Chip Carousel */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Todos ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: cat.color || '#10B981' }}
              />
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map((product) => {
            const inCart = cart.find((i) => i.product.id === product.id);
            const isOut = product.stockQuantity <= 0;

            return (
              <motion.div
                key={product.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => addToCart(product)}
                className={`bg-white rounded-2xl p-2.5 sm:p-3 border transition-all cursor-pointer select-none flex flex-col justify-between relative overflow-hidden group ${
                  inCart
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                    : 'border-slate-200/80 hover:border-emerald-400 hover:shadow-md shadow-2xs'
                }`}
              >
                {inCart && (
                  <span className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-md ring-2 ring-white">
                    {inCart.quantity}
                  </span>
                )}

                <div>
                  {/* Product Thumbnail / Image Visual Area */}
                  <div className="relative mb-2.5 overflow-hidden rounded-xl bg-slate-100 aspect-[4/3] w-full flex items-center justify-center">
                    <ProductThumbnail
                      imageUrl={product.imageUrl}
                      name={product.name}
                      categoryName={product.categoryName}
                      size="full"
                      className="transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Category tag overlaid on top-left */}
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[9px] font-bold text-slate-700 shadow-2xs truncate max-w-[75%]">
                      {product.categoryName || 'Geral'}
                    </span>
                    {/* Stock badge overlaid on bottom-right */}
                    <span
                      className={`absolute bottom-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-2xs backdrop-blur-xs ${
                        isOut
                          ? 'bg-rose-500/90 text-white'
                          : product.stockQuantity <= product.minStock
                          ? 'bg-amber-500/90 text-white'
                          : 'bg-slate-900/75 text-white'
                      }`}
                    >
                      {isOut ? 'Esgotado' : `${product.stockQuantity} un`}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2 min-h-[2.4rem]">
                    {product.name}
                  </h4>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-black text-xs sm:text-sm text-emerald-700">
                    {formatCurrency(product.sellingPrice)}
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200/80">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Nenhum produto encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Tente buscar por outro termo ou categoria</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: FAST CHECKOUT CART & PAYMENT (4-5 cols on large) */}
      <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-lg p-4 sm:p-5 space-y-4">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Carrinho de Venda</h3>
                <span className="text-[11px] text-slate-400">{cart.length} item(ns)</span>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Customer Selection Field */}
          <div>
            <div className="flex items-center justify-between mb-1 text-xs font-semibold text-slate-600">
              <span>Cliente (Opcional)</span>
              <button
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="text-emerald-700 hover:underline text-[11px] font-bold"
              >
                + Novo Cliente
              </button>
            </div>
            <select
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const found = customers.find((c) => c.id === e.target.value);
                setSelectedCustomer(found || null);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="">Consumidor Final (Cliente Balcão)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} {c.totalDebt > 0 ? `[Dívida: ${formatCurrency(c.totalDebt)}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Cart Items List */}
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 pr-1">
            {cart.map((item) => (
              <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <ProductThumbnail
                    imageUrl={item.product.imageUrl}
                    name={item.product.name}
                    categoryName={item.product.categoryName}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-xs text-slate-800 truncate">{item.product.name}</h5>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {formatCurrency(item.product.sellingPrice)} un
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-slate-300 hover:text-rose-600 transition-colors ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                Toque nos produtos ao lado para adicionar ao carrinho.
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="pt-2 border-t border-slate-100">
            <span className="block text-xs font-bold text-slate-600 mb-2">
              Forma de Pagamento
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {paymentOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = paymentMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`p-2 rounded-xl border text-center text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] leading-tight truncate w-full">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Change Calculator or Fiado Initial Entry */}
          {paymentMethod === 'dinheiro' && (
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Valor Entregue pelo Cliente:</span>
                <input
                  type="number"
                  placeholder={total.toString()}
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  className="w-28 bg-white border border-slate-300 rounded-lg px-2 py-1 text-right text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-slate-200">
                <span className="text-slate-600">Troco a Devolver:</span>
                <span className="text-emerald-700 text-sm font-black">{formatCurrency(changeAmount)}</span>
              </div>
            </div>
          )}

          {paymentMethod === 'credito_fiado' && (
            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 space-y-1 text-xs">
              <p className="font-bold text-amber-900">Venda a Prazo / Fiado</p>
              <p className="text-[11px] text-amber-700">
                O valor total ({formatCurrency(total)}) será lançado como dívida no perfil de {selectedCustomer?.name || 'Cliente Selecionado'}.
              </p>
            </div>
          )}

          {/* Summary Totals */}
          <div className="space-y-1 pt-2 border-t border-slate-100 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Desconto:</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-slate-900 pt-1">
              <span>TOTAL:</span>
              <span className="text-emerald-700">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Finalize Button */}
          <button
            onClick={handleFinishSale}
            disabled={isSubmitting || cart.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>{isSubmitting ? 'A processar venda...' : 'Finalizar Venda (PDV)'}</span>
          </button>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Digital Receipt Modal */}
      <ReceiptModal
        isOpen={!!completedSale}
        onClose={() => setCompletedSale(null)}
        sale={completedSale}
        company={company}
        onNewSale={clearCart}
      />

      {/* Fast Add Customer Modal */}
      <AnimatePresence>
        {isNewCustomerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">Novo Cliente Rápido</h3>
                <button
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomer} className="py-3 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="Ex: João Baptista"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="+244 923 000 000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm"
                >
                  Gravar Cliente
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
