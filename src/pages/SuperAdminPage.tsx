import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Calendar,
  Sparkles,
  PhoneCall,
  Mail,
  Copy,
  Plus,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Sliders,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Eye,
  ShoppingBag,
  Package,
  Database,
  Download,
  Upload,
  Trash2,
  HardDrive,
  FileJson,
  Check
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const SuperAdminPage: React.FC = () => {
  const { user, switchCompany } = useAuth();
  const { error, success } = useToast();

  const [activeTab, setActiveTab] = useState<'companies' | 'notifications' | 'backup' | 'settings'>('companies');
  const [companies, setCompanies] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    trialDurationDays: 7,
    planPrices: { basic: 5000, pro: 10000, premium: 30000 },
    adminNotificationEmail: 'bartolomeutrader25@gmail.com',
    adminNotificationPhone: '+244972911640',
    multicaixaPhone: '972 911 640 / 947 050 586',
    bankIban: '0040 0000 1472 2403 1016 5',
    accountHolder: 'BARTOLOMEU SUNDA CONDE MAVUNGO'
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'trial' | 'active' | 'expired' | 'blocked'>('all');

  // Modal / Action State
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [actionModal, setActionModal] = useState<'activate' | 'extend' | 'details' | null>(null);
  const [activatePlan, setActivatePlan] = useState<'basic' | 'pro' | 'premium'>('pro');
  const [activateDuration, setActivateDuration] = useState<number>(30);
  const [extendDays, setExtendDays] = useState<number>(7);
  const [isProcessing, setIsProcessing] = useState(false);

  // Backup & Restore State
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Create Company State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompData, setNewCompData] = useState({
    name: '',
    ownerName: '',
    email: '',
    phone: '',
    businessType: 'Comércio Geral',
    nif: '',
    planId: 'pro',
    status: 'trial',
    trialDays: 7
  });
  const [creatingCompany, setCreatingCompany] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [compList, met, notifs, sett] = await Promise.all([
        api.getAdminCompanies(),
        api.getAdminMetrics().catch(() => null),
        api.getAdminNotifications().catch(() => []),
        api.getAdminSettings().catch(() => null)
      ]);
      setCompanies(compList || []);
      if (met) setMetrics(met);
      if (notifs) setNotifications(notifs);
      if (sett) setSettings(sett);
    } catch (e: any) {
      error('Erro ao carregar dados do Super Admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      setIsProcessing(true);
      const price = activatePlan === 'basic'
        ? (settings.planPrices?.basic || 5000)
        : activatePlan === 'premium'
        ? (settings.planPrices?.premium || 30000)
        : (settings.planPrices?.pro || 10000);
      await api.adminActivateSubscription(selectedCompany.id, {
        planId: activatePlan,
        durationDays: activateDuration,
        amount: price
      });
      success(`Assinatura da empresa ${selectedCompany.name} ativada com sucesso!`);
      setActionModal(null);
      setSelectedCompany(null);
      loadAll();
    } catch (err: any) {
      error(err.message || 'Erro ao ativar assinatura');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtendTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      setIsProcessing(true);
      await api.adminExtendTrial(selectedCompany.id, extendDays);
      success(`Teste da empresa ${selectedCompany.name} prorrogado em +${extendDays} dias!`);
      setActionModal(null);
      setSelectedCompany(null);
      loadAll();
    } catch (err: any) {
      error(err.message || 'Erro ao prorrogar teste');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleBlock = async (comp: any) => {
    const isCurrentlyBlocked = comp.subscriptionStatus === 'blocked';
    const confirmMsg = isCurrentlyBlocked
      ? `Deseja desbloquear a empresa ${comp.name}?`
      : `Tem a certeza que deseja suspender/bloquear a empresa ${comp.name}? O acesso será impedido até que seja desbloqueada.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.adminToggleBlock(comp.id, !isCurrentlyBlocked);
      success(isCurrentlyBlocked ? 'Empresa desbloqueada com sucesso!' : 'Empresa suspensa com sucesso.');
      loadAll();
    } catch (err: any) {
      error('Erro ao alterar estado da empresa');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      await api.updateAdminSettings(settings);
      success('Configurações do SaaS guardadas com sucesso!');
    } catch (err: any) {
      error('Erro ao guardar configurações');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const data = await api.exportAdminBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vendafacil_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      success('Cópia de segurança exportada com sucesso!');
    } catch (e: any) {
      error('Erro ao exportar cópia de segurança');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupFile) {
      error('Por favor, selecione um ficheiro de backup (.json)');
      return;
    }
    if (!window.confirm('Atenção: Restaurar esta cópia de segurança irá atualizar os dados da plataforma com os dados do ficheiro. Deseja continuar?')) {
      return;
    }
    try {
      setIsRestoring(true);
      const text = await backupFile.text();
      const parsed = JSON.parse(text);
      const res = await api.restoreAdminBackup(parsed);
      success(res.message || 'Cópia de segurança restaurada com sucesso!');
      setBackupFile(null);
      await loadAll();
    } catch (err: any) {
      error(`Erro ao restaurar: ${err.message || 'Ficheiro inválido ou corrompido'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('⚠️ ATENÇÃO: Tem a certeza que deseja zerar a base de dados?\n\nIsto limpará todos os produtos, vendas, clientes e empresas de teste para deixar o SaaS 100% pronto para novos clientes reais. A sua conta de Super Admin será preservada.')) {
      return;
    }
    try {
      setIsProcessing(true);
      const res = await api.resetAdminData();
      success(res.message || 'Base de dados zerada com sucesso!');
      await loadAll();
    } catch (err: any) {
      error('Erro ao zerar dados');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompData.name || !newCompData.email) {
      error('Por favor, preencha o nome da empresa e o e-mail');
      return;
    }
    try {
      setCreatingCompany(true);
      const res = await api.createAdminCompany(newCompData);
      success(res.message || 'Empresa cliente registada com sucesso!');
      setShowCreateModal(false);
      setNewCompData({
        name: '',
        ownerName: '',
        email: '',
        phone: '',
        businessType: 'Comércio Geral',
        nif: '',
        planId: 'pro',
        status: 'trial',
        trialDays: 7
      });
      await loadAll();
    } catch (err: any) {
      error(err.message || 'Erro ao criar empresa');
    } finally {
      setCreatingCompany(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `${(val || 0).toLocaleString('pt-AO')} Kz`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    success('Copiado para a área de transferência!');
  };

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.responsibleName && c.responsibleName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return c.subscriptionStatus === statusFilter;
  });

  return (
    <div id="superadmin-page" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-950 text-white p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Super Admin • Gestão Global SaaS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            Painel Central do VendaFácil
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Gestão de empresas, controlo de períodos de teste, ativação de assinaturas e métricas de receita
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar Dados</span>
          </button>
        </div>
      </div>

      {/* SaaS Live Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">MRR (Receita Mensal)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {formatCurrency(metrics?.mrr || 0)}
          </p>
          <span className="text-[10px] text-slate-400">
            {metrics?.activePaidTenants || 0} assinaturas pagas ativas
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Testes Ativos (Trial)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
            {metrics?.trialTenants || 0}
          </p>
          <span className="text-[10px] text-slate-400">Período gratuito em curso</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Testes Expirados</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
            {metrics?.expiredTenants || 0}
          </p>
          <span className="text-[10px] text-slate-400">Bloqueados aguardando pagamento</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total de Empresas</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {metrics?.totalTenants || companies.length}
          </p>
          <span className="text-[10px] text-emerald-600 font-bold">
            Taxa Conversão: {metrics?.conversionRate || 0}%
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'companies'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Empresas & Assinaturas ({companies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 relative ${
            activeTab === 'notifications'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Novos Cadastros & Leads ({notifications.length})</span>
          {notifications.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'backup'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Nuvem & Cópia de Segurança</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Configurações do SaaS</span>
        </button>
      </div>

      {/* TAB 1: EMPRESAS & ASSINATURAS */}
      {activeTab === 'companies' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            {/* Status Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'trial', label: 'Em Teste (Trial)' },
                { id: 'active', label: 'Pagas (Ativas)' },
                { id: 'expired', label: 'Expiradas' },
                { id: 'blocked', label: 'Bloqueadas' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    statusFilter === f.id
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Actions: Search & Create */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar empresa, dono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Empresa</span>
              </button>
            </div>
          </div>

          {/* Clean Zeroed State Banner */}
          {filteredCompanies.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
                <Building2 className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Painel 100% Zerado e Pronto para Novos Clientes
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Todos os registos fictícios foram removidos. A plataforma está completamente nova, com a base de dados persistente ativa na nuvem. Quando os seus primeiros clientes e leads se registarem na página inicial ou criarem lojas, os seus dados reais aparecerão aqui em tempo real.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Empresa / Loja</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('backup')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  <span>Cópia de Segurança & Nuvem</span>
                </button>
              </div>
            </div>
          ) : (
            /* Companies Table */
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 sm:px-5">Empresa & Responsável</th>
                  <th className="p-3.5 sm:px-4">Estado da Assinatura</th>
                  <th className="p-3.5 sm:px-4">Plano</th>
                  <th className="p-3.5 sm:px-4">Dados de Controlo</th>
                  <th className="p-3.5 sm:px-4">Período / Validade</th>
                  <th className="p-3.5 sm:px-4">Contacto WhatsApp</th>
                  <th className="p-3.5 sm:px-4 text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCompanies.map((comp) => {
                  const status = comp.subscriptionStatus || (comp.trialActive ? 'trial' : 'active');
                  const daysLeft = comp.trialEndDate
                    ? Math.ceil((new Date(comp.trialEndDate).getTime() - Date.now()) / 86400000)
                    : null;

                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Empresa */}
                      <td className="p-3.5 sm:px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0">
                            {comp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{comp.name}</p>
                            <p className="text-[11px] text-slate-500">
                              Resp: {comp.responsibleName || 'Responsável'} • {comp.businessType || 'Comércio'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="p-3.5 sm:px-4">
                        {status === 'active' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pago (Ativo)
                          </span>
                        )}
                        {status === 'trial' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Teste ({daysLeft !== null && daysLeft > 0 ? `${daysLeft}d rest.` : 'termina hoje'})
                          </span>
                        )}
                        {status === 'expired' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5" /> Teste Expirado (Bloqueado)
                          </span>
                        )}
                        {status === 'blocked' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-200 px-2.5 py-1 rounded-full">
                            <Ban className="w-3.5 h-3.5" /> Suspenso
                          </span>
                        )}
                      </td>

                      {/* Plano */}
                      <td className="p-3.5 sm:px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          comp.planId === 'pro' || comp.plan === 'pro'
                            ? 'bg-purple-100 text-purple-800'
                            : comp.planId === 'premium'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {comp.planId || comp.plan || 'pro'}
                        </span>
                      </td>

                      {/* Dados de Controlo */}
                      <td className="p-3.5 sm:px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{comp.salesCount || 0} vendas</span>
                            <span className="text-emerald-700 font-extrabold text-[11px]">
                              ({(comp.totalRevenue || 0).toLocaleString('pt-AO')} Kz)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span>📦 {comp.productsCount || 0} produtos</span>
                            <span>•</span>
                            <span>👥 {comp.usersCount || 1} utilizadores</span>
                          </div>
                        </div>
                      </td>

                      {/* Validade */}
                      <td className="p-3.5 sm:px-4 text-slate-600">
                        {status === 'trial' && comp.trialEndDate && (
                          <div>
                            <p className="font-semibold text-slate-800">
                              Até {new Date(comp.trialEndDate).toLocaleDateString('pt-PT')}
                            </p>
                            <p className="text-[10px] text-slate-400">7 dias de teste</p>
                          </div>
                        )}
                        {status === 'active' && comp.subscriptionEndDate && (
                          <div>
                            <p className="font-semibold text-emerald-700">
                              Vence {new Date(comp.subscriptionEndDate).toLocaleDateString('pt-PT')}
                            </p>
                            <p className="text-[10px] text-slate-400">Assinatura mensal</p>
                          </div>
                        )}
                        {status === 'expired' && (
                          <span className="text-rose-600 font-semibold">Expirou</span>
                        )}
                        {status === 'blocked' && (
                          <span className="text-slate-500">Acesso restrito</span>
                        )}
                      </td>

                      {/* WhatsApp / Contacto */}
                      <td className="p-3.5 sm:px-4">
                        {comp.phone ? (
                          <a
                            href={`https://wa.me/${comp.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Olá ${comp.responsibleName || comp.name}! Sou o administrador do VendaFácil SaaS. Como está a correr a experiência com a sua conta?`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold border border-emerald-200 transition"
                          >
                            <PhoneCall className="w-3 h-3 text-emerald-600" />
                            <span>{comp.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">Sem telefone</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 sm:px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspecionar / Ver Dados Completos */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCompany(comp);
                              setActionModal('details');
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                            title="Inspecionar todos os dados de controlo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Ativar Plano */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCompany(comp);
                              setActionModal('activate');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs transition"
                            title="Ativar assinatura paga"
                          >
                            Ativar Plano
                          </button>

                          {/* Prorrogar Teste */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCompany(comp);
                              setActionModal('extend');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-semibold text-[11px] transition"
                            title="Prorrogar período gratuito"
                          >
                            +Dias
                          </button>

                          {/* Bloquear / Desbloquear */}
                          <button
                            type="button"
                            onClick={() => handleToggleBlock(comp)}
                            className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                              comp.subscriptionStatus === 'blocked'
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600'
                            }`}
                            title={comp.subscriptionStatus === 'blocked' ? 'Desbloquear' : 'Suspender/Bloquear'}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>

                          {/* Aceder como Tenant */}
                          <button
                            type="button"
                            onClick={() => switchCompany(comp.id)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                            title="Aceder à conta desta empresa"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}

      {/* TAB 2: NOTIFICAÇÕES & LEADS */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
            <h3 className="font-bold text-base text-slate-900 mb-1">
              Registo Automático de Novas Empresas (Notificações ao Admin)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Sempre que uma nova empresa cria uma conta e inicia o teste de 7 dias, um alerta completo é gravado aqui com os dados de contacto imediatos para acompanhamento comercial.
            </p>

            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Nenhuma notificação de novo cadastro registada até ao momento.
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => {
                  const p = n.payload || {};
                  const phoneClean = (p.phone || '').replace(/[^0-9]/g, '');
                  const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(
                    `Olá ${p.responsibleName || 'amigo(a)'}! 👋\n\nSou o administrador da plataforma *VendaFácil*. Vi que acabou de registar a empresa *${p.companyName}* para o teste gratuito de 7 dias.\n\nPrecisa de alguma ajuda para cadastrar produtos ou testar as primeiras vendas no telemóvel? Estou aqui para ajudar!`
                  )}`;

                  return (
                    <div
                      key={n.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-emerald-300 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{p.companyName || 'Empresa'}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            Novo Teste Grátis
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(n.timestamp).toLocaleString('pt-PT')}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600">
                          <strong>Responsável:</strong> {p.responsibleName} &bull;{' '}
                          <strong>Ramo:</strong> {p.businessType} &bull;{' '}
                          <strong>Email:</strong> {p.email} &bull;{' '}
                          <strong>WhatsApp:</strong> {p.phone}
                        </p>

                        <p className="text-[11px] text-amber-700">
                          ⏳ Teste de {p.trialDays || 7} dias válido até {new Date(p.trialEndDate).toLocaleDateString('pt-PT')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {p.phone && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Contactar no WhatsApp</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => copyToClipboard(`Nome: ${p.companyName}\nResp: ${p.responsibleName}\nTel: ${p.phone}\nEmail: ${p.email}`)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                          title="Copiar dados"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2.5: CÓPIA DE SEGURANÇA E NUVEM (BACKUP & RESTORE) */}
      {activeTab === 'backup' && (
        <div className="space-y-5">
          {/* Status da Nuvem */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="font-bold text-base text-slate-900">
                      Base de Dados Segura & Nuvem Ativa
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Sincronização Contínua
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                    Todos os novos cadastros, lojas, produtos, clientes e vendas reais são guardados de forma persistente e segura em disco e na nuvem. Se o servidor for reiniciado, nenhum dado real de cliente será perdido.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'A exportar...' : 'Exportar Cópia de Segurança'}</span>
                </button>
              </div>
            </div>

            {/* Quick Live Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-slate-400 text-[11px] block">Empresas Clientes</span>
                <span className="font-black text-slate-900 text-base">{companies.length}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-slate-400 text-[11px] block">Testes em Curso</span>
                <span className="font-black text-amber-600 text-base">{metrics?.activeTrials || 0}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-slate-400 text-[11px] block">Assinaturas Pagas</span>
                <span className="font-black text-emerald-600 text-base">{metrics?.activePaidSubscriptions || 0}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-slate-400 text-[11px] block">Volume de Transações</span>
                <span className="font-black text-slate-900 text-base">{formatCurrency(metrics?.totalPlatformSales || 0)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Card 1: Exportar Cópia de Segurança */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Exportar Todos os Dados (.JSON)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Cópia de segurança completa e instantânea
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-2 mb-4">
                  Gera e transfere um ficheiro JSON estruturado contendo todas as empresas clientes, utilizadores, catálogos de produtos, histórico de vendas, recibos, fiados e definições de planos.
                </p>
                <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 text-[11px] text-blue-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                    <span>Backup 100% compatível para restauro</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pode ser guardado no seu computador, pen drive ou Google Drive</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'A gerar ficheiro...' : 'Descarregar Ficheiro de Backup (.json)'}</span>
                </button>
              </div>
            </div>

            {/* Card 2: Restaurar Dados a Partir de Backup */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Restaurar Cópia de Segurança
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Recuperação rápida de dados em caso de perda
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-2 mb-4">
                  Selecione um ficheiro de cópia de segurança (`.json`) gerado anteriormente para restaurar todas as contas e produtos de forma íntegra.
                </p>

                <form onSubmit={handleRestoreBackup} className="space-y-3">
                  <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-4 text-center transition cursor-pointer bg-slate-50/50">
                    <input
                      type="file"
                      id="backup-file-input"
                      accept=".json"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setBackupFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="backup-file-input" className="cursor-pointer block">
                      <FileJson className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                      <span className="text-xs font-bold text-slate-700 block">
                        {backupFile ? backupFile.name : 'Clique para selecionar o ficheiro de backup (.json)'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {backupFile ? `${(backupFile.size / 1024).toFixed(1)} KB` : 'Ficheiro gerado pelo VendaFácil SaaS'}
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={!backupFile || isRestoring}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isRestoring ? 'A restaurar dados...' : 'Restaurar Dados da Cópia'}</span>
                  </button>
                </form>
              </div>

              <p className="text-[10px] text-slate-400 text-center mt-3">
                Os dados atuais serão sincronizados com as entidades presentes no ficheiro selecionado.
              </p>
            </div>
          </div>

          {/* Card 3: Limpeza de Dados / Manter Zerado */}
          <div className="bg-rose-50/40 p-5 rounded-3xl border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <h4 className="font-bold text-sm text-rose-950">
                  Zerar e Limpar Todos os Dados da Plataforma
                </h4>
              </div>
              <p className="text-xs text-rose-800/80 mt-1 max-w-2xl leading-relaxed">
                Esta ação apaga quaisquer empresas, produtos ou vendas criadas durante fases de teste, deixando a aplicação 100% limpa e pronta para novos clientes. A sua conta de Super Administrador não será removida.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetData}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Zerar Base de Dados Agora</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURAÇÕES DO SAAS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-6">
          <div>
            <h3 className="font-bold text-base text-slate-900 mb-1">
              Configurações Globais de Teste e Preços do SaaS
            </h3>
            <p className="text-xs text-slate-500">
              Personalize a duração do período de teste gratuito para novos utilizadores e os valores mensais de cada plano.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Trial Duration */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Duração do Teste Gratuito Padrão (Dias)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.trialDurationDays || 7}
                onChange={e => setSettings({ ...settings, trialDurationDays: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Todas as novas contas criadas receberão este período de acesso livre inicial.
              </p>
            </div>

            {/* Admin Notification Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                WhatsApp do Administrador (para Notificações)
              </label>
              <input
                type="text"
                value={settings.adminNotificationPhone || ''}
                onChange={e => setSettings({ ...settings, adminNotificationPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Número que receberá as mensagens diretas de ativação e comprovativos.
              </p>
            </div>

            {/* Multicaixa Express Phones */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Números Multicaixa Express para Pagamento
              </label>
              <input
                type="text"
                value={settings.multicaixaPhone || ''}
                onChange={e => setSettings({ ...settings, multicaixaPhone: e.target.value })}
                placeholder="972 911 640 / 947 050 586"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Números apresentados aos clientes para transferências via Express.
              </p>
            </div>

            {/* Price Basic */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Preço Mensal - Plano Básico (Kz)
              </label>
              <input
                type="number"
                step="500"
                value={settings.planPrices?.basic ?? 5000}
                onChange={e => setSettings({
                  ...settings,
                  planPrices: { ...settings.planPrices, basic: Number(e.target.value) }
                })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Price Pro */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Preço Mensal - Plano Profissional (Kz)
              </label>
              <input
                type="number"
                step="500"
                value={settings.planPrices?.pro ?? 10000}
                onChange={e => setSettings({
                  ...settings,
                  planPrices: { ...settings.planPrices, pro: Number(e.target.value) }
                })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Price Premium */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Preço Mensal - Plano Empresarial / Redes (Kz)
              </label>
              <input
                type="number"
                step="1000"
                value={settings.planPrices?.premium ?? 30000}
                onChange={e => setSettings({
                  ...settings,
                  planPrices: { ...settings.planPrices, premium: Number(e.target.value) }
                })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* IBAN para Pagamentos */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                IBAN Oficial para Pagamentos / Transferências
              </label>
              <input
                type="text"
                value={settings.bankIban || ''}
                onChange={e => setSettings({ ...settings, bankIban: e.target.value })}
                placeholder="0040 0000 1472 2403 1016 5"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Exibido na página de assinaturas e bloqueio de conta para os clientes pagarem.
              </p>
            </div>

            {/* Titular da Conta */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nome do Titular da Conta (Beneficiário)
              </label>
              <input
                type="text"
                value={settings.accountHolder || ''}
                onChange={e => setSettings({ ...settings, accountHolder: e.target.value })}
                placeholder="BARTOLOMEU SUNDA CONDE MAVUNGO"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Nome que deve coincidir com o titular do IBAN.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Guardar Alterações do SaaS</span>
            </button>
          </div>
        </form>
      )}

      {/* MODAL: ATIVAR PLANO */}
      {actionModal === 'activate' && selectedCompany && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleActivate} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-extrabold text-slate-900">
                Ativar Assinatura: {selectedCompany.name}
              </h4>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Esta ação valida o pagamento do comerciante, desbloqueia imediatamente todos os recursos e define a nova data de validade.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Plano a Ativar</label>
              <select
                value={activatePlan}
                onChange={e => setActivatePlan(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="basic">Plano Básico (Kz {(settings.planPrices?.basic || 5000).toLocaleString('pt-AO')}/mês)</option>
                <option value="pro">Plano Profissional (Kz {(settings.planPrices?.pro || 10000).toLocaleString('pt-AO')}/mês)</option>
                <option value="premium">Plano Empresarial / Redes (Kz {(settings.planPrices?.premium || 30000).toLocaleString('pt-AO')}/mês)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Duração da Ativação</label>
              <select
                value={activateDuration}
                onChange={e => setActivateDuration(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value={30}>30 Dias (1 Mês)</option>
                <option value={60}>60 Dias (2 Meses)</option>
                <option value={90}>90 Dias (3 Meses / Trimestral)</option>
                <option value={365}>365 Dias (1 Ano / Anual)</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
              >
                {isProcessing ? 'A ativar...' : 'Confirmar Ativação'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: PRORROGAR TESTE */}
      {actionModal === 'extend' && selectedCompany && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleExtendTrial} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-extrabold text-slate-900">
                Prorrogar Teste: {selectedCompany.name}
              </h4>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Adicione mais dias de teste gratuito a esta empresa para permitir que continuem a testar o sistema.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dias Adicionais</label>
              <select
                value={extendDays}
                onChange={e => setExtendDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value={3}>+3 Dias</option>
                <option value={7}>+7 Dias (1 Semana adicional)</option>
                <option value={14}>+14 Dias (2 Semanas adicionais)</option>
                <option value={30}>+30 Dias</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md"
              >
                {isProcessing ? 'A prorrogar...' : 'Prorrogar Teste'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: INSPECIONAR DADOS DE CONTROLO DA EMPRESA */}
      {actionModal === 'details' && selectedCompany && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-md">
                  {selectedCompany.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{selectedCompany.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      selectedCompany.subscriptionStatus === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedCompany.subscriptionStatus === 'trial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedCompany.subscriptionStatus || 'trial'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    ID do Tenant: <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">{selectedCompany.id}</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setSelectedCompany(null);
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Metrics Quick Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                <p className="text-[11px] text-slate-500 font-medium">Total Faturado</p>
                <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                  {(selectedCompany.totalRevenue || 0).toLocaleString('pt-AO')} Kz
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                <p className="text-[11px] text-slate-500 font-medium">Total Vendas</p>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  {selectedCompany.salesCount || 0}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                <p className="text-[11px] text-slate-500 font-medium">Produtos no Catálogo</p>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  {selectedCompany.productsCount || 0}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                <p className="text-[11px] text-slate-500 font-medium">Utilizadores / Caixas</p>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  {selectedCompany.usersCount || 1}
                </p>
              </div>
            </div>

            {/* Detailed Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-600" />
                  Dados da Empresa
                </h4>
                <div className="space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ramo de Atividade:</span>
                    <span className="font-bold text-slate-800">{selectedCompany.businessType || 'Comércio Geral'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Responsável:</span>
                    <span className="font-bold text-slate-800">{selectedCompany.responsibleName || 'Não indicado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Telefone / WhatsApp:</span>
                    <span className="font-bold text-slate-800">{selectedCompany.phone || 'Sem telefone'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">NIF / Contribuinte:</span>
                    <span className="font-bold text-slate-800">{selectedCompany.nif || 'Consumidor Final'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Endereço / Local:</span>
                    <span className="font-bold text-slate-800 text-right">{selectedCompany.address || 'Angola'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Controlo da Assinatura
                </h4>
                <div className="space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Plano Selecionado:</span>
                    <span className="font-extrabold uppercase text-slate-900">{selectedCompany.planId || selectedCompany.plan || 'pro'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estado de Acesso:</span>
                    <span className="font-bold text-slate-800">{selectedCompany.subscriptionStatus || 'trial'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fim do Teste Gratuito:</span>
                    <span className="font-bold text-slate-800">
                      {selectedCompany.trialEndDate ? new Date(selectedCompany.trialEndDate).toLocaleDateString('pt-PT') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Validade da Assinatura:</span>
                    <span className="font-bold text-emerald-700">
                      {selectedCompany.subscriptionEndDate ? new Date(selectedCompany.subscriptionEndDate).toLocaleDateString('pt-PT') : 'Sem assinatura paga'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data de Cadastro:</span>
                    <span className="font-bold text-slate-800">
                      {selectedCompany.createdAt ? new Date(selectedCompany.createdAt).toLocaleDateString('pt-PT') : 'Recente'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Super Admin Actions on This Company */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {selectedCompany.phone && (
                  <a
                    href={`https://wa.me/${selectedCompany.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Olá ${selectedCompany.responsibleName || selectedCompany.name}! Sou o Administrador do VendaFácil SaaS.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs transition"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleToggleBlock(selectedCompany)}
                  className={`px-3 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                    selectedCompany.subscriptionStatus === 'blocked'
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{selectedCompany.subscriptionStatus === 'blocked' ? 'Desbloquear Conta' : 'Suspender Conta'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActionModal('extend')}
                  className="px-3 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-bold text-xs transition"
                >
                  + Prorrogar Teste
                </button>
                <button
                  type="button"
                  onClick={() => setActionModal('activate')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                >
                  Ativar Assinatura
                </button>
                <button
                  type="button"
                  onClick={() => switchCompany(selectedCompany.id)}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Aceder Loja</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR NOVA EMPRESA MANUALMENTE */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Cadastrar Nova Empresa / Loja
                </h3>
                <p className="text-xs text-slate-500">
                  Registe um cliente manualmente no sistema SaaS
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome da Empresa / Loja *
                </label>
                <input
                  type="text"
                  required
                  value={newCompData.name}
                  onChange={(e) => setNewCompData({ ...newCompData, name: e.target.value })}
                  placeholder="ex: Supermercado Central"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    value={newCompData.ownerName}
                    onChange={(e) => setNewCompData({ ...newCompData, ownerName: e.target.value })}
                    placeholder="ex: Bartolomeu Conde"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ramo de Atividade
                  </label>
                  <input
                    type="text"
                    value={newCompData.businessType}
                    onChange={(e) => setNewCompData({ ...newCompData, businessType: e.target.value })}
                    placeholder="ex: Mercearia / Mini-mercado"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail de Acesso *
                  </label>
                  <input
                    type="email"
                    required
                    value={newCompData.email}
                    onChange={(e) => setNewCompData({ ...newCompData, email: e.target.value })}
                    placeholder="cliente@exemplo.ao"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="tel"
                    value={newCompData.phone}
                    onChange={(e) => setNewCompData({ ...newCompData, phone: e.target.value })}
                    placeholder="+244 923 000 000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Plano Atribuído
                  </label>
                  <select
                    value={newCompData.planId}
                    onChange={(e) => setNewCompData({ ...newCompData, planId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="basic">Básico (5.000 Kz/mês)</option>
                    <option value="pro">Pro (10.000 Kz/mês)</option>
                    <option value="premium">Premium (30.000 Kz/mês)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Estado Inicial
                  </label>
                  <select
                    value={newCompData.status}
                    onChange={(e) => setNewCompData({ ...newCompData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="trial">Teste Gratuito (7 dias)</option>
                    <option value="active">Ativo Pago (30 dias)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingCompany}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  {creatingCompany ? 'A registar...' : 'Cadastrar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
