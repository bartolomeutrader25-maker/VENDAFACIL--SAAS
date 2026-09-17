import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { askBusinessAssistant, BusinessDataSummary } from './server/gemini.js';
import {
  Product,
  Sale,
  SaleItem,
  Customer,
  Receivable,
  ReceivablePayment,
  Category,
  StockMovement,
  Expense,
  CashRegister,
  CashMovement,
  NotificationItem,
  User,
  Company,
  PaymentMethod
} from './src/types/index.js';

// Extend Express Request
interface AuthenticatedRequest extends Request {
  user?: User;
  companyId?: string;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Automatically persist database on any successful mutation
  app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function(...args) {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
        db.saveToFile();
      }
      return originalSend.apply(res, args as any);
    };
    next();
  });

  // Auth Middleware - checks Header or Authorization bearer token
  const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const companyHeader = req.headers['x-company-id'] as string;
    const userIdHeader = req.headers['x-user-id'] as string;

    if (userIdHeader && db.users.has(userIdHeader)) {
      const u = db.users.get(userIdHeader)!;
      if (u.email.toLowerCase() === 'bartolomeutrader25@gmail.com' || u.email.toLowerCase().includes('admin@')) {
        u.isSuperAdmin = true;
      }
      req.user = u;
      req.companyId = u.companyId;
      return next();
    }

    if (authHeader && authHeader.startsWith('Bearer token-')) {
      const uid = authHeader.replace('Bearer token-', '').trim();
      if (db.users.has(uid)) {
        const u = db.users.get(uid)!;
        if (u.email.toLowerCase() === 'bartolomeutrader25@gmail.com' || u.email.toLowerCase().includes('admin@')) {
          u.isSuperAdmin = true;
        }
        req.user = u;
        req.companyId = u.companyId;
        return next();
      }
    }

    if (companyHeader && db.companies.has(companyHeader)) {
      req.companyId = companyHeader;
      const companyUser = db.getCompanyUsers(companyHeader)[0];
      if (companyUser) req.user = companyUser;
      return next();
    }

    next();
  };

  // Subscription Enforcement Middleware (blocks operations if trial is expired or account blocked)
  const requireActiveSubscription = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // SuperAdmin always has full access
    if (req.user?.isSuperAdmin) {
      return next();
    }

    if (!req.companyId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const access = db.checkCompanyAccess(req.companyId);
    if (!access.allowed) {
      return res.status(402).json({
        error: access.reason || 'O seu período gratuito de teste terminou. Escolha um plano para continuar a utilizar o VendaFácil.',
        isBlocked: true,
        subscriptionStatus: access.status,
        daysRemaining: 0
      });
    }

    next();
  };

  // ==========================================
  // AUTHENTICATION & ONBOARDING ROUTES
  // ==========================================

  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const { name, companyName, phone, email, password, businessType, nif, currency, selectedPlan } = req.body;

      if (!name || !companyName || !email || !password) {
        return res.status(400).json({ error: 'Preencha todos os campos obrigatórios (Nome, Empresa, E-mail e Palavra-passe).' });
      }

      // Check if user already exists
      const existingUser = Array.from(db.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: 'Este e-mail já está registado na plataforma.' });
      }

      const trialDuration = db.saasSettings.trialDurationDays || 7;
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + trialDuration * 86400000).toISOString();
      const chosenPlan = selectedPlan === 'basic' ? 'basic' : 'pro';

      const companyId = `comp-${Date.now()}`;
      const newCompany: Company = {
        id: companyId,
        name: companyName,
        phone: phone || '',
        whatsapp: phone || '',
        email,
        nif: nif || undefined,
        businessType: businessType || 'Comércio Geral',
        currency: currency || 'Kz',
        currencySymbol: currency || 'Kz',
        receiptFooter: `Obrigado pela preferência na ${companyName}!`,
        createdAt: now.toISOString(),
        planId: chosenPlan,
        plan: chosenPlan,
        selectedPlan: chosenPlan,
        ownerName: name,
        trialActive: true,
        trialStartDate: now.toISOString(),
        trialEndDate: trialEndDate,
        trialDays: trialDuration,
        subscriptionStatus: 'trial'
      };
      db.companies.set(companyId, newCompany);

      const userId = `usr-${Date.now()}`;
      const newUser = {
        id: userId,
        name,
        email,
        phone: phone || '',
        role: 'proprietario' as const,
        companyId,
        companyName,
        isActive: true,
        createdAt: now.toISOString(),
        passwordHash: password
      };
      db.users.set(userId, newUser);

      // Default categories
      const defaultCategories = [
        { id: `cat-${Date.now()}-1`, companyId, name: 'Geral', icon: 'ShoppingBag', color: '#10B981', itemCount: 0 },
        { id: `cat-${Date.now()}-2`, companyId, name: 'Bebidas', icon: 'Wine', color: '#3B82F6', itemCount: 0 },
        { id: `cat-${Date.now()}-3`, companyId, name: 'Alimentação', icon: 'Utensils', color: '#F59E0B', itemCount: 0 }
      ];
      defaultCategories.forEach(c => db.categories.set(c.id, c));

      // Trial Subscription setup (7 days default)
      db.subscriptions.set(companyId, {
        companyId,
        planId: chosenPlan,
        status: 'trial',
        currentPeriodEnd: trialEndDate,
        salesCountThisMonth: 0,
        productsCount: 0,
        usersCount: 1,
        trialStartDate: now.toISOString(),
        trialEndDate: trialEndDate,
        trialDaysRemaining: trialDuration,
        isExpired: false
      });

      // Automatic Admin Notification Registration
      const adminNotifLog = db.createAdminNotificationLog(newCompany, newUser);

      // Welcome notification to the new business owner
      db.notifications.set(`notif-${Date.now()}`, {
        id: `notif-${Date.now()}`,
        companyId,
        title: `🎉 Bem-vindo ao VendaFácil — Teste Grátis de ${trialDuration} Dias!`,
        message: `A sua conta foi criada com sucesso. Tem ${trialDuration} dias de teste gratuito até ${new Date(trialEndDate).toLocaleDateString('pt-PT')}. Aproveite!`,
        type: 'info',
        isRead: false,
        link: '/pdv',
        createdAt: now.toISOString()
      });

      const { passwordHash, ...safeUser } = newUser;
      res.json({
        user: safeUser,
        company: newCompany,
        token: `token-${userId}`,
        trial: {
          active: true,
          daysRemaining: trialDuration,
          startDate: now.toISOString(),
          endDate: trialEndDate,
          status: 'trial'
        },
        adminNotificationLog: adminNotifLog
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao criar conta' });
    }
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e palavra-passe são obrigatórios.' });
      }

      const user = Array.from(db.users.values()).find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password
      );

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas. Verifique o e-mail e a palavra-passe.' });
      }

      if (user.email.toLowerCase() === 'bartolomeutrader25@gmail.com' || user.email.toLowerCase().includes('admin@')) {
        user.isSuperAdmin = true;
      }

      const company = db.companies.get(user.companyId);
      const access = db.checkCompanyAccess(user.companyId);
      const { passwordHash, ...safeUser } = user;

      res.json({
        user: safeUser,
        company,
        access,
        token: `token-${user.id}`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro no login' });
    }
  });

  app.post('/api/auth/google', (req: Request, res: Response) => {
    try {
      const { email, name, avatar, companyName, businessType } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'O e-mail da conta Google é obrigatório.' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const isSuper = cleanEmail === 'bartolomeutrader25@gmail.com' || cleanEmail.includes('admin@');
      let user = Array.from(db.users.values()).find(
        u => u.email.toLowerCase() === cleanEmail
      );

      let company: Company | undefined;

      if (!user) {
        // Create new account & company for Google user
        const trialDuration = db.saasSettings.trialDurationDays || 7;
        const now = new Date();
        const trialEndDate = new Date(now.getTime() + trialDuration * 86400000).toISOString();
        const chosenPlan = 'pro';

        const displayName = name || cleanEmail.split('@')[0];
        const cName = companyName || `Loja de ${displayName}`;
        const companyId = `comp-${Date.now()}`;

        company = {
          id: companyId,
          name: cName,
          phone: '',
          whatsapp: '',
          email: cleanEmail,
          businessType: businessType || 'Comércio Geral',
          currency: 'Kz',
          currencySymbol: 'Kz',
          receiptFooter: `Obrigado pela preferência na ${cName}!`,
          createdAt: now.toISOString(),
          planId: chosenPlan,
          plan: chosenPlan,
          selectedPlan: chosenPlan,
          ownerName: displayName,
          trialActive: true,
          trialStartDate: now.toISOString(),
          trialEndDate: trialEndDate,
          trialDays: trialDuration,
          subscriptionStatus: 'trial'
        };
        db.companies.set(companyId, company);

        const userId = `usr-${Date.now()}`;
        user = {
          id: userId,
          name: displayName,
          email: cleanEmail,
          phone: '',
          role: 'proprietario' as const,
          companyId,
          companyName: cName,
          isActive: true,
          createdAt: now.toISOString(),
          avatarUrl: avatar || undefined,
          passwordHash: 'google_oauth_auth',
          isSuperAdmin: isSuper
        };
        db.users.set(userId, user);

        // Default categories
        const defaultCategories = [
          { id: `cat-${Date.now()}-1`, companyId, name: 'Geral', icon: 'ShoppingBag', color: '#10B981', itemCount: 0 },
          { id: `cat-${Date.now()}-2`, companyId, name: 'Bebidas', icon: 'Wine', color: '#3B82F6', itemCount: 0 },
          { id: `cat-${Date.now()}-3`, companyId, name: 'Alimentação', icon: 'Utensils', color: '#F59E0B', itemCount: 0 }
        ];
        defaultCategories.forEach(c => db.categories.set(c.id, c));

        // Trial Subscription
        db.subscriptions.set(companyId, {
          companyId,
          planId: chosenPlan,
          status: 'trial',
          currentPeriodEnd: trialEndDate,
          salesCountThisMonth: 0,
          productsCount: 0,
          usersCount: 1,
          trialStartDate: now.toISOString(),
          trialEndDate: trialEndDate,
          trialDaysRemaining: trialDuration,
          isExpired: false
        });

        // Welcome notification
        db.notifications.set(`notif-${Date.now()}`, {
          id: `notif-${Date.now()}`,
          companyId,
          title: `🎉 Bem-vindo ao VendaFácil via Google!`,
          message: `Conta autenticada com sucesso via Google / Gmail (${cleanEmail}). O seu teste de 7 dias gratuitos está ativo!`,
          type: 'info',
          isRead: false,
          link: '/pdv',
          createdAt: now.toISOString()
        });

        db.createAdminNotificationLog(company, user);
      } else {
        if (isSuper) {
          user.isSuperAdmin = true;
        }
        company = db.companies.get(user.companyId);
      }

      if (!company) {
        return res.status(404).json({ error: 'Empresa associada não encontrada.' });
      }

      const access = db.checkCompanyAccess(user.companyId);
      const { passwordHash, ...safeUser } = user;

      res.json({
        user: safeUser,
        company,
        access,
        token: `token-${user.id}`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro na autenticação com Google' });
    }
  });

  app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user || !req.companyId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    const company = db.companies.get(req.companyId);
    const access = db.checkCompanyAccess(req.companyId);
    res.json({
      user: req.user,
      company,
      access
    });
  });

  app.get('/api/auth/demo-users', (req: Request, res: Response) => {
    const list = Array.from(db.users.values()).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      companyName: u.companyName,
      isSuperAdmin: !!u.isSuperAdmin
    }));
    res.json(list);
  });

  // ==========================================
  // COMPANY & PROFILE SETTINGS
  // ==========================================

  app.get('/api/company', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const company = db.companies.get(req.companyId!);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json(company);
  });

  app.put('/api/company', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const company = db.companies.get(req.companyId!);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

    const updated: Company = {
      ...company,
      ...req.body,
      id: company.id // preserve id
    };
    db.companies.set(company.id, updated);
    res.json(updated);
  });

  // ==========================================
  // DASHBOARD METRICS
  // ==========================================

  app.get('/api/dashboard', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const companyId = req.companyId!;
    const company = db.companies.get(companyId);
    const sales = db.getCompanySales(companyId);
    const products = db.getCompanyProducts(companyId);
    const customers = db.getCompanyCustomers(companyId);
    const receivables = db.getCompanyReceivables(companyId);
    const expenses = db.getCompanyExpenses(companyId);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Today metrics
    const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr));
    const todayTotalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
    const todayProfit = todaySales.reduce((sum, s) => sum + s.profit, 0);
    const todayProductsSold = todaySales.reduce((sum, s) => {
      return sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0);
    }, 0);

    // Low stock count
    const lowStockProducts = products.filter(p => p.currentStock <= p.minStock && p.isActive);

    // Pending receivables (fiado)
    const totalReceivables = receivables
      .filter(r => r.status === 'pendente' || r.status === 'parcial')
      .reduce((sum, r) => sum + r.pendingAmount, 0);

    // Chart data: 7 days & 30 days
    const last7DaysData: { date: string; label: string; sales: number; profit: number; expenses: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dStr = d.toISOString().split('T')[0];
      const daySales = sales.filter(s => s.createdAt.startsWith(dStr));
      const dayExpenses = expenses.filter(e => e.date === dStr || e.createdAt.startsWith(dStr));

      const dayTotalSales = daySales.reduce((sum, s) => sum + s.total, 0);
      const dayTotalProfit = daySales.reduce((sum, s) => sum + s.profit, 0);
      const dayTotalExpenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

      const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      last7DaysData.push({
        date: dStr,
        label: i === 0 ? 'Hoje' : i === 1 ? 'Ontem' : dayLabels[d.getDay()],
        sales: dayTotalSales,
        profit: dayTotalProfit,
        expenses: dayTotalExpenses
      });
    }

    // Top selling ranking
    const productStats = new Map<string, { product: Product; quantity: number; revenue: number; profit: number }>();
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const curr = productStats.get(prod.id) || { product: prod, quantity: 0, revenue: 0, profit: 0 };
          curr.quantity += item.quantity;
          curr.revenue += item.subtotal;
          curr.profit += (item.unitPrice - item.costPrice) * item.quantity;
          productStats.set(prod.id, curr);
        }
      });
    });

    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.json({
      company,
      today: {
        totalSales: todayTotalSales,
        estimatedProfit: todayProfit,
        productsSold: todayProductsSold,
        salesCount: todaySales.length
      },
      customersCount: customers.length,
      lowStockCount: lowStockProducts.length,
      totalReceivables,
      chart7Days: last7DaysData,
      topProducts,
      recentSales: sales.slice(0, 5),
      cashRegister: db.getActiveCashRegister(companyId)
    });
  });

  // ==========================================
  // PRODUCTS & CATEGORIES
  // ==========================================

  app.get('/api/products', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const products = db.getCompanyProducts(req.companyId!);
    res.json(products);
  });

  app.post('/api/products', authMiddleware, requireActiveSubscription, (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.companyId!;
      const {
        name,
        code,
        barcode,
        categoryId,
        description,
        imageUrl,
        costPrice,
        salePrice,
        sellingPrice,
        currentStock,
        stockQuantity,
        minStock,
        unit
      } = req.body;

      const effectiveCostPrice = Number(costPrice) || 0;
      const effectiveSalePrice = Number(sellingPrice !== undefined ? sellingPrice : salePrice) || 0;
      const effectiveStock = Number(stockQuantity !== undefined ? stockQuantity : currentStock) || 0;

      if (!name || effectiveCostPrice === undefined || effectiveSalePrice === undefined) {
        return res.status(400).json({ error: 'Nome, preço de compra e preço de venda são obrigatórios.' });
      }

      const category = categoryId ? db.categories.get(categoryId) : null;
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        companyId,
        name,
        code: code || `COD-${Date.now().toString().slice(-4)}`,
        barcode: barcode || '',
        categoryId: categoryId || 'cat-default',
        categoryName: category ? category.name : (req.body.categoryName || 'Geral'),
        description: description || '',
        imageUrl: imageUrl || '',
        costPrice: effectiveCostPrice,
        salePrice: effectiveSalePrice,
        sellingPrice: effectiveSalePrice,
        currentStock: effectiveStock,
        stockQuantity: effectiveStock,
        minStock: Number(minStock) || 5,
        unit: unit || 'un',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      db.products.set(newProduct.id, newProduct);

      // Record initial stock movement if quantity > 0
      if (newProduct.currentStock > 0) {
        const movement: StockMovement = {
          id: `sm-${Date.now()}`,
          companyId,
          productId: newProduct.id,
          productName: newProduct.name,
          quantity: newProduct.currentStock,
          type: 'ENTRADA',
          userId: req.user?.id || 'sys',
          userName: req.user?.name || 'Sistema',
          reason: 'Stock inicial no cadastro do produto',
          costPrice: newProduct.costPrice,
          createdAt: new Date().toISOString()
        };
        db.stockMovements.set(movement.id, movement);
      }

      res.status(201).json(newProduct);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/products/:id', authMiddleware, requireActiveSubscription, (req: AuthenticatedRequest, res: Response) => {
    const product = db.products.get(req.params.id);
    if (!product || product.companyId !== req.companyId) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const catId = req.body.categoryId || product.categoryId;
    const category = catId ? db.categories.get(catId) : null;

    const salePrice = req.body.sellingPrice !== undefined 
      ? Number(req.body.sellingPrice) 
      : (req.body.salePrice !== undefined ? Number(req.body.salePrice) : product.salePrice);
      
    const stock = req.body.stockQuantity !== undefined 
      ? Number(req.body.stockQuantity) 
      : (req.body.currentStock !== undefined ? Number(req.body.currentStock) : product.currentStock);

    const updated: Product = {
      ...product,
      ...req.body,
      categoryId: catId,
      categoryName: category ? category.name : (req.body.categoryName || product.categoryName || 'Geral'),
      imageUrl: req.body.imageUrl !== undefined ? req.body.imageUrl : (product.imageUrl || ''),
      salePrice,
      sellingPrice: salePrice,
      currentStock: stock,
      stockQuantity: stock,
      id: product.id,
      companyId: product.companyId
    };
    db.products.set(product.id, updated);
    res.json(updated);
  });

  app.delete('/api/products/:id', authMiddleware, requireActiveSubscription, (req: AuthenticatedRequest, res: Response) => {
    const product = db.products.get(req.params.id);
    if (!product || product.companyId !== req.companyId) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    db.products.delete(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/categories', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const categories = db.getCompanyCategories(req.companyId!);
    const products = db.getCompanyProducts(req.companyId!);
    
    // Enrich with accurate itemCount
    const enriched = categories.map(cat => {
      const count = products.filter(p => p.categoryId === cat.id).length;
      return {
        ...cat,
        itemCount: count
      };
    });
    
    res.json(enriched);
  });

  app.post('/api/categories', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { name, icon, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      companyId: req.companyId!,
      name,
      icon: icon || 'Tag',
      color: color || '#10B981',
      itemCount: 0
    };
    db.categories.set(newCat.id, newCat);
    res.status(201).json(newCat);
  });

  app.put('/api/categories/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const cat = db.categories.get(req.params.id);
    if (!cat || cat.companyId !== req.companyId) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    const updated: Category = {
      ...cat,
      name: req.body.name || cat.name,
      icon: req.body.icon || cat.icon,
      color: req.body.color || cat.color
    };
    db.categories.set(cat.id, updated);

    // Update categoryName in corresponding products
    const prods = db.getCompanyProducts(req.companyId!);
    prods.forEach(p => {
      if (p.categoryId === cat.id) {
        p.categoryName = updated.name;
        db.products.set(p.id, p);
      }
    });

    res.json(updated);
  });

  app.delete('/api/categories/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const cat = db.categories.get(req.params.id);
    if (!cat || cat.companyId !== req.companyId) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    db.categories.delete(req.params.id);
    res.json({ success: true });
  });

  // ==========================================
  // CUSTOMERS
  // ==========================================

  app.get('/api/customers', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const customers = db.getCompanyCustomers(req.companyId!);
    res.json(customers);
  });

  app.post('/api/customers', authMiddleware, requireActiveSubscription, (req: AuthenticatedRequest, res: Response) => {
    const { name, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      companyId: req.companyId!,
      name,
      phone: phone || '',
      email: email || '',
      address: address || '',
      notes: notes || '',
      totalPurchases: 0,
      purchaseCount: 0,
      currentDebt: 0,
      createdAt: new Date().toISOString()
    };
    db.customers.set(newCustomer.id, newCustomer);
    res.status(201).json(newCustomer);
  });

  app.put('/api/customers/:id', authMiddleware, requireActiveSubscription, (req: AuthenticatedRequest, res: Response) => {
    const customer = db.customers.get(req.params.id);
    if (!customer || customer.companyId !== req.companyId) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    const updated = { ...customer, ...req.body, id: customer.id, companyId: customer.companyId };
    db.customers.set(customer.id, updated);
    res.json(updated);
  });

  app.get('/api/customers/:id/history', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const customer = db.customers.get(req.params.id);
    if (!customer || customer.companyId !== req.companyId) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    const sales = db.getCompanySales(req.companyId!).filter(s => s.customerId === req.params.id);
    const receivables = db.getCompanyReceivables(req.companyId!).filter(r => r.customerId === req.params.id);
    res.json({ customer, sales, receivables });
  });

  // ==========================================
  // POS & SALES (< 10 seconds rapid flow)
  // ==========================================

  app.get('/api/sales', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const sales = db.getCompanySales(req.companyId!);
    res.json(sales);
  });

  app.post('/api/sales', authMiddleware, requireActiveSubscription, (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.companyId!;
      const {
        items,
        customerId,
        paymentMethod,
        discount = 0,
        paidAmount = 0,
        dueDate,
        notes
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'A venda precisa de pelo menos 1 produto.' });
      }

      // Calculate totals and check stock
      let subtotal = 0;
      let totalCost = 0;
      const saleItems: SaleItem[] = [];

      for (const it of items) {
        const product = db.products.get(it.productId);
        if (!product || product.companyId !== companyId) {
          return res.status(400).json({ error: `Produto ${it.productName || it.productId} não encontrado.` });
        }

        const qty = Number(it.quantity) || 1;
        const itemSubtotal = product.salePrice * qty;
        const itemCost = product.costPrice * qty;

        subtotal += itemSubtotal;
        totalCost += itemCost;

        saleItems.push({
          id: `si-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitPrice: product.salePrice,
          costPrice: product.costPrice,
          subtotal: itemSubtotal,
          unit: product.unit
        });

        // Decrement product stock
        product.currentStock = Math.max(0, product.currentStock - qty);
        db.products.set(product.id, product);

        // Record stock movement for sale
        const sm: StockMovement = {
          id: `sm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          companyId,
          productId: product.id,
          productName: product.name,
          quantity: qty,
          type: 'VENDA',
          userId: req.user?.id || 'usr',
          userName: req.user?.name || 'Operador',
          reason: `Venda no PDV`,
          costPrice: product.costPrice,
          createdAt: new Date().toISOString()
        };
        db.stockMovements.set(sm.id, sm);

        // Check if stock became low, create notification
        if (product.currentStock <= product.minStock) {
          const notifId = `notif-stock-${product.id}`;
          db.notifications.set(notifId, {
            id: notifId,
            companyId,
            title: '⚠️ Stock baixo',
            message: `${product.name} — Restam apenas ${product.currentStock} ${product.unit} (Mínimo: ${product.minStock}).`,
            type: product.currentStock === 0 ? 'stock_esgotado' : 'stock_baixo',
            isRead: false,
            link: '/stock',
            createdAt: new Date().toISOString()
          });
        }
      }

      const total = Math.max(0, subtotal - Number(discount || 0));
      const profit = total - totalCost;
      const finalPaidAmount = paymentMethod === 'credito_fiado' ? Number(paidAmount || 0) : total;
      const changeAmount = finalPaidAmount > total ? finalPaidAmount - total : 0;
      const paymentStatus = paymentMethod === 'credito_fiado' 
        ? (finalPaidAmount >= total ? 'pago' : finalPaidAmount > 0 ? 'parcial' : 'pendente')
        : 'pago';

      const saleNumber = `VF-${1030 + db.sales.size + 1}`;
      const customer = customerId ? db.customers.get(customerId) : undefined;

      const newSale: Sale = {
        id: `sale-${Date.now()}`,
        saleNumber,
        companyId,
        userId: req.user?.id || 'usr-default',
        userName: req.user?.name || 'Operador',
        customerId: customer?.id,
        customerName: customer ? customer.name : 'Cliente Balcão',
        items: saleItems,
        subtotal,
        discount: Number(discount) || 0,
        total,
        profit,
        paymentMethod: paymentMethod as PaymentMethod,
        paymentStatus,
        paidAmount: finalPaidAmount,
        changeAmount,
        notes: notes || '',
        createdAt: new Date().toISOString()
      };
      db.sales.set(newSale.id, newSale);

      // Update customer stats if customer assigned
      if (customer) {
        customer.totalPurchases += total;
        customer.purchaseCount += 1;
        customer.lastPurchaseDate = newSale.createdAt;

        if (paymentMethod === 'credito_fiado' && finalPaidAmount < total) {
          const pending = total - finalPaidAmount;
          customer.currentDebt += pending;

          // Create Receivable (Fiado) record
          const receivable: Receivable = {
            id: `rec-${Date.now()}`,
            companyId,
            saleId: newSale.id,
            saleNumber: newSale.saleNumber,
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            totalAmount: total,
            paidAmount: finalPaidAmount,
            pendingAmount: pending,
            dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            status: finalPaidAmount > 0 ? 'parcial' : 'pendente',
            createdAt: newSale.createdAt,
            payments: finalPaidAmount > 0 ? [
              {
                id: `rp-${Date.now()}`,
                receivableId: `rec-${Date.now()}`,
                amount: finalPaidAmount,
                paymentMethod: 'dinheiro',
                receivedByUserId: req.user?.id || 'usr',
                receivedByUserName: req.user?.name || 'Operador',
                createdAt: newSale.createdAt,
                notes: 'Entrada inicial'
              }
            ] : []
          };
          db.receivables.set(receivable.id, receivable);
        }
        db.customers.set(customer.id, customer);
      }

      // Update active Cash Register if open and received money
      const activeCashRegister = db.getActiveCashRegister(companyId);
      if (activeCashRegister && finalPaidAmount > 0) {
        activeCashRegister.expectedAmount += finalPaidAmount;
        activeCashRegister.movements.push({
          id: `cm-${Date.now()}`,
          cashRegisterId: activeCashRegister.id,
          type: 'venda',
          amount: finalPaidAmount,
          description: `Venda #${newSale.saleNumber} (${newSale.customerName})`,
          userId: req.user?.id || 'usr',
          userName: req.user?.name || 'Operador',
          paymentMethod: paymentMethod as PaymentMethod,
          referenceId: newSale.id,
          createdAt: newSale.createdAt
        });
        db.cashRegisters.set(activeCashRegister.id, activeCashRegister);
      }

      res.status(201).json(newSale);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // RECEIVABLES / FIADO
  // ==========================================

  app.get('/api/receivables', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const receivables = db.getCompanyReceivables(req.companyId!);
    res.json(receivables);
  });

  app.post('/api/receivables/:id/pay', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    try {
      const receivable = db.receivables.get(req.params.id);
      if (!receivable || receivable.companyId !== req.companyId) {
        return res.status(404).json({ error: 'Conta a receber não encontrada.' });
      }

      const { amount, paymentMethod = 'dinheiro', notes } = req.body;
      const payAmount = Number(amount);

      if (!payAmount || payAmount <= 0) {
        return res.status(400).json({ error: 'Valor de pagamento inválido.' });
      }

      if (payAmount > receivable.pendingAmount) {
        return res.status(400).json({ error: 'O valor informado é maior do que o saldo devedor.' });
      }

      receivable.paidAmount += payAmount;
      receivable.pendingAmount -= payAmount;
      receivable.status = receivable.pendingAmount <= 0 ? 'pago' : 'parcial';

      const paymentRecord: ReceivablePayment = {
        id: `rp-${Date.now()}`,
        receivableId: receivable.id,
        amount: payAmount,
        paymentMethod: paymentMethod as PaymentMethod,
        receivedByUserId: req.user?.id || 'usr',
        receivedByUserName: req.user?.name || 'Operador',
        createdAt: new Date().toISOString(),
        notes: notes || 'Pagamento de fiado'
      };

      receivable.payments.push(paymentRecord);
      db.receivables.set(receivable.id, receivable);

      // Update customer current debt
      const customer = db.customers.get(receivable.customerId);
      if (customer) {
        customer.currentDebt = Math.max(0, customer.currentDebt - payAmount);
        db.customers.set(customer.id, customer);
      }

      // Update Cash Register
      const activeCashRegister = db.getActiveCashRegister(req.companyId!);
      if (activeCashRegister) {
        activeCashRegister.expectedAmount += payAmount;
        activeCashRegister.movements.push({
          id: `cm-${Date.now()}`,
          cashRegisterId: activeCashRegister.id,
          type: 'pagamento_fiado',
          amount: payAmount,
          description: `Recebimento Fiado #${receivable.saleNumber} (${receivable.customerName})`,
          userId: req.user?.id || 'usr',
          userName: req.user?.name || 'Operador',
          paymentMethod: paymentMethod as PaymentMethod,
          referenceId: receivable.id,
          createdAt: new Date().toISOString()
        });
        db.cashRegisters.set(activeCashRegister.id, activeCashRegister);
      }

      res.json(receivable);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // CASH REGISTER (CAIXA)
  // ==========================================

  app.get('/api/cash-register/current', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const active = db.getActiveCashRegister(req.companyId!);
    res.json(active || null);
  });

  app.get('/api/cash-register/history', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const all = Array.from(db.cashRegisters.values())
      .filter(cr => cr.companyId === req.companyId!)
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
    res.json(all);
  });

  app.post('/api/cash-register/open', authMiddleware, requireActiveSubscription, (req: AuthenticatedRequest, res: Response) => {
    const companyId = req.companyId!;
    const active = db.getActiveCashRegister(companyId);
    if (active) {
      return res.status(400).json({ error: 'Já existe um caixa aberto para esta empresa.' });
    }

    const { openingAmount = 0, notes } = req.body;
    const initialAmount = Number(openingAmount) || 0;

    const newRegister: CashRegister = {
      id: `cr-${Date.now()}`,
      companyId,
      openedByUserId: req.user?.id || 'usr',
      openedByUserName: req.user?.name || 'Operador',
      openingAmount: initialAmount,
      expectedAmount: initialAmount,
      status: 'aberto',
      openedAt: new Date().toISOString(),
      notes: notes || '',
      movements: [
        {
          id: `cm-${Date.now()}`,
          cashRegisterId: `cr-${Date.now()}`,
          type: 'entrada',
          amount: initialAmount,
          description: 'Abertura de caixa com fundo de troco inicial',
          userId: req.user?.id || 'usr',
          userName: req.user?.name || 'Operador',
          paymentMethod: 'dinheiro',
          createdAt: new Date().toISOString()
        }
      ]
    };

    db.cashRegisters.set(newRegister.id, newRegister);
    res.status(201).json(newRegister);
  });

  app.post('/api/cash-register/movement', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const active = db.getActiveCashRegister(req.companyId!);
    if (!active) {
      return res.status(400).json({ error: 'Nenhum caixa aberto no momento.' });
    }

    const { type, amount, description, paymentMethod = 'dinheiro' } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0 || !description) {
      return res.status(400).json({ error: 'Valor e descrição são obrigatórios.' });
    }

    if (type === 'entrada') {
      active.expectedAmount += numAmount;
    } else if (type === 'saida') {
      active.expectedAmount -= numAmount;
    }

    const movement: CashMovement = {
      id: `cm-${Date.now()}`,
      cashRegisterId: active.id,
      type: type || 'entrada',
      amount: numAmount,
      description,
      userId: req.user?.id || 'usr',
      userName: req.user?.name || 'Operador',
      paymentMethod: paymentMethod as PaymentMethod,
      createdAt: new Date().toISOString()
    };

    active.movements.push(movement);
    db.cashRegisters.set(active.id, active);
    res.json(active);
  });

  app.post('/api/cash-register/close', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const active = db.getActiveCashRegister(req.companyId!);
    if (!active) {
      return res.status(400).json({ error: 'Nenhum caixa aberto para fechar.' });
    }

    const { physicalAmount = 0, notes } = req.body;
    const physical = Number(physicalAmount);
    const difference = physical - active.expectedAmount;

    active.status = 'fechado';
    active.closedAt = new Date().toISOString();
    active.closedByUserId = req.user?.id || 'usr';
    active.closedByUserName = req.user?.name || 'Operador';
    active.closingAmount = physical;
    active.differenceAmount = difference;
    if (notes) active.notes = `${active.notes ? active.notes + ' | ' : ''}Fechamento: ${notes}`;

    db.cashRegisters.set(active.id, active);
    res.json(active);
  });

  // ==========================================
  // EXPENSES
  // ==========================================

  app.get('/api/expenses', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const expenses = db.getCompanyExpenses(req.companyId!);
    res.json(expenses);
  });

  app.post('/api/expenses', authMiddleware, requireActiveSubscription, (req: AuthenticatedRequest, res: Response) => {
    const { description, category, amount, paymentMethod = 'dinheiro', notes, date } = req.body;
    if (!description || !amount || !category) {
      return res.status(400).json({ error: 'Descrição, categoria e valor são obrigatórios.' });
    }

    const numAmount = Number(amount);
    const categoryLabels: Record<string, string> = {
      compra_mercadoria: 'Compra de Mercadoria',
      transporte: 'Transporte',
      energia: 'Energia Elétrica',
      agua: 'Água',
      internet: 'Internet & Telecom',
      salarios: 'Salários & Comissões',
      renda: 'Renda / Aluguer',
      marketing: 'Marketing & Publicidade',
      outros: 'Outros'
    };

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      companyId: req.companyId!,
      description,
      category,
      categoryLabel: categoryLabels[category] || category,
      amount: numAmount,
      paymentMethod: paymentMethod as PaymentMethod,
      userId: req.user?.id || 'usr',
      userName: req.user?.name || 'Operador',
      notes: notes || '',
      date: date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    db.expenses.set(newExpense.id, newExpense);

    // If paid from open cash register in cash
    const activeCashRegister = db.getActiveCashRegister(req.companyId!);
    if (activeCashRegister && paymentMethod === 'dinheiro') {
      activeCashRegister.expectedAmount -= numAmount;
      activeCashRegister.movements.push({
        id: `cm-${Date.now()}`,
        cashRegisterId: activeCashRegister.id,
        type: 'despesa',
        amount: numAmount,
        description: `Despesa: ${newExpense.description}`,
        userId: req.user?.id || 'usr',
        userName: req.user?.name || 'Operador',
        paymentMethod: 'dinheiro',
        referenceId: newExpense.id,
        createdAt: newExpense.createdAt
      });
      db.cashRegisters.set(activeCashRegister.id, activeCashRegister);
    }

    res.status(201).json(newExpense);
  });

  app.delete('/api/expenses/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const expense = db.expenses.get(req.params.id);
    if (!expense || expense.companyId !== req.companyId) {
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }
    db.expenses.delete(req.params.id);
    res.json({ success: true });
  });

  // ==========================================
  // STOCK MOVEMENTS
  // ==========================================

  app.get('/api/stock-movements', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const movements = db.getCompanyStockMovements(req.companyId!);
    res.json(movements);
  });

  app.post('/api/stock-movements', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { productId, quantity, type, reason, costPrice } = req.body;
    const product = db.products.get(productId);

    if (!product || product.companyId !== req.companyId) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0 || !type) {
      return res.status(400).json({ error: 'Quantidade e tipo de movimento são obrigatórios.' });
    }

    if (type === 'ENTRADA' || type === 'DEVOLUCAO') {
      product.currentStock += qty;
      if (costPrice) product.costPrice = Number(costPrice);
    } else if (type === 'SAIDA' || type === 'VENDA') {
      product.currentStock = Math.max(0, product.currentStock - qty);
    } else if (type === 'AJUSTE') {
      product.currentStock = qty; // For adjustment, quantity represents the new counted stock
    }

    db.products.set(product.id, product);

    const movement: StockMovement = {
      id: `sm-${Date.now()}`,
      companyId: req.companyId!,
      productId: product.id,
      productName: product.name,
      quantity: qty,
      type,
      userId: req.user?.id || 'usr',
      userName: req.user?.name || 'Operador',
      reason: reason || `Movimento de stock (${type})`,
      costPrice: costPrice ? Number(costPrice) : product.costPrice,
      createdAt: new Date().toISOString()
    };

    db.stockMovements.set(movement.id, movement);
    res.status(201).json({ movement, product });
  });

  // ==========================================
  // EMPLOYEES & USERS (WITH PLAN RESTRICTIONS)
  // ==========================================

  const PLAN_USER_LIMITS: Record<string, { maxUsers: number; name: string }> = {
    free: { maxUsers: 1, name: 'Gratuito' },
    basic: { maxUsers: 3, name: 'Básico' },
    pro: { maxUsers: 10, name: 'Profissional' },
    premium: { maxUsers: 100, name: 'Empresarial' },
  };

  app.get('/api/employees', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const users = db.getCompanyUsers(req.companyId!);
    res.json(users);
  });

  app.post('/api/employees', authMiddleware, requireActiveSubscription, (req: AuthenticatedRequest, res: Response) => {
    const { name, email, phone, role, password } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Nome, e-mail e função são obrigatórios.' });
    }

    const company = db.companies.get(req.companyId!);
    const planId = (company?.planId || company?.plan || 'pro') as string;
    const planConfig = PLAN_USER_LIMITS[planId] || PLAN_USER_LIMITS.pro;
    const currentUsers = db.getCompanyUsers(req.companyId!);

    if (currentUsers.length >= planConfig.maxUsers) {
      return res.status(403).json({
        error: `Limite de utilizadores atingido! O plano ${planConfig.name} permite no máximo ${planConfig.maxUsers} funcionário(s). Faça upgrade da sua assinatura para cadastrar mais colaboradores.`,
        planId,
        limit: planConfig.maxUsers,
        currentCount: currentUsers.length,
      });
    }

    // Check duplicate email
    const existing = Array.from(db.users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.companyId === req.companyId
    );
    if (existing) {
      return res.status(400).json({ error: 'Já existe um funcionário registado com este e-mail na empresa.' });
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      name,
      email,
      phone: phone || '',
      role,
      companyId: req.companyId!,
      companyName: company?.name || 'Minha Empresa',
      isActive: true,
      createdAt: new Date().toISOString(),
      passwordHash: password || '123456'
    };

    db.users.set(newUser.id, newUser);
    const { passwordHash, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  });

  app.put('/api/employees/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const user = db.users.get(req.params.id);
    if (!user || user.companyId !== req.companyId) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    const { name, email, phone, role, isActive, password } = req.body;

    const updated = {
      ...user,
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(role ? { role } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      ...(password ? { passwordHash: password } : {}),
      id: user.id,
      companyId: user.companyId
    };

    db.users.set(user.id, updated);
    const { passwordHash, ...safeUser } = updated;
    res.json(safeUser);
  });

  app.patch('/api/employees/:id/status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const user = db.users.get(req.params.id);
    if (!user || user.companyId !== req.companyId) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    const newStatus = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !user.isActive;

    // Prevent deactivating own user if it's the current user
    if (!newStatus && req.user?.id === user.id) {
      return res.status(400).json({ error: 'Não pode desativar a sua própria conta em sessão ativa.' });
    }

    user.isActive = newStatus;
    db.users.set(user.id, user);
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  });

  app.delete('/api/employees/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const user = db.users.get(req.params.id);
    if (!user || user.companyId !== req.companyId) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    if (req.user?.id === user.id) {
      return res.status(400).json({ error: 'Não pode apagar a sua própria conta enquanto estiver com a sessão iniciada.' });
    }

    const owners = db.getCompanyUsers(req.companyId!).filter(u => u.role === 'proprietario' && u.id !== user.id);
    if (user.role === 'proprietario' && owners.length === 0) {
      return res.status(400).json({ error: 'A empresa precisa de manter pelo menos um Proprietário registado.' });
    }

    db.users.delete(req.params.id);
    res.json({ success: true, message: 'Funcionário removido com sucesso.' });
  });

  // ==========================================
  // REPORTS
  // ==========================================

  app.get('/api/reports', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const companyId = req.companyId!;
    const period = (req.query.period as string) || '30days';
    const sales = db.getCompanySales(companyId);
    const expenses = db.getCompanyExpenses(companyId);
    const products = db.getCompanyProducts(companyId);
    const customers = db.getCompanyCustomers(companyId);

    const now = new Date();
    let startDate = new Date(now.getTime() - 30 * 86400000);

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'yesterday') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    } else if (period === '7days') {
      startDate = new Date(now.getTime() - 7 * 86400000);
    } else if (period === '30days') {
      startDate = new Date(now.getTime() - 30 * 86400000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const filteredSales = sales.filter(s => new Date(s.createdAt) >= startDate);
    const filteredExpenses = expenses.filter(e => new Date(e.date || e.createdAt) >= startDate);

    const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalProfit = filteredSales.reduce((sum, s) => sum + s.profit, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalProfit - totalExpenses;

    // Payment methods breakdown
    const paymentMethodsSummary: Record<string, { count: number; total: number }> = {};
    filteredSales.forEach(s => {
      const method = s.paymentMethod;
      if (!paymentMethodsSummary[method]) paymentMethodsSummary[method] = { count: 0, total: 0 };
      paymentMethodsSummary[method].count += 1;
      paymentMethodsSummary[method].total += s.total;
    });

    // Top Selling Products
    const productStats = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();
    filteredSales.forEach(s => {
      s.items.forEach(it => {
        const curr = productStats.get(it.productId) || { name: it.productName, quantity: 0, revenue: 0, profit: 0 };
        curr.quantity += it.quantity;
        curr.revenue += it.subtotal;
        curr.profit += (it.unitPrice - it.costPrice) * it.quantity;
        productStats.set(it.productId, curr);
      });
    });

    const topSelling = Array.from(productStats.values()).sort((a, b) => b.revenue - a.revenue);
    const lowSelling = products
      .map(p => {
        const stat = productStats.get(p.id);
        return {
          name: p.name,
          currentStock: p.currentStock,
          soldQuantity: stat ? stat.quantity : 0,
          revenue: stat ? stat.revenue : 0
        };
      })
      .sort((a, b) => a.soldQuantity - b.soldQuantity);

    res.json({
      period,
      summary: {
        totalSales,
        totalProfit,
        totalExpenses,
        netProfit,
        salesCount: filteredSales.length,
        averageTicket: filteredSales.length > 0 ? Math.round(totalSales / filteredSales.length) : 0
      },
      paymentMethods: paymentMethodsSummary,
      topSelling,
      lowSelling,
      salesList: filteredSales
    });
  });

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  app.get('/api/notifications', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const notifs = db.getCompanyNotifications(req.companyId!);
    res.json(notifs);
  });

  app.post('/api/notifications/:id/read', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const notif = db.notifications.get(req.params.id);
    if (notif && notif.companyId === req.companyId) {
      notif.isRead = true;
      db.notifications.set(notif.id, notif);
    }
    res.json({ success: true });
  });

  app.post('/api/notifications/read-all', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const notifs = db.getCompanyNotifications(req.companyId!);
    notifs.forEach(n => {
      n.isRead = true;
      db.notifications.set(n.id, n);
    });
    res.json({ success: true });
  });

  // ==========================================
  // SUBSCRIPTIONS & PLANS
  // ==========================================

  app.get('/api/subscriptions', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const companyId = req.companyId!;
    const company = db.companies.get(companyId);
    const sub = db.subscriptions.get(companyId);
    const plans = Array.from(db.plans.values());
    const currentPlan = db.plans.get(sub?.planId || company?.planId || 'pro');
    const access = db.checkCompanyAccess(companyId);

    const products = db.getCompanyProducts(companyId);
    const sales = db.getCompanySales(companyId);
    const users = db.getCompanyUsers(companyId);

    res.json({
      subscription: sub,
      currentPlan,
      plans,
      company,
      access,
      settings: db.saasSettings,
      usage: {
        productsCount: products.length,
        productsLimit: currentPlan?.productsLimit,
        salesCount: sales.length,
        salesLimit: currentPlan?.salesLimit,
        usersCount: users.length,
        usersLimit: currentPlan?.usersLimit
      }
    });
  });

  app.post('/api/subscriptions/upgrade', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { planId } = req.body;
    const companyId = req.companyId!;
    const plan = db.plans.get(planId);

    if (!plan) return res.status(400).json({ error: 'Plano inválido.' });

    const company = db.companies.get(companyId);
    if (company) {
      company.planId = planId;
      company.selectedPlan = planId;
      db.companies.set(companyId, company);
    }

    const sub = db.subscriptions.get(companyId) || {
      companyId,
      planId,
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      salesCountThisMonth: 0,
      productsCount: 0,
      usersCount: 1
    };
    sub.planId = planId;
    db.subscriptions.set(companyId, sub);

    res.json({ success: true, plan, subscription: sub });
  });

  app.post('/api/subscriptions/checkout-intent', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { planId, paymentMethod, reference, proofNote } = req.body;
    const companyId = req.companyId!;
    const company = db.companies.get(companyId);

    if (company) {
      company.selectedPlan = planId;
      db.companies.set(companyId, company);
    }

    const plan = db.plans.get(planId);
    const notifId = `notif-pay-${Date.now()}`;
    db.notifications.set(notifId, {
      id: notifId,
      companyId: 'comp-demo-01',
      title: `💳 Pedido de Assinatura: ${company?.name || 'Cliente'}`,
      message: `O cliente escolheu o Plano ${plan?.name || planId}. Método: ${paymentMethod || 'Transferência/Express'}. Ref: ${reference || 'Direto'} ${proofNote ? `| Obs: ${proofNote}` : ''}`,
      type: 'warning',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Comprovativo/intenção registada com sucesso! Aguarde a validação do administrador.'
    });
  });

  // ==========================================
  // AI BUSINESS ASSISTANT (GEMINI 3.7 FLASH)
  // ==========================================

  app.post('/api/ai/chat', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.companyId!;
      const company = db.companies.get(companyId);
      const { message, chatHistory } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'A mensagem da pergunta é obrigatória.' });
      }

      const sales = db.getCompanySales(companyId);
      const expenses = db.getCompanyExpenses(companyId);
      const products = db.getCompanyProducts(companyId);
      const customers = db.getCompanyCustomers(companyId);
      const receivables = db.getCompanyReceivables(companyId);

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const salesToday = sales.filter(s => s.createdAt.startsWith(todayStr));
      const salesMonth = sales.filter(s => new Date(s.createdAt) >= startOfMonth);
      const salesLastMonth = sales.filter(s => {
        const d = new Date(s.createdAt);
        return d >= startOfLastMonth && d <= endOfLastMonth;
      });

      const expensesMonth = expenses.filter(e => new Date(e.date || e.createdAt) >= startOfMonth);

      // Best selling products
      const pStats = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();
      salesMonth.forEach(s => {
        s.items.forEach(it => {
          const curr = pStats.get(it.productId) || { name: it.productName, quantity: 0, revenue: 0, profit: 0 };
          curr.quantity += it.quantity;
          curr.revenue += it.subtotal;
          curr.profit += (it.unitPrice - it.costPrice) * it.quantity;
          pStats.set(it.productId, curr);
        });
      });

      const bestSelling = Array.from(pStats.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      const lowStock = products
        .filter(p => p.currentStock <= p.minStock)
        .map(p => ({ name: p.name, currentStock: p.currentStock, minStock: p.minStock, unit: p.unit }));

      const pendingRecs = receivables
        .filter(r => r.status === 'pendente' || r.status === 'parcial')
        .map(r => ({ customerName: r.customerName, pendingAmount: r.pendingAmount, dueDate: r.dueDate }));

      const totalReceivables = pendingRecs.reduce((sum, r) => sum + r.pendingAmount, 0);

      const topCustomers = customers
        .sort((a, b) => b.totalPurchases - a.totalPurchases)
        .slice(0, 5)
        .map(c => ({ name: c.name, totalSpent: c.totalPurchases, purchasesCount: c.purchaseCount }));

      const expensesByCategory: Record<string, number> = {};
      expensesMonth.forEach(e => {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
      });

      const businessSummary: BusinessDataSummary = {
        companyName: company?.name || 'Minha Empresa',
        currency: company?.currency || 'Kz',
        totalSalesToday: salesToday.reduce((sum, s) => sum + s.total, 0),
        totalSalesMonth: salesMonth.reduce((sum, s) => sum + s.total, 0),
        totalSalesLastMonth: salesLastMonth.reduce((sum, s) => sum + s.total, 0),
        totalProfitMonth: salesMonth.reduce((sum, s) => sum + s.profit, 0),
        totalExpensesMonth: expensesMonth.reduce((sum, e) => sum + e.amount, 0),
        bestSellingProducts: bestSelling,
        lowSellingProducts: products.slice(-3).map(p => ({ name: p.name, stock: p.currentStock, soldQty: 0 })),
        lowStockProducts: lowStock,
        pendingReceivables: pendingRecs,
        totalReceivables,
        recentSalesCount: salesMonth.length,
        topCustomers,
        expensesByCategory
      };

      const aiResponseText = await askBusinessAssistant(message, businessSummary, chatHistory);
      res.json({ response: aiResponseText });
    } catch (error: any) {
      console.error('AI chat error:', error);
      res.status(500).json({ error: error.message || 'Erro ao processar com IA' });
    }
  });

  // ==========================================
  // SAAS SUPER ADMIN
  // ==========================================

  app.get('/api/admin/metrics', (req: Request, res: Response) => {
    const metrics = db.getSaasMetrics();
    res.json(metrics);
  });

  app.get('/api/admin/companies', (req: Request, res: Response) => {
    const list = Array.from(db.companies.values())
      .filter(c => c.id !== 'comp-superadmin')
      .map(c => {
        const sub = db.subscriptions.get(c.id);
        const sales = db.getCompanySales(c.id);
        const products = db.getCompanyProducts(c.id);
        const users = db.getCompanyUsers(c.id);
        const access = db.checkCompanyAccess(c.id);
        const ownerUser = users.find(u => u.role === 'proprietario') || users[0];

        return {
          ...c,
          subscription: sub,
          access,
          ownerName: c.ownerName || ownerUser?.name || 'Responsável',
          ownerEmail: ownerUser?.email || c.email,
          ownerPhone: ownerUser?.phone || c.phone,
          salesCount: sales.length,
          totalRevenue: sales.reduce((sum, s) => sum + s.total, 0),
          productsCount: products.length,
          usersCount: users.length,
          daysRemaining: access.daysRemaining
        };
      });
    res.json(list);
  });

  app.post('/api/admin/companies/create', (req: Request, res: Response) => {
    try {
      const { name, ownerName, email, phone, businessType, nif, planId = 'pro', status = 'trial', trialDays = 7 } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: 'Nome da empresa e e-mail são obrigatórios.' });
      }
      const companyId = `comp-${Date.now()}`;
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + Number(trialDays) * 86400000).toISOString();
      const newCompany: Company = {
        id: companyId,
        name,
        ownerName: ownerName || name,
        email,
        phone: phone || '',
        whatsapp: phone || '',
        businessType: businessType || 'Comércio Geral',
        nif: nif || undefined,
        currency: 'Kz',
        currencySymbol: 'Kz',
        receiptFooter: `Obrigado pela preferência na ${name}!`,
        createdAt: now.toISOString(),
        planId,
        plan: planId,
        selectedPlan: planId,
        trialActive: status === 'trial',
        trialStartDate: now.toISOString(),
        trialEndDate: trialEndDate,
        trialDays: Number(trialDays),
        subscriptionStatus: status as any
      };
      db.companies.set(companyId, newCompany);

      const userId = `usr-${Date.now()}`;
      const newUser = {
        id: userId,
        name: ownerName || name,
        email,
        phone: phone || '',
        role: 'proprietario' as const,
        companyId,
        companyName: name,
        isActive: true,
        createdAt: now.toISOString(),
        passwordHash: '123456'
      };
      db.users.set(userId, newUser);

      // Categories
      const defaultCategories = [
        { id: `cat-${Date.now()}-1`, companyId, name: 'Geral', icon: 'ShoppingBag', color: '#10B981', itemCount: 0 },
        { id: `cat-${Date.now()}-2`, companyId, name: 'Bebidas', icon: 'Wine', color: '#3B82F6', itemCount: 0 },
        { id: `cat-${Date.now()}-3`, companyId, name: 'Alimentação', icon: 'Utensils', color: '#F59E0B', itemCount: 0 }
      ];
      defaultCategories.forEach(c => db.categories.set(c.id, c));

      // Subscription
      db.subscriptions.set(companyId, {
        companyId,
        planId,
        status: status as any,
        currentPeriodEnd: trialEndDate,
        salesCountThisMonth: 0,
        productsCount: 0,
        usersCount: 1,
        trialStartDate: now.toISOString(),
        trialEndDate: trialEndDate,
        trialDaysRemaining: Number(trialDays),
        isExpired: false
      });

      db.saveToFile();
      res.json({ success: true, company: newCompany, user: newUser, message: 'Nova empresa cliente cadastrada com sucesso!' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao criar empresa' });
    }
  });

  app.get('/api/admin/backup/export', (req: Request, res: Response) => {
    try {
      const backup = db.exportFullBackup();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="vendafacil_backup_${Date.now()}.json"`);
      res.json(backup);
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao gerar cópia de segurança dos dados.' });
    }
  });

  app.post('/api/admin/backup/restore', (req: Request, res: Response) => {
    try {
      const result = db.restoreFullBackup(req.body);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao restaurar cópia de segurança.' });
    }
  });

  app.post('/api/admin/reset-data', (req: Request, res: Response) => {
    try {
      const result = db.resetDatabase();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao zerar base de dados.' });
    }
  });

  app.post('/api/admin/subscriptions/:companyId/activate', (req: Request, res: Response) => {
    const { planId = 'basic', durationDays = 30, amount } = req.body;
    const updated = db.activateCompanySubscription(
      req.params.companyId,
      planId,
      Number(durationDays),
      amount !== undefined ? Number(amount) : undefined
    );
    if (!updated) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json({ success: true, company: updated, message: `Assinatura ativada com sucesso para ${updated.name}` });
  });

  app.post('/api/admin/subscriptions/:companyId/extend-trial', (req: Request, res: Response) => {
    const { additionalDays = 7 } = req.body;
    const updated = db.extendCompanyTrial(req.params.companyId, Number(additionalDays));
    if (!updated) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json({ success: true, company: updated, message: `Teste gratuito prorrogado por mais ${additionalDays} dias` });
  });

  app.post('/api/admin/subscriptions/:companyId/toggle-block', (req: Request, res: Response) => {
    const { blocked } = req.body;
    const updated = db.toggleCompanyBlock(req.params.companyId, Boolean(blocked));
    if (!updated) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json({ success: true, company: updated, message: blocked ? 'Empresa bloqueada com sucesso' : 'Empresa desbloqueada com sucesso' });
  });

  app.get('/api/admin/notifications', (req: Request, res: Response) => {
    const logs = Array.from(db.adminNotificationLogs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(logs);
  });

  app.get('/api/admin/settings', (req: Request, res: Response) => {
    res.json(db.saasSettings);
  });

  app.put('/api/admin/settings', (req: Request, res: Response) => {
    const { trialDurationDays, basicPlanPrice, proPlanPrice, adminEmail, adminPhone, bankIban, accountHolder, multicaixaPhone, planPrices } = req.body;
    if (trialDurationDays !== undefined) db.saasSettings.trialDurationDays = Number(trialDurationDays);
    
    const finalBasic = basicPlanPrice !== undefined ? Number(basicPlanPrice) : planPrices?.basic !== undefined ? Number(planPrices.basic) : undefined;
    const finalPro = proPlanPrice !== undefined ? Number(proPlanPrice) : planPrices?.pro !== undefined ? Number(planPrices.pro) : undefined;

    if (finalBasic !== undefined) {
      db.saasSettings.basicPlanPrice = finalBasic;
      const bp = db.plans.get('basic');
      if (bp) bp.price = finalBasic;
    }
    if (finalPro !== undefined) {
      db.saasSettings.proPlanPrice = finalPro;
      const pp = db.plans.get('pro');
      if (pp) pp.price = finalPro;
    }
    const finalPremium = req.body.premiumPlanPrice !== undefined ? Number(req.body.premiumPlanPrice) : planPrices?.premium !== undefined ? Number(planPrices.premium) : undefined;
    if (finalPremium !== undefined) {
      db.saasSettings.premiumPlanPrice = finalPremium;
      const prem = db.plans.get('premium');
      if (prem) prem.price = finalPremium;
    }
    if (planPrices) {
      db.saasSettings.planPrices = {
        basic: db.saasSettings.basicPlanPrice,
        pro: db.saasSettings.proPlanPrice,
        premium: db.saasSettings.premiumPlanPrice || 30000
      };
    }
    if (adminEmail) db.saasSettings.adminEmail = adminEmail;
    if (adminPhone) db.saasSettings.adminPhone = adminPhone;
    if (bankIban) db.saasSettings.bankIban = bankIban;
    if (accountHolder) db.saasSettings.accountHolder = accountHolder;
    if (multicaixaPhone) db.saasSettings.multicaixaPhone = multicaixaPhone;
    res.json({ success: true, settings: db.saasSettings, message: 'Configurações do SaaS salvas com sucesso' });
  });

  // ==========================================
  // DEMO RESET / SEED
  // ==========================================

  app.post('/api/demo/reset', (req: Request, res: Response) => {
    db.seedDemoCompany();
    res.json({ success: true, message: 'Dados de demonstração do Mercado Exemplo Lda restaurados com sucesso.' });
  });

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'VendaFácil SaaS Backend', version: '1.0.0' });
  });

  // Vite Middleware Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 VendaFácil Server running on http://localhost:${PORT}`);
  });
}

startServer();
