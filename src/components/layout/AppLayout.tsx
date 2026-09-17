import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wallet,
  Menu,
  X,
  CreditCard,
  Receipt,
  Users,
  Boxes,
  UserCheck,
  Building2,
  Sparkles,
  ShieldCheck,
  Bell,
  LogOut,
  Plus,
  BarChart3,
  HelpCircle,
  RefreshCw,
  Sliders,
  DollarSign,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { api } from '../../lib/api.js';
import { TrialBanner } from '../TrialBanner.js';

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute?: string;
  currentPage?: string;
  onRouteChange?: (route: string) => void;
  onNavigate?: (route: string) => void;
  onOpenOnboarding?: () => void;
  unreadNotifsCount?: number;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeRoute,
  currentPage,
  onRouteChange,
  onNavigate,
  onOpenOnboarding,
  unreadNotifsCount = 0,
}) => {
  const { user, company, logout, switchUser } = useAuth();
  const { success, error } = useToast();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [isResettingDemo, setIsResettingDemo] = useState(false);

  const currentRoute = currentPage || activeRoute || 'dashboard';

  const navigateTo = (routeId: string) => {
    if (onNavigate) {
      onNavigate(routeId);
    } else if (onRouteChange) {
      onRouteChange(routeId);
    }
  };

  const isRouteActive = (routeId: string) => {
    if (currentRoute === routeId) return true;
    const aliases: Record<string, string[]> = {
      dashboard: ['dashboard'],
      pdv: ['pdv', 'pos'],
      produtos: ['produtos', 'products'],
      stock: ['stock'],
      caixa: ['caixa', 'cash'],
      clientes: ['clientes', 'customers'],
      fiado: ['fiado'],
      despesas: ['despesas', 'expenses'],
      relatorios: ['relatorios', 'reports'],
      ia: ['ia', 'ai'],
      funcionarios: ['funcionarios', 'employees'],
      empresa: ['empresa', 'company'],
      planos: ['planos', 'subscriptions'],
      admin: ['admin', 'superadmin'],
      notificacoes: ['notificacoes', 'notifications'],
    };
    return aliases[routeId]?.includes(currentRoute) ?? false;
  };

  const mainBottomTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pdv', label: 'Vendas', icon: ShoppingCart },
    { id: 'produtos', label: 'Produtos', icon: Package },
    { id: 'caixa', label: 'Caixa', icon: Wallet },
    { id: 'mais', label: 'Mais', icon: Menu },
  ];

  const sidebarNavItems = [
    { section: 'PRINCIPAL', items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'pdv', label: 'Nova Venda (PDV)', icon: ShoppingCart, highlight: true },
      { id: 'produtos', label: 'Produtos', icon: Package },
      { id: 'stock', label: 'Stock / Inventário', icon: Boxes },
      { id: 'caixa', label: 'Caixa', icon: Wallet },
    ]},
    { section: 'GESTÃO & FINANÇAS', items: [
      { id: 'clientes', label: 'Clientes', icon: Users },
      { id: 'fiado', label: 'Fiado / A Receber', icon: CreditCard },
      { id: 'despesas', label: 'Despesas', icon: DollarSign },
      { id: 'relatorios', label: 'Relatórios & Lucro', icon: BarChart3 },
    ]},
    { section: 'INTELIGÊNCIA & CONFIGURAÇÃO', items: [
      { id: 'ia', label: 'Assistente IA 🤖', icon: Sparkles, badge: 'IA' },
      { id: 'funcionarios', label: 'Funcionários & Acessos', icon: UserCheck },
      { id: 'empresa', label: 'Minha Empresa', icon: Building2 },
      { id: 'planos', label: 'Planos & Assinatura', icon: Sliders },
      ...(user?.isSuperAdmin ? [{ id: 'admin', label: 'Painel SaaS Admin', icon: ShieldCheck, isSuper: true }] : []),
    ]}
  ];

  const handleOpenMore = () => {
    setIsMoreMenuOpen(true);
  };

  const handleTabClick = (tabId: string) => {
    if (tabId === 'mais') {
      setIsMoreMenuOpen(true);
    } else {
      navigateTo(tabId);
    }
  };

  const handleNavigateMore = (routeId: string) => {
    navigateTo(routeId);
    setIsMoreMenuOpen(false);
  };

  const handleLoadDemoUsers = async () => {
    try {
      const list = await api.getDemoUsers();
      setDemoUsers(list);
      setIsUserSwitcherOpen(true);
    } catch (e) {
      error('Erro ao carregar utilizadores');
    }
  };

  const handleResetDemoData = async () => {
    if (!confirm('Deseja restaurar os dados de demonstração da empresa Mercado Exemplo?')) return;
    try {
      setIsResettingDemo(true);
      await api.resetDemoData();
      success('Dados de demonstração restaurados!');
      window.location.reload();
    } catch (e) {
      error('Erro ao restaurar demonstração');
    } finally {
      setIsResettingDemo(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const map: Record<string, { label: string; bg: string; text: string }> = {
      proprietario: { label: 'Proprietário', bg: 'bg-amber-100', text: 'text-amber-800' },
      administrador: { label: 'Admin', bg: 'bg-blue-100', text: 'text-blue-800' },
      vendedor: { label: 'Vendedor', bg: 'bg-emerald-100', text: 'text-emerald-800' },
      caixa: { label: 'Caixa', bg: 'bg-purple-100', text: 'text-purple-800' },
      stock: { label: 'Stock', bg: 'bg-orange-100', text: 'text-orange-800' },
    };
    return map[role] || { label: role, bg: 'bg-gray-100', text: 'text-gray-800' };
  };

  const roleInfo = getRoleBadge(user?.role || 'proprietario');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans antialiased">
      {/* DESKTOP / TABLET SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-slate-200 shrink-0 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-emerald-500/20">
              V
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">VendaFácil</span>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                  SaaS
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-[140px]" title={company?.name}>
                {company?.name || 'Minha Empresa'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick New Sale button in sidebar */}
        <div className="p-4 pb-2">
          <button
            onClick={() => navigateTo('pdv')}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md shadow-emerald-600/25 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Nova Venda (PDV)</span>
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {sidebarNavItems.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase px-3">
                {sec.section}
              </span>
              <div className="space-y-0.5 mt-1.5">
                {sec.items.map((item: any) => {
                  const Icon = item.icon;
                  const isActive = isRouteActive(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-1.5 py-0.5 rounded-md">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Guided Tour Banner in Sidebar */}
        <div className="p-3 mx-3 mb-2 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-950 leading-tight truncate">Tour Guiado</p>
              <p className="text-[10px] text-emerald-700 font-medium">Passo a passo com IA</p>
            </div>
          </div>
          <button
            onClick={onOpenOnboarding}
            className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-800 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
          >
            Abrir
          </button>
        </div>

        {/* User Card & Demo Controls */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm shrink-0">
                {user?.name.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${roleInfo.bg} ${roleInfo.text}`}>
                  {roleInfo.label}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              title="Terminar Sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
            <button
              onClick={handleLoadDemoUsers}
              className="text-[11px] text-emerald-700 hover:underline font-medium"
            >
              Trocar Perfil Demo
            </button>
            <button
              onClick={handleResetDemoData}
              disabled={isResettingDemo}
              className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1"
              title="Restaurar dados demo"
            >
              <RefreshCw className={`w-3 h-3 ${isResettingDemo ? 'animate-spin' : ''}`} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        {/* MOBILE & DESKTOP TOP HEADER */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
          {/* Left: Mobile Title or Desktop Location */}
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                VF
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-sm text-slate-900 leading-tight truncate">
                  {company?.name || 'VendaFácil'}
                </h1>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  {company?.currency || 'Kz'} • {company?.businessType || 'Comércio'}
                </span>
              </div>
            </div>

            <div className="hidden md:block">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">VendaFácil SaaS</span>
              <h2 className="text-base font-bold text-slate-800 capitalize">
                {currentRoute === 'pdv' || currentRoute === 'pos'
                  ? 'Ponto de Venda (PDV)'
                  : currentRoute === 'funcionarios' || currentRoute === 'employees'
                  ? 'Funcionários & Acessos'
                  : currentRoute === 'empresa' || currentRoute === 'company'
                  ? 'Minha Empresa & Configurações'
                  : currentRoute === 'planos' || currentRoute === 'subscriptions'
                  ? 'Planos & Assinatura'
                  : currentRoute}
              </h2>
            </div>
          </div>

          {/* Right: Quick Icons & Profile */}
          <div className="flex items-center gap-2">
            {/* Guide Button */}
            <button
              onClick={onOpenOnboarding}
              className="flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/90 px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Abrir Tour Guiado Passo a Passo"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">Tour Guiado</span>
              <span className="sm:hidden">Tour</span>
            </button>

            {/* Notifications Icon */}
            <button
              onClick={() => navigateTo('notificacoes')}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              title="Notificações"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            {/* Mobile User Avatar Trigger */}
            <button
              onClick={() => setIsUserSwitcherOpen(true)}
              className="md:hidden flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                {user?.name.charAt(0) || 'U'}
              </div>
            </button>
          </div>
        </header>

        {/* Trial Countdown Banner */}
        <TrialBanner onUpgradeClick={() => navigateTo('planos')} />

        {/* Page Content */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-7 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* MOBILE FLOATING ACTION BUTTON (+ Nova Venda) */}
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onRouteChange('pdv')}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-full shadow-lg shadow-emerald-600/35 font-bold text-sm active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span>Nova Venda</span>
        </motion.button>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {mainBottomTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeRoute === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-600 font-bold'
                  : 'text-slate-400 hover:text-slate-700 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-0.5 leading-none">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* "MAIS" / MORE MENU DRAWER FOR MOBILE */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Módulos & Configurações</h3>
                  <p className="text-xs text-slate-500">{company?.name || 'VendaFácil'}</p>
                </div>
                <button
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-4">
                {/* Quick Tour Button in Mobile More Menu */}
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenOnboarding?.();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                      <Compass className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black leading-tight">Tour Guiado (Passo a Passo)</p>
                      <p className="text-[10px] text-emerald-100 font-normal">Aprenda a faturar com apoio da IA</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-white/20 text-[10px] uppercase tracking-wider font-extrabold">
                    Iniciar
                  </span>
                </button>

                {sidebarNavItems.map((sec, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                      {sec.section}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {sec.items.map((item: any) => {
                        const Icon = item.icon;
                        const isSelected = isRouteActive(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigateMore(item.id)}
                            className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                                : 'bg-slate-50/70 border-slate-100 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className={`p-2 rounded-xl ${isSelected ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 shadow-2xs'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block truncate">{item.label}</span>
                              {item.badge && (
                                <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1 rounded">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleResetDemoData();
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resetar Demo</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      logout();
                    }}
                    className="py-2.5 px-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    Sair
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* USER & DEMO PERSONA SWITCHER MODAL */}
      <AnimatePresence>
        {isUserSwitcherOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Perfis de Acesso Demo</h3>
                  <p className="text-xs text-slate-500">Alterne instantaneamente para testar permissões</p>
                </div>
                <button
                  onClick={() => setIsUserSwitcherOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-3 space-y-2 max-h-64 overflow-y-auto">
                {demoUsers.length === 0 ? (
                  <button
                    onClick={handleLoadDemoUsers}
                    className="w-full py-2 text-xs text-emerald-700 font-semibold bg-emerald-50 rounded-xl"
                  >
                    Carregar perfis disponíveis...
                  </button>
                ) : (
                  demoUsers.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setIsUserSwitcherOpen(false);
                      }}
                      className={`w-full p-3 rounded-2xl border flex items-center justify-between text-left transition-all ${
                        user?.id === u.id
                          ? 'bg-emerald-50 border-emerald-300 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-100'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{u.name}</p>
                        <p className="text-[11px] text-slate-500">{u.email}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        u.role === 'proprietario' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {u.role}
                      </span>
                    </button>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsUserSwitcherOpen(false);
                    logout();
                  }}
                  className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
                >
                  Terminar Sessão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
