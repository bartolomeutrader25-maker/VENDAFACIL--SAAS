export type Role = 'proprietario' | 'administrador' | 'vendedor' | 'caixa' | 'stock';
export type UserRole = Role;

export type CurrencyCode = 'AOA' | 'USD' | 'EUR';

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'blocked';

export interface Company {
  id: string;
  name: string;
  nif?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  address?: string;
  businessType: string;
  logoUrl?: string;
  currency: string; // "Kz" or "AOA"
  currencySymbol: string; // "Kz"
  receiptFooter?: string;
  createdAt: string;
  planId?: 'free' | 'basic' | 'pro' | 'premium';
  plan?: string;
  // Trial and Subscription tracking
  trialActive?: boolean;
  trialStartDate?: string;
  trialEndDate?: string;
  trialDays?: number;
  subscriptionStatus?: SubscriptionStatus;
  selectedPlan?: 'free' | 'basic' | 'pro' | 'premium';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  ownerName?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  companyId: string;
  companyName: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  isSuperAdmin?: boolean;
}

export interface Category {
  id: string;
  companyId: string;
  name: string;
  icon?: string;
  color?: string;
  itemCount?: number;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  code: string;
  barcode?: string;
  categoryId: string;
  categoryName?: string;
  description?: string;
  imageUrl?: string;
  costPrice: number; // Preço de compra (Kz)
  salePrice: number; // Preço de venda (Kz)
  sellingPrice?: number; // Alias for salePrice
  currentStock: number;
  stockQuantity?: number; // Alias for currentStock
  minStock: number;
  unit: string; // 'un', 'kg', 'cx', 'pct', 'l'
  expirationDate?: string; // Data de Vencimento / Validade (YYYY-MM-DD)
  isActive: boolean;
  createdAt: string;
}

export type PaymentMethod = 
  | 'dinheiro' 
  | 'multicaixa_express' 
  | 'transferencia' 
  | 'cartao' 
  | 'credito_fiado' 
  | 'outro';

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  subtotal: number;
  unit: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  companyId: string;
  userId: string;
  userName: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  profit: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pago' | 'pendente' | 'parcial';
  paidAmount: number;
  changeAmount: number;
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  nif?: string;
  notes?: string;
  totalPurchases: number; // Total gasto
  purchaseCount: number;
  lastPurchaseDate?: string;
  currentDebt: number; // Valor em dívida / fiado
  totalDebt?: number; // Alias for currentDebt
  createdAt: string;
}

export interface ReceivablePayment {
  id: string;
  receivableId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  receivedByUserId: string;
  receivedByUserName: string;
  createdAt: string;
  notes?: string;
}

export interface Receivable {
  id: string;
  companyId: string;
  saleId: string;
  saleNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  status: 'pendente' | 'parcial' | 'pago' | 'vencido';
  createdAt: string;
  payments: ReceivablePayment[];
}

export type MovementType = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'VENDA' | 'DEVOLUCAO' | 'entrada' | 'saida' | 'ajuste' | 'venda' | 'devolucao';
export type StockMovementType = MovementType;

export interface StockMovement {
  id: string;
  companyId: string;
  productId: string;
  productName: string;
  quantity: number;
  type: MovementType;
  userId: string;
  userName: string;
  reason: string;
  costPrice?: number;
  createdAt: string;
}

export type ExpenseCategory = 
  | 'compra_mercadoria'
  | 'transporte'
  | 'energia'
  | 'agua'
  | 'internet'
  | 'salarios'
  | 'renda'
  | 'marketing'
  | 'outros';

export interface Expense {
  id: string;
  companyId: string;
  description: string;
  category: ExpenseCategory;
  categoryLabel?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  userId: string;
  userName: string;
  notes?: string;
  date: string;
  createdAt: string;
}

export interface CashMovement {
  id: string;
  cashRegisterId: string;
  type: 'entrada' | 'saida' | 'venda' | 'despesa' | 'pagamento_fiado';
  amount: number;
  description: string;
  userId: string;
  userName: string;
  paymentMethod: PaymentMethod;
  referenceId?: string; // saleId, expenseId, etc
  createdAt: string;
}

export interface CashRegister {
  id: string;
  companyId: string;
  openedByUserId: string;
  openedByUserName: string;
  closedByUserId?: string;
  closedByUserName?: string;
  openingAmount: number; // Saldo inicial
  openingBalance?: number;
  expectedAmount: number; // Saldo esperado
  currentBalance?: number;
  closingAmount?: number; // Saldo informado físico
  actualBalance?: number;
  differenceAmount?: number; // Diferença
  difference?: number;
  totalSalesCash?: number;
  totalSalesOther?: number;
  userName?: string;
  status: 'aberto' | 'fechado';
  openedAt: string;
  closedAt?: string;
  movements: CashMovement[];
  notes?: string;
}

export interface NotificationItem {
  id: string;
  companyId: string;
  title: string;
  message: string;
  type: 'stock_baixo' | 'stock_esgotado' | 'cliente_divida' | 'pagamento_vencimento' | 'recorde_vendas' | 'queda_vendas' | 'info' | 'warning' | 'success';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: 'free' | 'basic' | 'pro' | 'premium';
  name: string;
  price: number; // Kz / mês
  billingPeriod: string;
  salesLimit: number | null; // null = ilimitado
  productsLimit: number | null; // null = ilimitado
  usersLimit: number | null;
  hasAi: boolean;
  hasFiado: boolean;
  hasAdvancedReports: boolean;
  hasMultiStore: boolean;
  features: string[];
}

export interface CompanySubscription {
  companyId: string;
  planId: 'free' | 'basic' | 'pro' | 'premium';
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'trial' | 'expired' | 'blocked';
  currentPeriodEnd: string;
  salesCountThisMonth: number;
  productsCount: number;
  usersCount: number;
  trialStartDate?: string;
  trialEndDate?: string;
  trialDaysRemaining?: number;
  isExpired?: boolean;
}

export interface AdminNotificationLog {
  id: string;
  companyId: string;
  companyName: string;
  ownerName: string;
  businessType: string;
  nif?: string;
  email: string;
  phone: string;
  createdAt: string;
  trialDays: number;
  trialEndDate: string;
  whatsappText: string;
  emailSent: boolean;
  whatsappSent: boolean;
}

export interface SaasSettings {
  trialDurationDays: number;
  basicPlanPrice: number;
  proPlanPrice: number;
  premiumPlanPrice?: number;
  planPrices?: {
    basic: number;
    pro: number;
    premium: number;
  };
  adminEmail: string;
  adminPhone: string;
  bankIban?: string;
  accountHolder?: string;
  multicaixaPhone?: string;
}

export interface SaasMetrics {
  mrr: number;
  arr: number;
  totalCompanies: number;
  activeCompanies: number;
  activeTrials: number;
  expiredTrials: number;
  activePaidSubscriptions: number;
  blockedCompanies: number;
  basicPlanCount: number;
  proPlanCount: number;
  churnRate: number;
  freeToPaidConversion: number;
  totalPlatformSales: number;
  planDistribution: {
    free: number;
    basic: number;
    pro: number;
    premium: number;
  };
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  dataPoints?: {
    label: string;
    value: string | number;
  }[];
}
