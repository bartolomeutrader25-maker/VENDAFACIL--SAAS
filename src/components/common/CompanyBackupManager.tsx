import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Download,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  Clock,
  FileJson,
  FileSpreadsheet,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Layers,
  ShoppingBag,
  Users,
  Boxes,
  LogOut,
  FolderArchive
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { api } from '../../lib/api.js';
import {
  initGoogleDriveAuth,
  signInWithGoogleForDrive,
  signOutGoogleDrive,
  getGoogleAccessToken,
  uploadBackupToGoogleDrive,
  listRecentDriveBackups,
  downloadLocalJsonBackup,
  downloadLocalCsvSummary,
  getBackupScheduleConfig,
  saveBackupScheduleConfig,
  getBackupHistory,
  addBackupHistoryItem,
  DriveBackupFile,
  BackupHistoryItem,
  BackupScheduleConfig
} from '../../lib/googleDriveService.js';
import { User } from 'firebase/auth';

export const CompanyBackupManager: React.FC = () => {
  const { company } = useAuth();
  const { success, error, info } = useToast();

  const companyId = company?.id || 'default_comp';
  const companyName = company?.name || 'Minha Empresa';

  // Google Auth State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Backup Execution State
  const [isBackingUpDrive, setIsBackingUpDrive] = useState(false);
  const [isBackingUpLocal, setIsBackingUpLocal] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [recentDriveFiles, setRecentDriveFiles] = useState<DriveBackupFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);

  // Configuration & History
  const [scheduleConfig, setScheduleConfig] = useState<BackupScheduleConfig>(() =>
    getBackupScheduleConfig(companyId)
  );
  const [history, setHistory] = useState<BackupHistoryItem[]>(() =>
    getBackupHistory(companyId)
  );
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Listen to Google Auth changes
  useEffect(() => {
    const unsubscribe = initGoogleDriveAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        loadDriveFiles(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch current company data summary
  useEffect(() => {
    loadSummary();
  }, [companyId]);

  const loadSummary = async () => {
    try {
      setIsLoadingSummary(true);
      const res = await api.getCompanyBackupSummary();
      setSummaryData(res);
    } catch (e) {
      console.warn('Erro ao obter sumário de backup:', e);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const loadDriveFiles = async (token: string) => {
    try {
      setIsLoadingDriveFiles(true);
      const files = await listRecentDriveBackups(token);
      setRecentDriveFiles(files);
    } catch (e) {
      console.warn('Erro ao listar arquivos do drive:', e);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      const result = await signInWithGoogleForDrive();
      setGoogleUser(result.user);
      setGoogleToken(result.accessToken);
      success(`Google Drive conectado com sucesso para ${result.user.displayName || result.user.email}!`);
      loadDriveFiles(result.accessToken);
    } catch (e: any) {
      error(e.message || 'Falha ao autenticar com o Google.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutGoogleDrive();
      setGoogleUser(null);
      setGoogleToken(null);
      setRecentDriveFiles([]);
      info('Desconectado do Google Drive.');
    } catch (e: any) {
      error('Erro ao desconectar.');
    }
  };

  // Perform immediate backup to Google Drive
  const handleBackupToDrive = async () => {
    let token = googleToken;
    if (!token) {
      try {
        const authRes = await signInWithGoogleForDrive();
        setGoogleUser(authRes.user);
        setGoogleToken(authRes.accessToken);
        token = authRes.accessToken;
      } catch (err: any) {
        error('É necessário autorizar o acesso ao Google Drive para continuar.');
        return;
      }
    }

    try {
      setIsBackingUpDrive(true);
      info('A preparar dados da empresa para a nuvem...');
      const fullBackup = await api.exportCompanyBackup();

      const driveResult = await uploadBackupToGoogleDrive(token, fullBackup, companyName);

      // Record in history
      const historyItem: BackupHistoryItem = {
        id: `bk_${Date.now()}`,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleString('pt-PT'),
        destination: 'google_drive',
        status: 'success',
        driveFileId: driveResult.id,
        driveFileUrl: driveResult.webViewLink,
        fileName: driveResult.name,
        fileSizeBytes: driveResult.size ? parseInt(driveResult.size, 10) : undefined,
        totalSales: fullBackup.summary?.totalSales || 0,
        totalProducts: fullBackup.summary?.totalProducts || 0,
        totalCustomers: fullBackup.summary?.totalCustomers || 0,
        triggerType: 'manual'
      };

      addBackupHistoryItem(companyId, historyItem);
      setHistory(getBackupHistory(companyId));

      // Update schedule last run
      const updatedConfig = {
        ...scheduleConfig,
        lastRunTimestamp: Date.now(),
        lastRunStatus: 'success' as const
      };
      setScheduleConfig(updatedConfig);
      saveBackupScheduleConfig(companyId, updatedConfig);

      success('Cópia de segurança enviada com sucesso para o seu Google Drive!');
      loadDriveFiles(token);
    } catch (e: any) {
      console.error(e);
      error(e.message || 'Erro ao enviar cópia para o Google Drive');

      const failedItem: BackupHistoryItem = {
        id: `bk_${Date.now()}`,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleString('pt-PT'),
        destination: 'google_drive',
        status: 'failed',
        fileName: `Backup_${companyName}.json`,
        totalSales: summaryData?.summary?.totalSales || 0,
        totalProducts: summaryData?.summary?.totalProducts || 0,
        totalCustomers: summaryData?.summary?.totalCustomers || 0,
        triggerType: 'manual',
        errorMessage: e.message || 'Falha de comunicação'
      };
      addBackupHistoryItem(companyId, failedItem);
      setHistory(getBackupHistory(companyId));
    } finally {
      setIsBackingUpDrive(false);
    }
  };

  // Perform immediate local JSON download
  const handleDownloadLocalJson = async () => {
    try {
      setIsBackingUpLocal(true);
      info('A gerar cópia de segurança local...');
      const fullBackup = await api.exportCompanyBackup();
      const downloadInfo = downloadLocalJsonBackup(fullBackup, companyName);

      // Record in history
      const historyItem: BackupHistoryItem = {
        id: `bk_${Date.now()}`,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleString('pt-PT'),
        destination: 'local_download',
        status: 'success',
        fileName: downloadInfo.fileName,
        fileSizeBytes: downloadInfo.size,
        totalSales: fullBackup.summary?.totalSales || 0,
        totalProducts: fullBackup.summary?.totalProducts || 0,
        totalCustomers: fullBackup.summary?.totalCustomers || 0,
        triggerType: 'manual'
      };

      addBackupHistoryItem(companyId, historyItem);
      setHistory(getBackupHistory(companyId));

      // Update schedule last run
      const updatedConfig = {
        ...scheduleConfig,
        lastRunTimestamp: Date.now(),
        lastRunStatus: 'success' as const
      };
      setScheduleConfig(updatedConfig);
      saveBackupScheduleConfig(companyId, updatedConfig);

      success('Ficheiro de backup (.json) descarregado com sucesso!');
    } catch (e: any) {
      error(e.message || 'Erro ao descarregar cópia de segurança');
    } finally {
      setIsBackingUpLocal(false);
    }
  };

  // Perform immediate CSV export
  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);
      const fullBackup = await api.exportCompanyBackup();
      downloadLocalCsvSummary(fullBackup, companyName);
      success('Ficheiro de vendas (.csv) descarregado com sucesso!');
    } catch (e: any) {
      error(e.message || 'Erro ao exportar CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Update schedule configuration
  const handleUpdateSchedule = (updates: Partial<BackupScheduleConfig>) => {
    const updated = { ...scheduleConfig, ...updates };
    setScheduleConfig(updated);
    saveBackupScheduleConfig(companyId, updated);
    success('Configuração de cópias de segurança atualizada!');
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/D';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Cópias de Segurança & Proteção de Dados
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Exporte automaticamente todas as vendas, histórico de fiado, clientes e produtos para o seu <strong>Google Drive</strong> ou descarregue backups locais com 1 clique.
            </p>
          </div>

          {/* Current Live Stats Badge */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 shrink-0">
            <div className="text-center px-2">
              <span className="block text-xs font-semibold text-slate-400">Vendas</span>
              <span className="text-sm font-black text-slate-900">{summaryData?.summary?.totalSales ?? '...'}</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-center px-2">
              <span className="block text-xs font-semibold text-slate-400">Produtos</span>
              <span className="text-sm font-black text-slate-900">{summaryData?.summary?.totalProducts ?? '...'}</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-center px-2">
              <span className="block text-xs font-semibold text-slate-400">Clientes</span>
              <span className="text-sm font-black text-slate-900">{summaryData?.summary?.totalCustomers ?? '...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Google Drive Connection & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Google Drive Status & Integration Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Integração com Google Drive</h3>
                  <p className="text-[11px] text-slate-400">Armazenamento na nuvem seguro na sua conta Google</p>
                </div>
              </div>

              {googleUser ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                  Desconectado
                </span>
              )}
            </div>

            {/* Connection Details or Sign In prompt */}
            {googleUser ? (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {googleUser.photoURL ? (
                      <img
                        src={googleUser.photoURL}
                        alt={googleUser.displayName || 'Google Account'}
                        className="w-10 h-10 rounded-full border border-white shadow-xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                        {(googleUser.displayName || googleUser.email || 'G')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 truncate">
                        {googleUser.displayName || 'Utilizador Google'}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">{googleUser.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleSignOut}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Desconectar do Google Drive"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pasta de destino: <strong>VendaFacil_Backups</strong></span>
                  </span>
                  <span>{recentDriveFiles.length} backup(s) sincronizados</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs text-slate-600 space-y-3">
                <p>
                  Ao conectar com o Google, os seus backups serão enviados automaticamente para uma pasta exclusiva <strong>"VendaFacil_Backups"</strong> no seu Google Drive, acessível a qualquer momento pelo seu smartphone ou computador.
                </p>

                {/* Official styled Google Sign In button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isAuthenticating}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm px-4 py-3 rounded-2xl border border-slate-300 shadow-2xs transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isAuthenticating ? 'A conectar conta Google...' : 'Conectar com Google Drive'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Drive Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleBackupToDrive}
              disabled={isBackingUpDrive}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              {isBackingUpDrive ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>A enviar backup para o Google Drive...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>{googleUser ? 'Fazer Backup Agora no Google Drive' : 'Conectar e Fazer Backup no Drive'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Immediate Local Download & Spreadsheet Export */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Download Local Imediato</h3>
                <p className="text-[11px] text-slate-400">Descarregue para o seu computador, telemóvel ou pen drive</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <FileJson className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-slate-900">Ficheiro Completo JSON</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Contém todas as tabelas: vendas, itens, stock, clientes, despesas e fiado. Formato ideal para restauração completa ou migração.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-slate-900">Planilha de Vendas em CSV</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Compatível com Microsoft Excel e Google Sheets para auditoria financeira rápida e contabilidade externa.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleDownloadLocalJson}
              disabled={isBackingUpLocal}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              {isBackingUpLocal ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Descarregar JSON</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExportingCsv}
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 active:scale-98 disabled:opacity-50 text-slate-800 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl border border-slate-200 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Automated / Recurring Backup Configuration */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Rotina de Exportação Recorrente</h3>
              <p className="text-[11px] text-slate-400">Automatize as salvaguardas periódicas sem intervenção manual</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleConfig.enabled}
              onChange={(e) => handleUpdateSchedule({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {scheduleConfig.enabled ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Frequência Automática</label>
              <select
                value={scheduleConfig.frequency}
                onChange={(e) => handleUpdateSchedule({ frequency: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
              >
                <option value="daily">Diariamente (No 1º acesso do dia)</option>
                <option value="on_cash_close">Ao Fechar Sessão de Caixa</option>
                <option value="every_10_sales">A cada 10 Vendas Realizadas</option>
                <option value="weekly">Semanalmente</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Destino da Cópia Automática</label>
              <select
                value={scheduleConfig.destination}
                onChange={(e) => handleUpdateSchedule({ destination: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
              >
                <option value="both">Google Drive + Notificação Local</option>
                <option value="google_drive">Apenas Google Drive</option>
                <option value="local_download">Apenas Notificação / Download Local</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Estado da Rotina</label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">
                  {scheduleConfig.lastRunTimestamp ? (
                    <>Último: {new Date(scheduleConfig.lastRunTimestamp).toLocaleString('pt-PT')}</>
                  ) : (
                    'Aguardando 1ª execução automática'
                  )}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>As exportações automáticas estão desativadas. Pode ainda fazer backups manuais a qualquer momento pelos botões acima.</span>
          </div>
        )}
      </div>

      {/* Google Drive Synced Files Explorer */}
      {googleUser && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Cloud className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Backups Salvos no Google Drive ({recentDriveFiles.length})
              </h3>
            </div>

            <button
              type="button"
              onClick={() => googleToken && loadDriveFiles(googleToken)}
              disabled={isLoadingDriveFiles}
              className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDriveFiles ? 'animate-spin text-blue-600' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {recentDriveFiles.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhum backup encontrado na pasta Google Drive ainda. Clique em "Fazer Backup Agora no Google Drive" para sincronizar a primeira cópia.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="py-2.5 px-3">Ficheiro</th>
                    <th className="py-2.5 px-3">Data no Drive</th>
                    <th className="py-2.5 px-3">Tamanho</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDriveFiles.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-2">
                        <FileJson className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate max-w-xs">{f.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {f.createdTime ? new Date(f.createdTime).toLocaleString('pt-PT') : 'N/D'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">
                        {formatFileSize(f.size ? parseInt(f.size, 10) : undefined)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {f.webViewLink ? (
                          <a
                            href={f.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 hover:underline text-[11px]"
                          >
                            <span>Abrir no Drive</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Local & General Backup History */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-sm text-slate-900">Histórico de Cópias de Segurança Locais & Nuvem</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Últimos registos guardados</span>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Ainda não realizou cópias de segurança nesta sessão. Execute um backup manual ou ative a rotina automática para manter os seus dados protegidos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="py-2.5 px-3">Data e Hora</th>
                  <th className="py-2.5 px-3">Destino</th>
                  <th className="py-2.5 px-3">Dados Gravados</th>
                  <th className="py-2.5 px-3">Tamanho</th>
                  <th className="py-2.5 px-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {item.dateStr}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700">
                        {item.destination === 'google_drive' ? (
                          <>
                            <Cloud className="w-3 h-3 text-blue-600" />
                            <span>Google Drive</span>
                          </>
                        ) : item.destination === 'both' ? (
                          <>
                            <Cloud className="w-3 h-3 text-emerald-600" />
                            <span>Drive + Local</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3 h-3 text-emerald-600" />
                            <span>Download Local</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="font-semibold text-slate-900">{item.totalSales}</span> vendas • <span className="font-semibold text-slate-900">{item.totalProducts}</span> produtos • <span className="font-semibold text-slate-900">{item.totalCustomers}</span> clientes
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {formatFileSize(item.fileSizeBytes)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {item.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Concluído</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-600 text-[11px]" title={item.errorMessage}>
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Falhou</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
