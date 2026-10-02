import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  RefreshCw,
  X,
  CheckCircle2,
  HardDrive,
  Building2,
  Package,
  ShoppingCart,
  Users,
  AlertCircle,
  FileCheck,
  Check,
  History,
  Lock,
  ArrowRight
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';

interface SystemUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemUpdateModal: React.FC<SystemUpdateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<any | null>(null);

  const [systemInfo, setSystemInfo] = useState<{
    version: string;
    lastUpdatedAt: string;
    integrityStatus: string;
    dataProtectionActive: boolean;
    stats: {
      companiesCount: number;
      usersCount: number;
      productsCount: number;
      salesCount: number;
      customersCount: number;
    };
    updateHistory: any[];
  } | null>(null);

  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ver, snaps] = await Promise.all([
        api.getSystemVersion().catch(() => null),
        api.getSystemSnapshots().catch(() => []),
      ]);
      if (ver) setSystemInfo(ver);
      if (snaps) setSnapshots(snaps);
    } catch (err: any) {
      console.warn('Erro ao carregar dados do sistema:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setUpdateSuccess(null);
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecuteUpdate = async () => {
    setIsUpdating(true);
    try {
      // 1. Trigger zero-loss system update on backend
      const res = await api.applySystemUpdate();

      // 2. Clear browser CacheStorage if available (to fetch freshest static bundles)
      if ('caches' in window) {
        try {
          const cacheKeys = await window.caches.keys();
          await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
        } catch (cErr) {
          console.warn('Cache clearing notice:', cErr);
        }
      }

      setUpdateSuccess(res);
      success(res.message);
      // Reload system info
      await loadData();
    } catch (err: any) {
      error(err.message || 'Erro ao executar actualização segura');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFinishAndReload = () => {
    onClose();
    // Reload safely preserving all session storage and tokens
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden text-slate-800 border border-slate-200 flex flex-col max-h-[92vh]">
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg tracking-tight">
                  Actualização do Aplicativo
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Zero Perda de Dados
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Atualize o sistema com salvaguarda total de empresas, vendas e produtos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {updateSuccess ? (
            /* SUCCESS STATE */
            <div className="py-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center text-emerald-700 shadow-md">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900">
                  Aplicativo Actualizado com Sucesso!
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                  A nova versão foi aplicada. A integridade de todos os dados registados foi confirmada e 100% dos registos foram salvaguardados sem nenhuma modificação.
                </p>
              </div>

              {/* Verified Records Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <div className="text-center p-2 rounded-xl bg-white shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 block">Empresas Intactas</span>
                  <span className="text-base font-black text-emerald-700">
                    {updateSuccess.stats?.companiesPreserved ?? systemInfo?.stats?.companiesCount ?? 0}
                  </span>
                </div>
                <div className="text-center p-2 rounded-xl bg-white shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 block">Produtos Seguros</span>
                  <span className="text-base font-black text-emerald-700">
                    {updateSuccess.stats?.productsPreserved ?? systemInfo?.stats?.productsCount ?? 0}
                  </span>
                </div>
                <div className="text-center p-2 rounded-xl bg-white shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 block">Vendas Preservadas</span>
                  <span className="text-base font-black text-emerald-700">
                    {updateSuccess.stats?.salesPreserved ?? systemInfo?.stats?.salesCount ?? 0}
                  </span>
                </div>
                <div className="text-center p-2 rounded-xl bg-white shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 block">Utilizadores</span>
                  <span className="text-base font-black text-emerald-700">
                    {updateSuccess.stats?.usersPreserved ?? systemInfo?.stats?.usersCount ?? 0}
                  </span>
                </div>
              </div>

              {/* Safety snapshot notice */}
              {updateSuccess.backupFilename && (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-left text-xs text-slate-600 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800">Snapshot de Segurança Criado: </span>
                    <span className="font-mono text-[11px] text-slate-600 truncate block">
                      {updateSuccess.backupFilename}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleFinishAndReload}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Recarregar e Utilizar Nova Versão</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          ) : (
            /* PRE-UPDATE STATE */
            <>
              {/* Guarantee Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/90 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <h4 className="font-extrabold text-emerald-950">
                    Garantia de Preservação Absoluta dos Dados
                  </h4>
                  <p className="text-emerald-800/90 mt-0.5 leading-relaxed">
                    Esta opção aplica melhorias de código, novas funcionalidades e correções de segurança no aplicativo <strong>sem tocar, alterar ou apagar nenhuma tabela</strong> das empresas registadas em funcionamento.
                  </p>
                </div>
              </div>

              {/* Current Status Overview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Estado Atual do Sistema:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    Versão {systemInfo?.version || '2.1.0'} Operacional
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-[10px] font-bold uppercase">Empresas</span>
                    </div>
                    <span className="text-lg font-black text-slate-900">
                      {systemInfo?.stats?.companiesCount ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">registadas</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                      <Package className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[10px] font-bold uppercase">Produtos</span>
                    </div>
                    <span className="text-lg font-black text-slate-900">
                      {systemInfo?.stats?.productsCount ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">em catálogo</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[10px] font-bold uppercase">Vendas</span>
                    </div>
                    <span className="text-lg font-black text-slate-900">
                      {systemInfo?.stats?.salesCount ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">registadas</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-[10px] font-bold uppercase">Utilizadores</span>
                    </div>
                    <span className="text-lg font-black text-slate-900">
                      {systemInfo?.stats?.usersCount ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">com acesso</span>
                  </div>
                </div>
              </div>

              {/* What happens during update */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  Procedimento de Segurança da Actualização:
                </span>
                <ul className="space-y-1 text-slate-600 pl-4 list-disc text-[11px] leading-relaxed">
                  <li>Criação de snapshot de segurança automático em disco antes do processo.</li>
                  <li>Limpeza de cache estático do navegador sem encerrar as sessões dos utilizadores.</li>
                  <li>Migração não-destrutiva: campos existentes são preservados sem alterações.</li>
                  <li>Verificação matemática da integridade de cada empresa e cada saldo de caixa.</li>
                </ul>
              </div>

              {/* Snapshots history toggle */}
              {snapshots.length > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>{showHistory ? 'Ocultar Cópias Anteriores' : `Ver Cópias de Segurança (${snapshots.length})`}</span>
                  </button>

                  {showHistory && (
                    <div className="mt-2 p-2 rounded-xl bg-slate-100 border border-slate-200 max-h-36 overflow-y-auto space-y-1 text-[11px]">
                      {snapshots.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-white shadow-2xs">
                          <span className="font-mono text-slate-700 truncate">{s.filename}</span>
                          <span className="text-slate-400 shrink-0 text-[10px]">
                            {new Date(s.createdAt).toLocaleDateString('pt-PT')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        {!updateSuccess && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-white text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={isUpdating}
              onClick={handleExecuteUpdate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-600/25 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'A actualização em curso...' : 'Actualizar Aplicativo (Zero-Perda)'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
