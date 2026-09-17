import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Shield,
  Mail,
  Phone,
  Edit2,
  Trash2,
  X,
  Check,
  Lock,
  Search,
  SlidersHorizontal,
  UserX,
  AlertTriangle,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldAlert,
  Building,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole } from '../types/index.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

interface EmployeesPageProps {
  onNavigate?: (route: string) => void;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ onNavigate }) => {
  const { user: currentUser, company } = useAuth();
  const { success, error, warning } = useToast();

  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('vendedor');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation
  const [deletingEmployee, setDeletingEmployee] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Plan limits definition
  const planLimits: Record<string, { maxUsers: number; name: string; tag: string }> = {
    free: { maxUsers: 1, name: 'Gratuito', tag: '1 Vaga (Proprietário)' },
    basic: { maxUsers: 3, name: 'Básico', tag: 'Até 3 Vagas' },
    pro: { maxUsers: 10, name: 'Profissional', tag: 'Até 10 Vagas' },
    premium: { maxUsers: 100, name: 'Empresarial', tag: 'Ilimitado / 100 Vagas' },
  };

  const currentPlanKey = (company?.planId || company?.plan || 'pro') as string;
  const currentPlan = planLimits[currentPlanKey] || planLimits.pro;
  const isLimitReached = employees.length >= currentPlan.maxUsers;

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const list = await api.getEmployees();
      setEmployees(list);
    } catch (e: any) {
      error('Erro ao carregar funcionários da empresa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const openAddModal = () => {
    if (isLimitReached) {
      warning(
        `O seu plano atual (${currentPlan.name}) permite até ${currentPlan.maxUsers} funcionário(s). Faça upgrade da sua assinatura para cadastrar mais colaboradores!`
      );
      return;
    }
    setEditingEmployee(null);
    setName('');
    setEmail('');
    setRole('vendedor');
    setPhone('');
    setPassword('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: User) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setEmail(emp.email);
    setRole(emp.role);
    setPhone(emp.phone || '');
    setPassword('');
    setIsActive(emp.isActive !== false);
    setIsModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      warning('Preencha os campos obrigatórios');
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        role,
        phone: phone.trim() || undefined,
        isActive,
      };
      if (password.trim()) {
        payload.password = password.trim();
      }

      if (editingEmployee) {
        const updated = await api.updateEmployee(editingEmployee.id, payload);
        setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        success('Dados do funcionário atualizados!');
      } else {
        const created = await api.createEmployee(payload);
        setEmployees((prev) => [...prev, created]);
        success('Funcionário registado com sucesso!');
      }
      setIsModalOpen(false);
    } catch (e: any) {
      error(e.message || 'Erro ao guardar dados do funcionário');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (emp: User) => {
    if (emp.id === currentUser?.id && emp.isActive) {
      warning('Não pode desativar a sua própria conta ativa em sessão!');
      return;
    }

    try {
      const newStatus = !emp.isActive;
      const updated = await api.toggleEmployeeStatus(emp.id, newStatus);
      setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      if (newStatus) {
        success(`Acesso do funcionário ${emp.name} ativado.`);
      } else {
        warning(`Acesso do funcionário ${emp.name} desativado/suspenso.`);
      }
    } catch (e: any) {
      error(e.message || 'Erro ao alterar estado do funcionário');
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deletingEmployee) return;
    try {
      setIsDeleting(true);
      await api.deleteEmployee(deletingEmployee.id);
      setEmployees((prev) => prev.filter((e) => e.id !== deletingEmployee.id));
      success(`Funcionário ${deletingEmployee.name} removido com sucesso.`);
      setDeletingEmployee(null);
    } catch (e: any) {
      error(e.message || 'Erro ao remover funcionário');
    } finally {
      setIsDeleting(false);
    }
  };

  const rolesCatalog: { role: UserRole; title: string; desc: string; color: string; badge: string }[] = [
    {
      role: 'proprietario',
      title: 'Proprietário',
      desc: 'Acesso irrestrito a todos os módulos, relatórios de lucro, despesas, funcionários e gestão da empresa.',
      color: 'bg-amber-500/10 text-amber-800 border-amber-300',
      badge: 'bg-amber-100 text-amber-800',
    },
    {
      role: 'administrador',
      title: 'Administrador / Gerente',
      desc: 'Gestão operacional de vendas, cadastro de produtos, controlo de stock, fiado, despesas e relatórios diários.',
      color: 'bg-blue-500/10 text-blue-800 border-blue-300',
      badge: 'bg-blue-100 text-blue-800',
    },
    {
      role: 'vendedor',
      title: 'Vendedor / Balcão',
      desc: 'Acesso rápido e focado no PDV para registar vendas, consultar catálogo de preços e cadastrar novos clientes.',
      color: 'bg-emerald-500/10 text-emerald-800 border-emerald-300',
      badge: 'bg-emerald-100 text-emerald-800',
    },
    {
      role: 'caixa',
      title: 'Operador de Caixa',
      desc: 'Abertura e fecho de caixa, registo de vendas, sangrias, suprimentos e cobrança de dívidas de fiado.',
      color: 'bg-purple-500/10 text-purple-800 border-purple-300',
      badge: 'bg-purple-100 text-purple-800',
    },
    {
      role: 'stock',
      title: 'Operador de Stock',
      desc: 'Registo de entrada de mercadorias, conferência física de contagem, ajuste de balanço e devoluções.',
      color: 'bg-orange-500/10 text-orange-800 border-orange-300',
      badge: 'bg-orange-100 text-orange-800',
    },
  ];

  // Filtering
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.phone && emp.phone.includes(searchQuery));

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? emp.isActive !== false
          : emp.isActive === false;

      const matchesRole = roleFilter === 'all' ? true : emp.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [employees, searchQuery, statusFilter, roleFilter]);

  const activeEmployeesCount = employees.filter((e) => e.isActive !== false).length;
  const inactiveEmployeesCount = employees.filter((e) => e.isActive === false).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Plan Quota Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Plano {currentPlan.name}
              </span>
              <span className="text-xs text-slate-400 font-semibold">• {company?.name || 'Minha Empresa'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Funcionários & Níveis de Acesso
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Controle quem pode aceder à sua loja, emitir vendas, fechar o caixa ou visualizar lucros
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Upgrade CTA if close or at limit */}
            {onNavigate && (
              <button
                onClick={() => onNavigate('planos')}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ver Planos & Upgrade</span>
              </button>
            )}

            <button
              onClick={openAddModal}
              disabled={isLimitReached}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md ${
                isLimitReached
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-emerald-600/20'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Novo Funcionário</span>
            </button>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 font-semibold block text-[11px]">Vagas Ocupadas</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-slate-900">{employees.length}</span>
              <span className="text-slate-500 font-bold">/ {currentPlan.maxUsers} permitidos</span>
            </div>
            {/* Progress line */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isLimitReached ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, (employees.length / currentPlan.maxUsers) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 font-semibold block text-[11px]">Utilizadores Ativos</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-emerald-600">{activeEmployeesCount}</span>
              <span className="text-slate-500 font-medium">com acesso liberado</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 font-semibold block text-[11px]">Utilizadores Suspensos</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-slate-600">{inactiveEmployeesCount}</span>
              <span className="text-slate-500 font-medium">com acesso bloqueado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por nome, email ou telefone..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Tabs */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos ({employees.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                statusFilter === 'active'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Ativos ({activeEmployeesCount})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Inativos ({inactiveEmployeesCount})
            </button>
          </div>

          {/* Role selector */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todas as Funções</option>
            <option value="proprietario">Proprietário</option>
            <option value="administrador">Administrador</option>
            <option value="vendedor">Vendedor</option>
            <option value="caixa">Operador de Caixa</option>
            <option value="stock">Operador de Stock</option>
          </select>
        </div>
      </div>

      {/* Employees Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">A carregar funcionários...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <UserX className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-800">Nenhum funcionário encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || roleFilter !== 'all'
              ? 'Tente ajustar os filtros de pesquisa para encontrar o colaborador pretendido.'
              : 'Adicione o seu primeiro colaborador para distribuir as tarefas de vendas, caixa e stock.'}
          </p>
          {!isLimitReached && (
            <button
              onClick={openAddModal}
              className="mt-2 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Funcionário</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const roleData = rolesCatalog.find((r) => r.role === emp.role);
            const isEmpActive = emp.isActive !== false;
            const isMe = emp.id === currentUser?.id;

            return (
              <motion.div
                key={emp.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between shadow-2xs ${
                  !isEmpActive ? 'border-slate-200 bg-slate-50/60 opacity-85' : 'border-slate-200/90'
                }`}
              >
                <div>
                  {/* Top Header Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-2xs ${
                          isEmpActive
                            ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-slate-900 truncate" title={emp.name}>
                            {emp.name}
                          </h4>
                          {isMe && (
                            <span className="text-[9px] font-extrabold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-md">
                              Eu
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate" title={emp.email}>
                          {emp.email}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shrink-0 border ${
                        roleData?.color || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {roleData?.title || emp.role}
                    </span>
                  </div>

                  {/* Status & Contact details */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Estado do Acesso:</span>
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black transition-colors ${
                          isEmpActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                        title="Clique para alternar o estado do acesso"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isEmpActive ? 'bg-emerald-600' : 'bg-slate-500'}`}
                        />
                        <span>{isEmpActive ? 'Ativo' : 'Inativo / Suspenso'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-slate-400 font-medium">Contacto:</span>
                      <span className="font-semibold text-slate-700">{emp.phone || 'Sem telefone'}</span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 line-clamp-2">
                      {roleData?.desc}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleStatus(emp)}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 border ${
                      isEmpActive
                        ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {isEmpActive ? 'Suspender' : 'Reativar'}
                  </button>

                  <button
                    onClick={() => openEditModal(emp)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Editar dados e cargo"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeletingEmployee(emp)}
                    disabled={isMe}
                    className={`p-2 rounded-xl border transition-colors ${
                      isMe
                        ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                        : 'border-rose-100 text-rose-600 hover:bg-rose-50'
                    }`}
                    title={isMe ? 'Não pode apagar a sua própria conta' : 'Apagar funcionário'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Permissions Matrix Reference Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span>Matriz de Permissões por Função</span>
            </h3>
            <p className="text-xs text-slate-500">
              Controlo granular de acessos aos módulos de vendas, stock, caixa, despesas e relatórios
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black">
                <th className="py-2.5 px-3">Módulo / Ação</th>
                <th className="py-2.5 px-2 text-center text-amber-700">Proprietário</th>
                <th className="py-2.5 px-2 text-center text-blue-700">Administrador</th>
                <th className="py-2.5 px-2 text-center text-emerald-700">Vendedor</th>
                <th className="py-2.5 px-2 text-center text-purple-700">Caixa</th>
                <th className="py-2.5 px-2 text-center text-orange-700">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 px-3 font-semibold">Realizar Vendas no PDV & Emitir Recibos</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">-</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Abrir / Fechar Caixa & Sangrias</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">-</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">-</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Gestão de Stock & Entradas / Ajustes</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">Apenas Consulta</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">Apenas Consulta</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓ Completo</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Gestão de Fiado & Cobranças WhatsApp</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓ Registar</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓ Receber</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">-</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Lançamento de Despesas & Custos</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">-</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">-</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">-</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Relatórios de Lucro Líquido & DRE</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓ Diário</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">-</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">-</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">-</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Cadastrar / Editar Funcionários & Assinatura</td>
                <td className="py-2.5 px-2 text-center text-emerald-600 font-bold">✓ Total</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">-</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">-</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">-</td>
                <td className="py-2.5 px-2 text-center text-slate-300 font-bold">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
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
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900">
                      {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
                    </h3>
                    <p className="text-[11px] text-slate-400">{company?.name || 'VendaFácil'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEmployee} className="py-4 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Mateus"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email de Acesso *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@empresa.ao"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Função / Permissão *</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="vendedor">Vendedor (PDV)</option>
                      <option value="caixa">Operador de Caixa</option>
                      <option value="stock">Operador de Stock</option>
                      <option value="administrador">Administrador</option>
                      <option value="proprietario">Proprietário (Dono)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+244 923 000 000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editingEmployee ? 'Nova Palavra-passe (Opcional)' : 'Palavra-passe Inicial *'}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required={!editingEmployee}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingEmployee ? 'Deixe em branco para manter' : '••••••••'}
                      className="w-full pl-9 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Active Switch in Modal */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">Conta Ativa</span>
                    <span className="text-[10px] text-slate-500">Permite login e operações no sistema</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                  >
                    {isSaving ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>{editingEmployee ? 'Guardar Alterações' : 'Cadastrar Funcionário'}</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="font-black text-base text-slate-900">Remover Funcionário?</h3>
                <p className="text-xs text-slate-500">
                  Tem a certeza que deseja apagar o acesso de{' '}
                  <strong className="text-slate-800 font-bold">{deletingEmployee.name}</strong> ({deletingEmployee.email})?
                  Esta ação não pode ser desfeita.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingEmployee(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteEmployee}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Sim, Remover</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
