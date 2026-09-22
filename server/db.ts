import fs from 'fs';
import path from 'path';
import {
  Company,
  User,
  Category,
  Product,
  Sale,
  Customer,
  Receivable,
  StockMovement,
  Expense,
  CashRegister,
  NotificationItem,
  SubscriptionPlan,
  CompanySubscription,
  SaasMetrics,
  AdminNotificationLog,
  SaasSettings,
  SubscriptionStatus
} from '../src/types/index.js';

// Persistent Database Engine for Multi-tenant VendaFácil SaaS
class Database {
  public companies: Map<string, Company> = new Map();
  public users: Map<string, User & { passwordHash: string }> = new Map();
  public categories: Map<string, Category> = new Map();
  public products: Map<string, Product> = new Map();
  public customers: Map<string, Customer> = new Map();
  public sales: Map<string, Sale> = new Map();
  public receivables: Map<string, Receivable> = new Map();
  public stockMovements: Map<string, StockMovement> = new Map();
  public expenses: Map<string, Expense> = new Map();
  public cashRegisters: Map<string, CashRegister> = new Map();
  public notifications: Map<string, NotificationItem> = new Map();
  public subscriptions: Map<string, CompanySubscription> = new Map();
  public plans: Map<string, SubscriptionPlan> = new Map();
  public adminNotificationLogs: Map<string, AdminNotificationLog> = new Map();

  public saasSettings: SaasSettings = {
    trialDurationDays: 7,
    basicPlanPrice: 5000,
    proPlanPrice: 10000,
    premiumPlanPrice: 30000,
    planPrices: {
      basic: 5000,
      pro: 10000,
      premium: 30000
    },
    adminEmail: 'bartolomeutrader25@gmail.com',
    adminPhone: '+244972911640',
    multicaixaPhone: '972 911 640 / 947 050 586',
    bankIban: '0040 0000 1472 2403 1016 5',
    accountHolder: 'BARTOLOMEU SUNDA CONDE MAVUNGO'
  };

