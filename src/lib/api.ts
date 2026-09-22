// Central API client for VendaFácil SaaS

const API_BASE = '/api';

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('vf_token');
  const userId = localStorage.getItem('vf_user_id');
  const companyId = localStorage.getItem('vf_company_id');

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (userId) headers['x-user-id'] = userId;
  if (companyId) headers['x-company-id'] = companyId;

  return headers;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Erro na requisição: ${response.status}`);
  }
  return data as T;
}

export const api = {
  // Auth
  register: (body: any) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  loginWithGoogle: (body: { email: string; name?: string; avatar?: string; googleId?: string; companyName?: string; businessType?: string }) =>
    apiRequest('/auth/google', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => apiRequest('/auth/me'),
  getDemoUsers: () => apiRequest('/auth/demo-users'),

  // Company
  getCompany: () => apiRequest('/company'),
  updateCompany: (body: any) => apiRequest('/company', { method: 'PUT', body: JSON.stringify(body) }),
  updateCompanyProfile: (body: any) => apiRequest('/company', { method: 'PUT', body: JSON.stringify(body) }),
  exportCompanyBackup: () => apiRequest('/company/backup/export'),
  getCompanyBackupSummary: () => apiRequest('/company/backup/summary'),

  // Dashboard
  getDashboard: () => apiRequest('/dashboard'),

  // Products & Categories
  getProducts: () => apiRequest('/products'),
  createProduct: (body: any) => apiRequest('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: any) => apiRequest(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id: string) => apiRequest(`/products/${id}`, { method: 'DELETE' }),
  extractProductWithAi: (data: {
    audioBase64?: string;
    audioMimeType?: string;
    audioTranscript?: string;
    imageBase64?: string;
    imageMimeType?: string;
  }) => apiRequest('/products/ai-extract', { method: 'POST', body: JSON.stringify(data) }),

  getCategories: () => apiRequest('/categories'),
  createCategory: (body: any) => apiRequest('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id: string, body: any) => apiRequest(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCategory: (id: string) => apiRequest(`/categories/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: () => apiRequest('/customers'),
  createCustomer: (body: any) => apiRequest('/customers', { method: 'POST', body: JSON.stringify(body) }),
  updateCustomer: (id: string, body: any) => apiRequest(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getCustomerHistory: (id: string) => apiRequest(`/customers/${id}/history`),

  // POS / Sales
  getSales: () => apiRequest('/sales'),
  createSale: (body: any) => apiRequest('/sales', { method: 'POST', body: JSON.stringify(body) }),

  // Fiado / Receivables
  getReceivables: () => apiRequest('/receivables'),
  payReceivable: (id: string, body: any) => apiRequest(`/receivables/${id}/pay`, { method: 'POST', body: JSON.stringify(body) }),

  // Cash Register
  getCurrentCashRegister: () => apiRequest('/cash-register/current'),
  getCashRegisterHistory: () => apiRequest('/cash-register/history'),
  openCashRegister: (body: any) => apiRequest('/cash-register/open', { method: 'POST', body: JSON.stringify(body) }),
  addCashMovement: (body: any) => apiRequest('/cash-register/movement', { method: 'POST', body: JSON.stringify(body) }),
  closeCashRegister: (body: any) => apiRequest('/cash-register/close', { method: 'POST', body: JSON.stringify(body) }),

  // Expenses
  getExpenses: () => apiRequest('/expenses'),
  createExpense: (body: any) => apiRequest('/expenses', { method: 'POST', body: JSON.stringify(body) }),
  deleteExpense: (id: string) => apiRequest(`/expenses/${id}`, { method: 'DELETE' }),

  // Stock Movements
  getStockMovements: () => apiRequest('/stock-movements'),
  createStockMovement: (body: any) => apiRequest('/stock-movements', { method: 'POST', body: JSON.stringify(body) }),

  // Employees
  getEmployees: () => apiRequest('/employees'),
  createEmployee: (body: any) => apiRequest('/employees', { method: 'POST', body: JSON.stringify(body) }),
  updateEmployee: (id: string, body: any) => apiRequest(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  toggleEmployeeStatus: (id: string, isActive: boolean) => apiRequest(`/employees/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  deleteEmployee: (id: string) => apiRequest(`/employees/${id}`, { method: 'DELETE' }),

  // Reports
  getReports: (period: string = '30days') => apiRequest(`/reports?period=${period}`),

  // Notifications
  getNotifications: () => apiRequest('/notifications'),
  markNotificationRead: (id: string) => apiRequest(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => apiRequest('/notifications/read-all', { method: 'POST' }),

  // Subscriptions
  getSubscriptions: () => apiRequest('/subscriptions'),
  upgradeSubscription: (planId: string) => apiRequest('/subscriptions/upgrade', { method: 'POST', body: JSON.stringify({ planId }) }),
  checkoutSubscriptionIntent: (data: { planId: string; paymentMethod: string; reference?: string; proofNote?: string }) =>
    apiRequest('/subscriptions/checkout-intent', { method: 'POST', body: JSON.stringify(data) }),

  // AI Assistant
  askAi: (message: string, chatHistory: any[] = []) => apiRequest('/ai/chat', { method: 'POST', body: JSON.stringify({ message, chatHistory }) }),

  // Super Admin
  getAdminMetrics: () => apiRequest('/admin/metrics'),
  getAdminCompanies: () => apiRequest('/admin/companies'),
  createAdminCompany: (data: any) => apiRequest('/admin/companies/create', { method: 'POST', body: JSON.stringify(data) }),
  exportAdminBackup: () => apiRequest('/admin/backup/export'),
  restoreAdminBackup: (backupData: any) => apiRequest('/admin/backup/restore', { method: 'POST', body: JSON.stringify(backupData) }),
  resetAdminData: () => apiRequest('/admin/reset-data', { method: 'POST' }),
  adminActivateSubscription: (companyId: string, data: { planId: string; durationDays?: number; amount?: number }) =>
    apiRequest(`/admin/subscriptions/${companyId}/activate`, { method: 'POST', body: JSON.stringify(data) }),
  adminExtendTrial: (companyId: string, additionalDays: number = 7) =>
    apiRequest(`/admin/subscriptions/${companyId}/extend-trial`, { method: 'POST', body: JSON.stringify({ additionalDays }) }),
  adminToggleBlock: (companyId: string, blocked: boolean) =>
    apiRequest(`/admin/subscriptions/${companyId}/toggle-block`, { method: 'POST', body: JSON.stringify({ blocked }) }),
  getAdminNotifications: () => apiRequest('/admin/notifications'),
  getAdminSettings: () => apiRequest('/admin/settings'),
  updateAdminSettings: (data: any) => apiRequest('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Demo Reset
  resetDemoData: () => apiRequest('/admin/reset-data', { method: 'POST' }),
};
