import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { LandingPage } from './pages/LandingPage.js';
import { AuthPage } from './pages/AuthPage.js';
import { AppLayout } from './components/layout/AppLayout.js';

// Application Pages
import { DashboardPage } from './pages/DashboardPage.js';
import { PosSalePage } from './pages/PosSalePage.js';
import { ProductsPage } from './pages/ProductsPage.js';
import { StockPage } from './pages/StockPage.js';
import { CustomersPage } from './pages/CustomersPage.js';
import { FiadoPage } from './pages/FiadoPage.js';
import { CashRegisterPage } from './pages/CashRegisterPage.js';
import { ExpensesPage } from './pages/ExpensesPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { AiAssistantPage } from './pages/AiAssistantPage.js';
import { EmployeesPage } from './pages/EmployeesPage.js';
import { CompanyProfilePage } from './pages/CompanyProfilePage.js';
import { SubscriptionsPage } from './pages/SubscriptionsPage.js';
import { SuperAdminPage } from './pages/SuperAdminPage.js';
import { NotificationsPage } from './pages/NotificationsPage.js';
import { BlockedAccountScreen } from './components/BlockedAccountScreen.js';
import { GuidedTourModal } from './components/common/GuidedTourModal.js';

const MainRouter: React.FC = () => {
  const { isAuthenticated, isLoading, access, company, user } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Automatically open guided tour for new users on their first access
  useEffect(() => {
    if (isAuthenticated && user?.id && !user?.isSuperAdmin) {
      const tourSeen = localStorage.getItem(`vf_guided_tour_completed_${user.id}`);
      if (!tourSeen) {
        setIsTourOpen(true);
      }
    }
  }, [isAuthenticated, user?.id, user?.isSuperAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-sm text-slate-300">A carregar VendaFácil...</p>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    if (showAuth) {
      return (
        <AuthPage
          initialMode={authMode}
          onBackToLanding={() => setShowAuth(false)}
        />
      );
    }

    return (
      <LandingPage
        onStartFree={() => {
          setAuthMode('register');
          setShowAuth(true);
        }}
        onLogin={() => {
          setAuthMode('login');
          setShowAuth(true);
        }}
      />
    );
  }

  // Check if subscription has expired or is blocked (SuperAdmins bypass)
  const isBlocked = (access && !access.allowed) || 
    (company && (company.subscriptionStatus === 'expired' || company.subscriptionStatus === 'blocked'));

  if (isBlocked && !user?.isSuperAdmin) {
    return <BlockedAccountScreen />;
  }

  // Authenticated Application Shell
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} onOpenTour={() => setIsTourOpen(true)} />;
      case 'pos':
      case 'pdv':
        return <PosSalePage />;
      case 'products':
      case 'produtos':
        return <ProductsPage />;
      case 'stock':
        return <StockPage />;
      case 'customers':
      case 'clientes':
        return <CustomersPage />;
      case 'fiado':
        return <FiadoPage />;
      case 'cash':
      case 'caixa':
        return <CashRegisterPage />;
      case 'expenses':
      case 'despesas':
        return <ExpensesPage />;
      case 'reports':
      case 'relatorios':
        return <ReportsPage />;
      case 'ai':
      case 'ia':
        return <AiAssistantPage />;
      case 'employees':
      case 'funcionarios':
        return <EmployeesPage onNavigate={setCurrentPage} />;
      case 'company':
      case 'empresa':
        return <CompanyProfilePage defaultTab="general" />;
      case 'backup':
      case 'backups':
      case 'drive':
        return <CompanyProfilePage defaultTab="backup" />;
      case 'subscriptions':
      case 'planos':
        return <SubscriptionsPage />;
      case 'superadmin':
      case 'admin':
        return <SuperAdminPage />;
      case 'notifications':
      case 'notificacoes':
        return <NotificationsPage onNavigate={setCurrentPage} />;
      case 'tour':
      case 'guia':
      case 'onboarding':
        // Ensure tour opens and return Dashboard
        return <DashboardPage onNavigate={setCurrentPage} onOpenTour={() => setIsTourOpen(true)} />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} onOpenTour={() => setIsTourOpen(true)} />;
    }
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      onOpenOnboarding={() => setIsTourOpen(true)}
    >
      {renderCurrentPage()}
      <GuidedTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigate={setCurrentPage}
      />
    </AppLayout>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainRouter />
      </AuthProvider>
    </ToastProvider>
  );
}