  private dbFilePath = path.join(process.cwd(), 'data', 'saas_database.json');
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initDatabase();
  }

  // Initialize DB: Load from persistent file or initialize clean zero state
  private initDatabase() {
    try {
      const dataDir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.dbFilePath)) {
        const success = this.loadFromFile();
        if (!success) {
          this.initZeroState();
          this.saveToFileSync();
        }
      } else {
        this.initZeroState();
        this.saveToFileSync();
      }
    } catch (err) {
      console.error('Erro ao inicializar base de dados:', err);
      this.initZeroState();
    }
  }

  // Clean Zeroed Initial State: 100% prepared for real customers, zero demo records
  public initZeroState() {
    // 1. Clear all client entities
    this.companies.clear();
    this.users.clear();
    this.categories.clear();
    this.products.clear();
    this.customers.clear();
    this.sales.clear();
    this.receivables.clear();
    this.stockMovements.clear();
    this.expenses.clear();
    this.cashRegisters.clear();
    this.notifications.clear();
    this.subscriptions.clear();
    this.adminNotificationLogs.clear();

    // 2. Initialize default subscription plans
    this.seedPlans();

    // 3. Master Administrative Company (Isolated from client stores)
    const masterCompany: Company = {
      id: 'comp-superadmin',
      name: 'VendaFácil Global SaaS',
      nif: '5000999888LA001',
      phone: '+244 972 911 640',
      whatsapp: '+244 972 911 640',
      email: 'bartolomeutrader25@gmail.com',
      address: 'Luanda, Angola',
      businessType: 'Plataforma SaaS & Gestão Comercial',
      currency: 'Kz',
      currencySymbol: 'Kz',
      receiptFooter: 'VendaFácil SaaS - O Software de Gestão Comercial Líder em Angola',
      createdAt: new Date().toISOString(),
      planId: 'premium',
      plan: 'premium',
      selectedPlan: 'premium',
      ownerName: 'Bartolomeu Conde',
      subscriptionStatus: 'active',
      trialActive: false
    };
    this.companies.set(masterCompany.id, masterCompany);

    // 4. Master SuperAdmin Users
    const bartolomeuSuperAdmin: User & { passwordHash: string } = {
      id: 'usr-bartolomeu-superadmin',
      name: 'Bartolomeu Conde',
      email: 'bartolomeutrader25@gmail.com',
      phone: '+244 972 911 640',
      role: 'proprietario',
      companyId: 'comp-superadmin',
      companyName: 'VendaFácil Global SaaS',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      isActive: true,
      createdAt: new Date().toISOString(),
      passwordHash: 'admin123',
      isSuperAdmin: true
    };
    this.users.set(bartolomeuSuperAdmin.id, bartolomeuSuperAdmin);

    const masterAdmin: User & { passwordHash: string } = {
      id: 'usr-superadmin',
      name: 'Super Admin VendaFácil',
      email: 'admin@vendafacil.co.ao',
      phone: '+244 972 911 640',
      role: 'proprietario',
      companyId: 'comp-superadmin',
      companyName: 'VendaFácil Global SaaS',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      isActive: true,
      createdAt: new Date().toISOString(),
      passwordHash: 'admin123',
      isSuperAdmin: true
    };
    this.users.set(masterAdmin.id, masterAdmin);

    console.log('✨ Base de dados VendaFácil inicializada 100% limpa (zerada), pronta para novos clientes.');
  }

  // Alias for compatibility
  public seedDemoCompany() {
    this.initZeroState();
    this.saveToFileSync();
  }

  public seedPlans() {
    this.plans.clear();
    const plans: SubscriptionPlan[] = [
      {
        id: 'free',
        name: 'Teste Gratuito (7 Dias)',
        price: 0,
        billingPeriod: 'mensal',
        hasAi: false,
        hasFiado: true,
        hasAdvancedReports: false,
        hasMultiStore: false,
        features: [
          '7 dias de acesso total',
          'Até 50 produtos cadastrados',
          'Até 100 vendas no período',
          'Gestão de estoque básica',
          '1 Utilizador',
          'Relatórios resumidos',
          'Suporte via WhatsApp'
        ],
        salesLimit: 100,
        productsLimit: 50,
        usersLimit: 1
      },
      {
        id: 'basic',
        name: 'Plano Básico',
        price: this.saasSettings.basicPlanPrice,
        billingPeriod: 'mensal',
        hasAi: false,
        hasFiado: true,
        hasAdvancedReports: false,
        hasMultiStore: false,
        features: [
          'Vendas ilimitadas',
          'Até 300 produtos cadastrados',
          '2 Utilizadores (Operador + Gerente)',
          'Gestão de estoque com alertas',
          'Emissão de faturas/recibos térmicos e A4',
          'Controle de caixa diário (abertura/fecho)',
          'Gestão de clientes e fiados',
          'Relatórios de vendas e lucros',
          'Suporte prioritário via WhatsApp'
        ],
        salesLimit: null,
        productsLimit: 300,
        usersLimit: 2
      },
      {
        id: 'pro',
        name: 'Plano Pro (Mais Popular)',
        price: this.saasSettings.proPlanPrice,
        billingPeriod: 'mensal',
        hasAi: true,
        hasFiado: true,
        hasAdvancedReports: true,
        hasMultiStore: false,
        features: [
          'Tudo do Plano Básico',
          'Produtos ilimitados',
          'Até 5 Utilizadores com permissões por perfil',
          'Assistente de IA Comercial (Gemini Flash)',
          'Controle avançado de fiados com lembretes WhatsApp',
          'Gestão de despesas e lucros líquidos',
          'Histórico completo de movimentações de estoque',
          'Múltiplas formas de pagamento (TPA, Cash, Express, Fiado)',
          'Backup automático diário dos dados',
          'Suporte VIP via WhatsApp'
        ],
        salesLimit: null,
        productsLimit: null,
        usersLimit: 5
      },
      {
        id: 'premium',
        name: 'Plano Premium / Armazém',
        price: this.saasSettings.premiumPlanPrice || 30000,
        billingPeriod: 'mensal',
        hasAi: true,
        hasFiado: true,
        hasAdvancedReports: true,
        hasMultiStore: true,
        features: [
          'Tudo do Plano Pro',
          'Utilizadores ilimitados',
          'Multi-caixas em simultâneo',
          'Gestão multi-lojas / filiais',
          'Relatórios fiscais detalhados',
          'Atendimento dedicado 24/7'
        ],
        salesLimit: null,
        productsLimit: null,
        usersLimit: null
      }
    ];

    plans.forEach(p => this.plans.set(p.id, p));
  }

  // ==========================================
  // PERSISTENCE & FILE STORAGE
  // ==========================================

  public saveToFileSync() {
    try {
      const dataDir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const dump = {
        _version: '2.0.0',
        _savedAt: new Date().toISOString(),
        saasSettings: this.saasSettings,
        companies: Array.from(this.companies.entries()),
        users: Array.from(this.users.entries()),
        categories: Array.from(this.categories.entries()),
        products: Array.from(this.products.entries()),
        customers: Array.from(this.customers.entries()),
        sales: Array.from(this.sales.entries()),
        receivables: Array.from(this.receivables.entries()),
        stockMovements: Array.from(this.stockMovements.entries()),
        expenses: Array.from(this.expenses.entries()),
        cashRegisters: Array.from(this.cashRegisters.entries()),
        notifications: Array.from(this.notifications.entries()),
        subscriptions: Array.from(this.subscriptions.entries()),
        plans: Array.from(this.plans.entries()),
        adminNotificationLogs: Array.from(this.adminNotificationLogs.entries())
      };

      fs.writeFileSync(this.dbFilePath, JSON.stringify(dump, null, 2), 'utf-8');
    } catch (err) {
      console.error('Erro ao guardar base de dados em disco:', err);
    }
  }

  public saveToFile() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToFileSync();
    }, 250);
  }

  public loadFromFile(): boolean {
    try {
      if (!fs.existsSync(this.dbFilePath)) return false;
      const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
      if (!raw || raw.trim().length === 0) return false;

      const data = JSON.parse(raw);
      if (!data || !data.companies) return false;

      if (data.saasSettings) this.saasSettings = { ...this.saasSettings, ...data.saasSettings };

      const restoreMap = (target: Map<string, any>, entries?: [string, any][]) => {
        target.clear();
        if (Array.isArray(entries)) {
          entries.forEach(([key, val]) => target.set(key, val));
        }
      };

      restoreMap(this.companies, data.companies);
      restoreMap(this.users, data.users);
      restoreMap(this.categories, data.categories);
      restoreMap(this.products, data.products);
      restoreMap(this.customers, data.customers);
      restoreMap(this.sales, data.sales);
      restoreMap(this.receivables, data.receivables);
      restoreMap(this.stockMovements, data.stockMovements);
      restoreMap(this.expenses, data.expenses);
      restoreMap(this.cashRegisters, data.cashRegisters);
      restoreMap(this.notifications, data.notifications);
      restoreMap(this.subscriptions, data.subscriptions);
      restoreMap(this.plans, data.plans);
      restoreMap(this.adminNotificationLogs, data.adminNotificationLogs);

      // Always guarantee plans and superadmin presence
      if (this.plans.size === 0) this.seedPlans();

      if (!this.companies.has('comp-superadmin')) {
        this.companies.set('comp-superadmin', {
          id: 'comp-superadmin',
          name: 'VendaFácil Global SaaS',
          nif: '5000999888LA001',
          phone: '+244 972 911 640',
          whatsapp: '+244 972 911 640',
          email: 'bartolomeutrader25@gmail.com',
          address: 'Luanda, Angola',
          businessType: 'Plataforma SaaS & Gestão Comercial',
          currency: 'Kz',
          currencySymbol: 'Kz',
          receiptFooter: 'VendaFácil SaaS - O Software de Gestão Comercial Líder em Angola',
          createdAt: new Date().toISOString(),
          planId: 'premium',
          plan: 'premium',
          selectedPlan: 'premium',
          ownerName: 'Bartolomeu Conde',
          subscriptionStatus: 'active',
          trialActive: false
        });
      }

      if (!this.users.has('usr-bartolomeu-superadmin')) {
        this.users.set('usr-bartolomeu-superadmin', {
          id: 'usr-bartolomeu-superadmin',
          name: 'Bartolomeu Conde',
          email: 'bartolomeutrader25@gmail.com',
          phone: '+244 972 911 640',
          role: 'proprietario',
          companyId: 'comp-superadmin',
          companyName: 'VendaFácil Global SaaS',
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
          isActive: true,
          createdAt: new Date().toISOString(),
          passwordHash: 'admin123',
          isSuperAdmin: true
        });
      }

      console.log(`💾 Base de dados carregada do disco (${this.companies.size} empresas, ${this.users.size} utilizadores).`);
      return true;
    } catch (err) {
      console.error('Erro ao ler base de dados do disco:', err);
      return false;
    }
  }

  // ==========================================
  // BACKUP & RESTORE
  // ==========================================

  public exportFullBackup() {
    const clientCompanies = Array.from(this.companies.values()).filter(c => c.id !== 'comp-superadmin');
    return {
      appName: 'VendaFácil SaaS',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      timestamp: Date.now(),
      saasSettings: this.saasSettings,
      summary: {
        totalClientCompanies: clientCompanies.length,
        totalUsers: this.users.size,
        totalProducts: this.products.size,
        totalSales: this.sales.size,
        totalCustomers: this.customers.size,
        totalExpenses: this.expenses.size,
        totalReceivables: this.receivables.size
      },
      data: {
        companies: Array.from(this.companies.entries()),
        users: Array.from(this.users.entries()),
        categories: Array.from(this.categories.entries()),
        products: Array.from(this.products.entries()),
        customers: Array.from(this.customers.entries()),
        sales: Array.from(this.sales.entries()),
        receivables: Array.from(this.receivables.entries()),
        stockMovements: Array.from(this.stockMovements.entries()),
        expenses: Array.from(this.expenses.entries()),
        cashRegisters: Array.from(this.cashRegisters.entries()),
        notifications: Array.from(this.notifications.entries()),
        subscriptions: Array.from(this.subscriptions.entries()),
        plans: Array.from(this.plans.entries()),
        adminNotificationLogs: Array.from(this.adminNotificationLogs.entries())
      }
    };
  }

  public exportCompanyBackup(companyId: string) {
    const company = this.companies.get(companyId);
    if (!company) {
      throw new Error('Empresa não encontrada no sistema');
    }

    const companySales = Array.from(this.sales.values()).filter(s => s.companyId === companyId);
    const companyProducts = Array.from(this.products.values()).filter(p => p.companyId === companyId);
    const companyCategories = Array.from(this.categories.values()).filter(c => c.companyId === companyId);
    const companyCustomers = Array.from(this.customers.values()).filter(c => c.companyId === companyId);
    const companyReceivables = Array.from(this.receivables.values()).filter(r => r.companyId === companyId);
    const companyExpenses = Array.from(this.expenses.values()).filter(e => e.companyId === companyId);
    const companyCashRegisters = Array.from(this.cashRegisters.values()).filter(cr => cr.companyId === companyId);
    const companyStockMovements = Array.from(this.stockMovements.values()).filter(sm => sm.companyId === companyId);

    const totalRevenue = companySales.reduce((acc, s) => acc + (s.total || 0), 0);

    return {
      appName: 'VendaFácil SaaS',
      backupType: 'company_export',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      timestamp: Date.now(),
      company: {
        id: company.id,
        name: company.name,
        nif: company.nif || '',
        phone: company.phone || '',
        email: company.email || '',
        address: company.address || '',
        currency: company.currency || 'Kz',
        receiptFooter: company.receiptFooter || ''
      },
      summary: {
        totalSales: companySales.length,
        totalProducts: companyProducts.length,
        totalCategories: companyCategories.length,
        totalCustomers: companyCustomers.length,
        totalReceivables: companyReceivables.length,
        totalExpenses: companyExpenses.length,
        totalCashRegisters: companyCashRegisters.length,
        totalStockMovements: companyStockMovements.length,
        totalSalesRevenue: totalRevenue
      },
      data: {
        sales: companySales,
        products: companyProducts,
        categories: companyCategories,
        customers: companyCustomers,
        receivables: companyReceivables,
        expenses: companyExpenses,
        cashRegisters: companyCashRegisters,
        stockMovements: companyStockMovements
      }
    };
  }

  public restoreFullBackup(backup: any): { success: boolean; message: string; stats?: any } {
    try {
      if (!backup || (!backup.data && !backup.companies)) {
        return { success: false, message: 'Ficheiro de cópia de segurança inválido ou corrompido.' };
      }

      const source = backup.data || backup;

      const importEntries = (target: Map<string, any>, items?: any) => {
        target.clear();
        if (Array.isArray(items)) {
          // Check if items is array of [key, val] or array of objects with id
          if (items.length > 0 && Array.isArray(items[0])) {
            items.forEach(([k, v]) => target.set(k, v));
          } else {
            items.forEach(item => {
              if (item && item.id) target.set(item.id, item);
            });
          }
        }
      };

      if (backup.saasSettings) {
        this.saasSettings = { ...this.saasSettings, ...backup.saasSettings };
      }

      importEntries(this.companies, source.companies);
      importEntries(this.users, source.users);
      importEntries(this.categories, source.categories);
      importEntries(this.products, source.products);
      importEntries(this.customers, source.customers);
      importEntries(this.sales, source.sales);
      importEntries(this.receivables, source.receivables);
      importEntries(this.stockMovements, source.stockMovements);
      importEntries(this.expenses, source.expenses);
      importEntries(this.cashRegisters, source.cashRegisters);
      importEntries(this.notifications, source.notifications);
      importEntries(this.subscriptions, source.subscriptions);
      importEntries(this.plans, source.plans);
      importEntries(this.adminNotificationLogs, source.adminNotificationLogs);

      // Ensure superadmin account remains intact
      if (!this.users.has('usr-bartolomeu-superadmin')) {
        this.users.set('usr-bartolomeu-superadmin', {
          id: 'usr-bartolomeu-superadmin',
          name: 'Bartolomeu Conde',
          email: 'bartolomeutrader25@gmail.com',
          phone: '+244 972 911 640',
          role: 'proprietario',
          companyId: 'comp-superadmin',
          companyName: 'VendaFácil Global SaaS',
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
          isActive: true,
          createdAt: new Date().toISOString(),
          passwordHash: 'admin123',
          isSuperAdmin: true
        });
      }

      if (this.plans.size === 0) this.seedPlans();

      this.saveToFileSync();

      return {
        success: true,
        message: 'Cópia de segurança restaurada com sucesso!',
        stats: {
          companies: this.companies.size,
          users: this.users.size,
          products: this.products.size,
          sales: this.sales.size,
          customers: this.customers.size
        }
      };
    } catch (err: any) {
      console.error('Erro ao restaurar cópia de segurança:', err);
      return { success: false, message: `Erro ao restaurar: ${err.message || 'Erro desconhecido'}` };
    }
  }

  public resetDatabase() {
    this.initZeroState();
    this.saveToFileSync();
    return { success: true, message: 'Base de dados zerada com sucesso. Pronta para novos clientes.' };
  }

  // ==========================================
  // MULTI-TENANT HELPER QUERIES
  // ==========================================

  public getCompany(companyId: string): Company | undefined {
    return this.companies.get(companyId);
  }

  public getCompanyProducts(companyId: string): Product[] {
    return Array.from(this.products.values()).filter(p => p.companyId === companyId);
  }

  public getCompanyCategories(companyId: string): Category[] {
    return Array.from(this.categories.values()).filter(c => c.companyId === companyId);
  }

  public getCompanyCustomers(companyId: string): Customer[] {
    return Array.from(this.customers.values()).filter(c => c.companyId === companyId);
  }

  public getCompanySales(companyId: string): Sale[] {
    return Array.from(this.sales.values())
      .filter(s => s.companyId === companyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getCompanyReceivables(companyId: string): Receivable[] {
    return Array.from(this.receivables.values())
      .filter(r => r.companyId === companyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getCompanyExpenses(companyId: string): Expense[] {
    return Array.from(this.expenses.values())
      .filter(e => e.companyId === companyId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public getCompanyStockMovements(companyId: string): StockMovement[] {
    return Array.from(this.stockMovements.values())
      .filter(m => m.companyId === companyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getCompanyUsers(companyId: string): User[] {
    return Array.from(this.users.values())
      .filter(u => u.companyId === companyId && !u.isSuperAdmin)
      .map(({ passwordHash, ...user }) => user);
  }

  public getCompanyNotifications(companyId: string): NotificationItem[] {
    return Array.from(this.notifications.values())
      .filter(n => n.companyId === companyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getActiveCashRegister(companyId: string): CashRegister | undefined {
    return Array.from(this.cashRegisters.values()).find(
      cr => cr.companyId === companyId && cr.status === 'aberto'
    );
  }

  public getDaysRemaining(endDateStr?: string): number {
    if (!endDateStr) return 0;
    const end = new Date(endDateStr).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((end - now) / 86400000);
    return Math.max(0, diffDays);
  }

  public checkCompanyAccess(companyId: string): {
    allowed: boolean;
    reason?: string;
    status: SubscriptionStatus;
    daysRemaining: number;
    plan: string;
    isTrial: boolean;
  } {
    const company = this.companies.get(companyId);
    if (!company) {
      return { allowed: false, reason: 'Empresa não encontrada', status: 'blocked', daysRemaining: 0, plan: 'free', isTrial: false };
    }

    if (companyId === 'comp-superadmin') {
      return { allowed: true, status: 'active', daysRemaining: 365, plan: 'premium', isTrial: false };
    }

    const sub = this.subscriptions.get(companyId);
    const now = Date.now();

    // 1. Check if manually blocked
    if (company.subscriptionStatus === 'blocked' || sub?.status === 'blocked') {
      return {
        allowed: false,
        reason: 'Conta suspensa ou bloqueada pelo administrador. Entre em contacto com o suporte.',
        status: 'blocked',
        daysRemaining: 0,
        plan: company.planId || 'free',
        isTrial: false
      };
    }

    // 2. Check active paid subscription
    if (company.subscriptionStatus === 'active' || sub?.status === 'active') {
      if (company.subscriptionEndDate && new Date(company.subscriptionEndDate).getTime() < now) {
        company.subscriptionStatus = 'expired';
        if (sub) {
          sub.status = 'expired';
          sub.isExpired = true;
        }
        return {
          allowed: false,
          reason: 'O período da sua assinatura terminou. Renove para continuar.',
          status: 'expired',
          daysRemaining: 0,
          plan: company.planId || 'free',
          isTrial: false
        };
      }
      const daysRemaining = company.subscriptionEndDate ? this.getDaysRemaining(company.subscriptionEndDate) : 30;
      return { allowed: true, status: 'active', daysRemaining, plan: company.planId || 'pro', isTrial: false };
    }

    // 3. Check trial
    if (company.subscriptionStatus === 'trial' || sub?.status === 'trial') {
      const trialEnd = company.trialEndDate ? new Date(company.trialEndDate).getTime() : now;
      if (now > trialEnd) {
        company.trialActive = false;
        company.subscriptionStatus = 'expired';
        if (sub) {
          sub.status = 'expired';
          sub.isExpired = true;
          sub.trialDaysRemaining = 0;
        }
        return {
          allowed: false,
          reason: 'O seu período gratuito de teste terminou.',
          status: 'expired',
          daysRemaining: 0,
          plan: company.selectedPlan || 'pro',
          isTrial: true
        };
      } else {
        const daysRemaining = Math.max(1, Math.ceil((trialEnd - now) / 86400000));
        return {
          allowed: true,
          status: 'trial',
          daysRemaining,
          plan: company.selectedPlan || 'pro',
          isTrial: true
        };
      }
    }

    // 4. If marked expired
    if (company.subscriptionStatus === 'expired' || sub?.status === 'expired') {
      return {
        allowed: false,
        reason: 'O seu período gratuito de teste terminou.',
        status: 'expired',
        daysRemaining: 0,
        plan: company.selectedPlan || company.planId || 'free',
        isTrial: true
      };
    }

    return { allowed: true, status: 'active', daysRemaining: 30, plan: company.planId || 'free', isTrial: false };
  }

  public activateCompanySubscription(companyId: string, planId: 'basic' | 'pro' | 'premium', durationDays: number = 30, amount?: number) {
    const company = this.companies.get(companyId);
    if (!company) return null;

    const now = new Date();
    const endDate = new Date(now.getTime() + durationDays * 86400000);
    const plan = this.plans.get(planId);
    const defaultPrice = planId === 'basic' 
      ? this.saasSettings.basicPlanPrice 
      : planId === 'premium' 
      ? (this.saasSettings.premiumPlanPrice || 30000) 
      : this.saasSettings.proPlanPrice;
    const finalAmount = amount !== undefined ? amount : defaultPrice;

    company.planId = planId;
    company.plan = planId;
    company.selectedPlan = planId;
    company.subscriptionStatus = 'active';
    company.trialActive = false;
    company.subscriptionStartDate = now.toISOString();
    company.subscriptionEndDate = endDate.toISOString();
    company.lastPaymentDate = now.toISOString();
    company.lastPaymentAmount = finalAmount;
    this.companies.set(companyId, company);

    const sub = this.subscriptions.get(companyId) || {
      companyId,
      planId,
      status: 'active',
      currentPeriodEnd: endDate.toISOString(),
      salesCountThisMonth: 0,
      productsCount: 0,
      usersCount: 1
    };
    sub.planId = planId;
    sub.status = 'active';
    sub.currentPeriodEnd = endDate.toISOString();
    sub.isExpired = false;
    this.subscriptions.set(companyId, sub);

    // Notification to tenant
    const notifId = `notif-${Date.now()}`;
    this.notifications.set(notifId, {
      id: notifId,
      companyId,
      title: `✅ Assinatura Ativada — Plano ${plan?.name || planId}`,
      message: `A sua assinatura foi ativada com sucesso! Válida até ${endDate.toLocaleDateString('pt-PT')}. Obrigado por escolher o VendaFácil.`,
      type: 'success',
      isRead: false,
      createdAt: now.toISOString()
    });

    this.saveToFile();
    return company;
  }

  public extendCompanyTrial(companyId: string, additionalDays: number = 7) {
    const company = this.companies.get(companyId);
    if (!company) return null;

    const now = Date.now();
    const currentEnd = company.trialEndDate ? new Date(company.trialEndDate).getTime() : now;
    const baseTime = Math.max(now, currentEnd);
    const newEndTime = new Date(baseTime + additionalDays * 86400000);

    company.trialActive = true;
    company.subscriptionStatus = 'trial';
    company.trialEndDate = newEndTime.toISOString();
    company.trialDays = (company.trialDays || 7) + additionalDays;
    this.companies.set(companyId, company);

    const sub = this.subscriptions.get(companyId);
    if (sub) {
      sub.status = 'trial';
      sub.trialEndDate = newEndTime.toISOString();
      sub.isExpired = false;
      sub.trialDaysRemaining = Math.ceil((newEndTime.getTime() - Date.now()) / 86400000);
    }

    const notifId = `notif-${Date.now()}`;
    this.notifications.set(notifId, {
      id: notifId,
      companyId,
      title: `🎁 Período Gratuito Prorrogado (+${additionalDays} dias)`,
      message: `O seu teste gratuito foi prorrogado por mais ${additionalDays} dias. Válido até ${newEndTime.toLocaleDateString('pt-PT')}.`,
      type: 'info',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.saveToFile();
    return company;
  }

  public toggleCompanyBlock(companyId: string, blocked: boolean) {
    const company = this.companies.get(companyId);
    if (!company) return null;

    if (blocked) {
      company.subscriptionStatus = 'blocked';
    } else {
      if (company.trialEndDate && new Date(company.trialEndDate).getTime() > Date.now()) {
        company.subscriptionStatus = 'trial';
        company.trialActive = true;
      } else if (company.subscriptionEndDate && new Date(company.subscriptionEndDate).getTime() > Date.now()) {
        company.subscriptionStatus = 'active';
      } else {
        company.subscriptionStatus = 'expired';
      }
    }
    this.companies.set(companyId, company);

    const sub = this.subscriptions.get(companyId);
    if (sub) {
      sub.status = company.subscriptionStatus as any;
    }

    this.saveToFile();
    return company;
  }

  public createAdminNotificationLog(company: Company, ownerUser: User): AdminNotificationLog {
    const trialDays = company.trialDays || 7;
    const startDate = new Date(company.trialStartDate || company.createdAt).toLocaleDateString('pt-PT');
    const endDate = new Date(company.trialEndDate || Date.now()).toLocaleDateString('pt-PT');

    const whatsappText =
`🆕 NOVA CONTA GRATUITA — VENDAFÁCIL

Uma nova empresa acabou de criar uma conta gratuita.

Empresa: ${company.name}
Responsável: ${ownerUser.name}
Ramo: ${company.businessType}
NIF: ${company.nif || 'Não informado'}
Email: ${ownerUser.email}
WhatsApp: ${ownerUser.phone || company.phone || 'Não informado'}
Data de cadastro: ${startDate}
Teste gratuito: ${trialDays} dias
Término do teste: ${endDate}

Acesse o painel administrativo para acompanhar esta conta.`;

    const log: AdminNotificationLog = {
      id: `notif-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId: company.id,
      companyName: company.name,
      ownerName: ownerUser.name,
      businessType: company.businessType,
      nif: company.nif,
      email: ownerUser.email,
      phone: ownerUser.phone || company.phone,
      createdAt: new Date().toISOString(),
      trialDays,
      trialEndDate: company.trialEndDate || new Date().toISOString(),
      whatsappText,
      emailSent: true,
      whatsappSent: false
    };

    this.adminNotificationLogs.set(log.id, log);

    // Also push to master superadmin notification bell
    this.notifications.set(`notif-sa-${Date.now()}-${Math.floor(Math.random() * 1000)}`, {
      id: `notif-sa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId: 'comp-superadmin',
      title: `🆕 Nova Empresa em Teste: ${company.name}`,
      message: `Responsável: ${ownerUser.name} | WhatsApp: ${ownerUser.phone || company.phone} | Ramo: ${company.businessType}. Teste de ${trialDays} dias até ${endDate}.`,
      type: 'info',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.saveToFile();
    return log;
  }

  public getSaasMetrics(): SaasMetrics {
    // Only count actual client companies (exclude master platform admin)
    const clientCompanies = Array.from(this.companies.values()).filter(c => c.id !== 'comp-superadmin');
    const totalCompanies = clientCompanies.length;
    let mrr = 0;
    let activeTrials = 0;
    let expiredTrials = 0;
    let activePaidSubscriptions = 0;
    let blockedCompanies = 0;
    let basicPlanCount = 0;
    let proPlanCount = 0;
    const planDistribution = { free: 0, basic: 0, pro: 0, premium: 0 };

    clientCompanies.forEach(company => {
      const access = this.checkCompanyAccess(company.id);

      if (access.status === 'trial') {
        activeTrials++;
      } else if (access.status === 'expired') {
        expiredTrials++;
      } else if (access.status === 'active') {
        activePaidSubscriptions++;
        const planPrice = company.planId === 'basic' 
          ? this.saasSettings.basicPlanPrice 
          : company.planId === 'premium'
          ? (this.saasSettings.premiumPlanPrice || 30000)
          : this.saasSettings.proPlanPrice;
        mrr += planPrice;
        if (company.planId === 'basic') basicPlanCount++;
        if (company.planId === 'pro' || company.planId === 'premium') proPlanCount++;
      } else if (access.status === 'blocked') {
        blockedCompanies++;
      }

      const pId = (company.planId || 'free') as 'free' | 'basic' | 'pro' | 'premium';
      planDistribution[pId] = (planDistribution[pId] || 0) + 1;
    });

    let totalSalesVolume = 0;
    this.sales.forEach(sale => {
      totalSalesVolume += sale.total;
    });

    return {
      mrr,
      arr: mrr * 12,
      totalCompanies,
      activeCompanies: activeTrials + activePaidSubscriptions,
      activeTrials,
      expiredTrials,
      activePaidSubscriptions,
      blockedCompanies,
      basicPlanCount,
      proPlanCount,
      churnRate: 0,
      freeToPaidConversion: totalCompanies > 0 ? Math.round((activePaidSubscriptions / totalCompanies) * 100) : 0,
      totalPlatformSales: totalSalesVolume,
      planDistribution
    };
  }
}

export const db = new Database();
