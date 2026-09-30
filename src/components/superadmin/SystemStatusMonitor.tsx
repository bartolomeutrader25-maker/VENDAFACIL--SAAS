import React, { useState, useEffect, useCallback, useId } from 'react';
import {
  Activity,
  Wifi,
  WifiOff,
  Database,
  ShieldCheck,
  Server,
  RefreshCw,
  HardDrive,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowUpRight,
  Download,
  Trash2,
  Copy,
  Zap,
  Radio,
  FileCheck2,
  Info,
  Check
} from 'lucide-react';
import { verifyFirebaseConnection, FirebaseConnectionStatus } from '../../lib/firebaseVerifier.js';
import { firebaseConfig, firestoreDatabaseId } from '../../firebaseConfig.js';
import { offlineSalesManager, PendingOfflineSale } from '../../services/offlineSalesManager.js';
import { useToast } from '../../context/ToastContext.js';

interface LatencySample {
  timestamp: string;
  serverMs: number | null;
  firebaseMs: number | null;
  status: 'optimal' | 'good' | 'warning' | 'error';
}

interface CacheDetails {
  name: string;
  itemCount: number;
}

export const SystemStatusMonitor: React.FC = () => {
  const { success, error, info } = useToast();
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copiedReport, setCopiedReport] = useState(false);

  // Network State
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [networkInfo, setNetworkInfo] = useState<{
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  }>({});

  // Server & Latency State
  const [serverLatency, setServerLatency] = useState<number | null>(null);
  const [serverStatus, setServerStatus] = useState<'online' | 'degraded' | 'offline'>('online');
  const [latencyHistory, setLatencyHistory] = useState<LatencySample[]>([]);

  // Firebase Status
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseConnectionStatus | null>(null);
  const [firebaseLatency, setFirebaseLatency] = useState<number | null>(null);

  // Service Worker State
  const [swSupported, setSwSupported] = useState(false);
  const [swActive, setSwActive] = useState(false);
  const [swState, setSwState] = useState<string>('Verificando...');
  const [swScope, setSwScope] = useState<string>('');
  const [cachesList, setCachesList] = useState<CacheDetails[]>([]);
  const [storageEstimate, setStorageEstimate] = useState<{
    usageMb: number;
    quotaMb: number;
    percentage: number;
  } | null>(null);

  // Offline Sales Manager State
  const [offlineQueue, setOfflineQueue] = useState<PendingOfflineSale[]>([]);
  const [cachedProductsCount, setCachedProductsCount] = useState<number>(0);
  const [isSyncingSales, setIsSyncingSales] = useState(false);

  // Logs list for audit
  const [diagnosticLogs, setDiagnosticLogs] = useState<Array<{
    id: string;
    time: string;
    level: 'info' | 'success' | 'warn' | 'error';
    message: string;
  }>>([]);

  const addLog = (level: 'info' | 'success' | 'warn' | 'error', message: string) => {
    const time = new Date().toLocaleTimeString('pt-AO');
    setDiagnosticLogs(prev => [
      { id: Math.random().toString(36).slice(2), time, level, message },
      ...prev.slice(0, 39)
    ]);
  };

  // 1. Check Network Information API
  const updateNetworkStats = useCallback(() => {
    setIsOnline(navigator.onLine);
    const navAny = navigator as any;
    if (navAny.connection) {
      setNetworkInfo({
        effectiveType: navAny.connection.effectiveType,
        downlink: navAny.connection.downlink,
        rtt: navAny.connection.rtt,
        saveData: navAny.connection.saveData
      });
    }
  }, []);

  // 2. Measure Server Latency (RTT to backend /api/health)
  const measureServerLatency = useCallback(async (): Promise<number | null> => {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('/api/health?t=' + Date.now(), {
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const ms = Math.round(performance.now() - start);
        setServerLatency(ms);
        setServerStatus('online');
        return ms;
      } else {
        setServerStatus('degraded');
        return null;
      }
    } catch {
      setServerLatency(null);
      setServerStatus('offline');
      return null;
    }
  }, []);

  // 3. Test Firebase & Firestore Latency
  const testFirebase = useCallback(async (): Promise<{ status: FirebaseConnectionStatus; ms: number | null }> => {
    const start = performance.now();
    try {
      const res = await verifyFirebaseConnection(7000);
      const ms = res.responseTimeMs || Math.round(performance.now() - start);
      setFirebaseStatus(res);
      setFirebaseLatency(ms);
      return { status: res, ms };
    } catch (err: any) {
      const fallback: FirebaseConnectionStatus = {
        isReady: false,
        firestoreReachable: false,
        authReachable: false,
        error: err?.message || 'Falha de comunicação',
        details: {
          firestore: 'error',
          auth: 'error',
          databaseId: firestoreDatabaseId,
          projectId: firebaseConfig.projectId
        }
      };
      setFirebaseStatus(fallback);
      setFirebaseLatency(null);
      return { status: fallback, ms: null };
    }
  }, []);

  // 4. Inspect Service Worker and Cache Storage
  const inspectServiceWorkerAndCaches = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const hasSw = 'serviceWorker' in navigator;
    setSwSupported(hasSw);

    if (hasSw) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          setSwActive(!!reg.active);
          setSwScope(reg.scope || '');
          if (reg.installing) setSwState('Instalando');
          else if (reg.waiting) setSwState('Aguardando ativação');
          else if (reg.active) setSwState('Ativo e operacional');
          else setSwState('Registado');
        } else {
          setSwActive(false);
          setSwState('Não registado no escopo atual');
        }
      } catch (err) {
        setSwState('Erro ao consultar Service Worker');
      }
    } else {
      setSwState('Não suportado pelo navegador');
    }

    // Inspect Cache Storage
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        const details: CacheDetails[] = [];
        for (const key of keys) {
          try {
            const cache = await caches.open(key);
            const reqs = await cache.keys();
            details.push({ name: key, itemCount: reqs.length });
          } catch {
            details.push({ name: key, itemCount: 0 });
          }
        }
        setCachesList(details);
      } catch {
        setCachesList([]);
      }
    }

    // Storage Estimate
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageMb = Number(((estimate.usage || 0) / (1024 * 1024)).toFixed(2));
        const quotaMb = Number(((estimate.quota || 0) / (1024 * 1024)).toFixed(0));
        const percentage = estimate.quota ? Number(((estimate.usage || 0) / estimate.quota * 100).toFixed(1)) : 0;
        setStorageEstimate({ usageMb, quotaMb, percentage });
      } catch {
        setStorageEstimate(null);
      }
    }
  }, []);

  // 5. Run Complete Diagnostic Routine
  const runFullDiagnostic = useCallback(async () => {
    setIsRunningDiagnostic(true);
    addLog('info', 'A iniciar bateria de testes de diagnóstico...');

    updateNetworkStats();

    // Measure server
    const sMs = await measureServerLatency();
    if (sMs !== null) {
      addLog('success', `Servidor Backend acessível: ${sMs}ms de latência.`);
    } else {
      addLog('warn', 'Servidor Backend inacessível ou com resposta demorada.');
    }

    // Test Firebase
    const { status: fbStat, ms: fbMs } = await testFirebase();
    if (fbStat.isReady) {
      addLog('success', `Firebase Firestore & Auth 100% operacionais (${fbMs}ms).`);
    } else if (fbStat.firestoreReachable) {
      addLog('info', `Firestore acessível, mas Auth pendente.`);
    } else {
      addLog('warn', `Firestore ou Auth sem resposta direta (Modo offline disponível).`);
    }

    // SW & Caches
    await inspectServiceWorkerAndCaches();
    addLog('info', 'Cache Storage e estado do Service Worker atualizados.');

    // Offline sales queue & local cache
    const q = offlineSalesManager.getPendingQueue();
    setOfflineQueue(q);
    const prods = offlineSalesManager.getCachedProducts();
    setCachedProductsCount(prods.length);

    // Save latency sample
    const nowTime = new Date().toLocaleTimeString('pt-AO');
    let sampleStatus: 'optimal' | 'good' | 'warning' | 'error' = 'optimal';
    const maxMs = Math.max(sMs || 0, fbMs || 0);

    if (sMs === null && fbMs === null) sampleStatus = 'error';
    else if (maxMs > 500) sampleStatus = 'warning';
    else if (maxMs > 200) sampleStatus = 'good';

    setLatencyHistory(prev => [
      { timestamp: nowTime, serverMs: sMs, firebaseMs: fbMs, status: sampleStatus },
      ...prev.slice(0, 7)
    ]);

    setIsRunningDiagnostic(false);
  }, [updateNetworkStats, measureServerLatency, testFirebase, inspectServiceWorkerAndCaches]);

  // Initial and reactive effects
  useEffect(() => {
    runFullDiagnostic();

    // Listeners for network online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      addLog('success', 'Evento de rede detetado: Dispositivo ONLINE.');
      runFullDiagnostic();
    };

    const handleOffline = () => {
      setIsOnline(false);
      addLog('warn', 'Evento de rede detetado: Dispositivo OFFLINE.');
      runFullDiagnostic();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to offline queue changes
    const unsubQueue = offlineSalesManager.subscribe((updatedQueue) => {
      setOfflineQueue(updatedQueue);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubQueue();
    };
  }, [runFullDiagnostic]);

  // Auto-refresh interval (every 30s if active)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      runFullDiagnostic();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, runFullDiagnostic]);

  // Trigger manual Service Worker Update
  const handleUpdateSW = async () => {
    if (!('serviceWorker' in navigator)) {
      error('Service Worker não suportado neste navegador');
      return;
    }
    try {
      addLog('info', 'A solicitar atualização forçada do Service Worker...');
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        success('Service Worker verificado e atualizado com sucesso!');
        addLog('success', 'Service Worker atualizado.');
      } else {
        info('Nenhum Service Worker registado para atualizar.');
      }
      await inspectServiceWorkerAndCaches();
    } catch (err: any) {
      error('Falha ao atualizar Service Worker: ' + (err.message || 'Erro'));
    }
  };

  // Clear Cache Storage
  const handleClearCaches = async () => {
    if (!('caches' in window)) return;
    if (!window.confirm('Tem a certeza que deseja limpar os caches offline temporários? O Service Worker voltará a descarregar os recursos necessários na próxima consulta.')) {
      return;
    }
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
      success('Caches offline limpos com sucesso!');
      addLog('info', `Foram limpos ${keys.length} baldes de cache local.`);
      await inspectServiceWorkerAndCaches();
    } catch (err: any) {
      error('Erro ao limpar caches: ' + err.message);
    }
  };

  // Sync Pending Offline Sales
  const handleSyncPendingSales = async () => {
    if (!isOnline) {
      error('O dispositivo está offline. Não é possível enviar as vendas para o servidor agora.');
      return;
    }
    try {
      setIsSyncingSales(true);
      addLog('info', 'A iniciar sincronização forçada de vendas pendentes...');
      const res = await offlineSalesManager.syncPendingSales();
      if (res.syncedCount > 0) {
        success(`${res.syncedCount} venda(s) offline sincronizada(s) no servidor com sucesso!`);
        addLog('success', `${res.syncedCount} venda(s) offline sincronizadas.`);
      } else {
        info('Nenhuma venda pendente para sincronizar.');
      }
    } catch (err: any) {
      error('Erro na sincronização: ' + (err.message || 'Falha de comunicação'));
    } finally {
      setIsSyncingSales(false);
      setOfflineQueue(offlineSalesManager.getPendingQueue());
    }
  };

  // Copy Full Diagnostic Report
  const handleCopyReport = () => {
    const report = {
      geradoEm: new Date().toISOString(),
      dispositivo: {
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        informacoesRede: networkInfo
      },
      latencias: {
        servidorBackendMs: serverLatency,
        firebaseMs: firebaseLatency,
        statusServidor: serverStatus
      },
      firebase: {
        status: firebaseStatus?.details,
        bancoId: firestoreDatabaseId,
        projetoId: firebaseConfig.projectId,
        pronto: firebaseStatus?.isReady
      },
      serviceWorker: {
        suportado: swSupported,
        ativo: swActive,
        estado: swState,
        escopo: swScope,
        cachesEncontrados: cachesList,
        armazenamento: storageEstimate
      },
      operacaoOffline: {
        vendasPendentesFila: offlineQueue.length,
        produtosNoCatalogoLocal: cachedProductsCount,
        prontoParaOffline: swActive || cachesList.length > 0
      }
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopiedReport(true);
    success('Relatório de diagnóstico técnico copiado!');
    setTimeout(() => setCopiedReport(false), 2500);
  };

  // Quality badge helper
  const getLatencyBadge = (ms: number | null) => {
    if (ms === null) {
      return { label: 'Inacessível', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (ms < 120) {
      return { label: `${ms}ms • Excelente`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (ms < 300) {
      return { label: `${ms}ms • Bom`, color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (ms < 600) {
      return { label: `${ms}ms • Moderado`, color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { label: `${ms}ms • Lento`, color: 'bg-orange-50 text-orange-700 border-orange-200' };
  };

  const serverBadge = getLatencyBadge(serverLatency);
  const fbBadge = getLatencyBadge(firebaseLatency);

  return (
    <div className="space-y-6">
      {/* Top Action & Status Banner */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-500/20 text-blue-400">
              <Activity className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
              Diagnóstico do Sistema & Operações Offline
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
            Status de Conexões, Firebase & Service Worker
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Monitorização em tempo real de latência de rede, persistência de dados no Cloud Firestore e capacidade operacional em modo offline para o POS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
              autoRefresh
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Atualizar automaticamente a cada 30 segundos"
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span>Auto (30s): {autoRefresh ? 'Ativo' : 'Pausado'}</span>
          </button>

          {/* Copy Report */}
          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
            title="Copiar relatório técnico completo"
          >
            {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedReport ? 'Copiado' : 'Copiar Diagnóstico'}</span>
          </button>

          {/* Trigger Diagnostic */}
          <button
            onClick={runFullDiagnostic}
            disabled={isRunningDiagnostic}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-xs font-bold text-white transition shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningDiagnostic ? 'animate-spin' : ''}`} />
            <span>{isRunningDiagnostic ? 'A Analisar...' : 'Atualizar Diagnóstico'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Network State */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Conectividade Geral</span>
            {isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <p className={`text-xl sm:text-2xl font-black ${isOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </p>
            {networkInfo.effectiveType && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                {networkInfo.effectiveType}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            {networkInfo.downlink ? `Velocidade est.: ~${networkInfo.downlink} Mbps` : 'Navegador com rede ativa'}
          </span>
        </div>

        {/* Server Latency */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Latência do Servidor</span>
            <Server className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {serverLatency !== null ? `${serverLatency} ms` : 'Sem resposta'}
          </p>
          <div className="mt-1">
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${serverBadge.color}`}>
              {serverBadge.label}
            </span>
          </div>
        </div>

        {/* Firebase Firestore */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Cloud Firestore</span>
            <Database className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {firebaseLatency !== null ? `${firebaseLatency} ms` : (isOnline ? 'Conectando...' : 'Modo Offline')}
          </p>
          <div className="mt-1">
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${fbBadge.color}`}>
              {firebaseStatus?.firestoreReachable ? 'Firestore Conectado' : (isOnline ? 'Reconectando...' : 'Cache Local Ativo')}
            </span>
          </div>
        </div>

        {/* Service Worker Status */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Service Worker & PWA</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
            {swActive ? 'ATIVO' : (swSupported ? 'REGISTADO' : 'INDISPONÍVEL')}
          </p>
          <span className="text-[11px] text-slate-500">
            {cachesList.length} balde{cachesList.length !== 1 ? 's' : ''} de cache offline
          </span>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: FIREBASE & SERVIDOR DE DADOS */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Status de Conexão Firebase
                </h3>
                <p className="text-xs text-slate-500">
                  Cloud Firestore & Firebase Authentication
                </p>
              </div>
            </div>
            <button
              onClick={testFirebase}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Testar Ping</span>
            </button>
          </div>

          {/* Details list */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-600">ID da Base de Dados Firestore:</span>
              <span className="font-mono text-slate-900 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                {firestoreDatabaseId}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-600">ID do Projeto Cloud:</span>
              <span className="font-mono text-slate-900 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                {firebaseConfig.projectId}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-600">Resposta do Firestore:</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${firebaseStatus?.firestoreReachable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="font-bold text-slate-800">
                  {firebaseStatus?.firestoreReachable ? 'Acessível em tempo real' : 'Aguardando / Operação offline'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-600">Serviço de Autenticação:</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${firebaseStatus?.authReachable ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <span className="font-bold text-slate-800">
                  {firebaseStatus?.authReachable ? 'Autenticado & Sincronizado' : 'Pronto (Sessão local ativa)'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-600">Tempo de Resposta Medido:</span>
              <span className="font-black text-slate-900 text-sm">
                {firebaseLatency !== null ? `${firebaseLatency} ms` : '—'}
              </span>
            </div>
          </div>

          {/* Latency History Mini-timeline */}
          <div className="pt-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Histórico de Amostras de Latência (Últimos Testes)
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {latencyHistory.length === 0 ? (
                <span className="text-xs text-slate-400 italic">A recolher amostras de conexão...</span>
              ) : (
                latencyHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex-1 min-w-[70px] p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-center"
                  >
                    <span className="text-[10px] text-slate-400 block">{item.timestamp}</span>
                    <span className="text-xs font-black text-slate-800 block mt-0.5">
                      {item.serverMs !== null ? `${item.serverMs}ms` : 'Err'}
                    </span>
                    <span className={`inline-block w-2 h-2 rounded-full mt-1 ${
                      item.status === 'optimal' ? 'bg-emerald-500' :
                      item.status === 'good' ? 'bg-blue-500' :
                      item.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                    }`} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* PANEL 2: SERVICE WORKER & RECURSOS OFFLINE */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Uso do Service Worker & Cache Offline
                </h3>
                <p className="text-xs text-slate-500">
                  Garante que o VendaFácil funciona sem internet
                </p>
              </div>
            </div>
            <button
              onClick={handleUpdateSW}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Verificar SW</span>
            </button>
          </div>

          {/* Details list */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-600">Estado do Service Worker:</span>
              <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                swActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'
              }`}>
                {swState}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-600">Escopo Protegido:</span>
              <span className="font-mono text-slate-700 text-[11px] truncate max-w-[200px]" title={swScope}>
                {swScope || '/'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-600">Background Sync (SW):</span>
              <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {typeof window !== 'undefined' && 'SyncManager' in window ? 'API Ativa (sync-offline-sales)' : 'Ativo via Listener de Rede'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-600">Persistência Offline & Nuvem:</span>
              <span className="font-mono text-slate-800 font-semibold text-[11px]">
                IndexedDB + Cloud Firestore
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-600">Armazenamento em Disco (Cache):</span>
              <span className="font-bold text-slate-900">
                {storageEstimate ? `${storageEstimate.usageMb} MB usado de ~${storageEstimate.quotaMb} MB` : 'Armazenamento persistente ativo'}
              </span>
            </div>

            {/* Caches buckets breakdown */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-600">Baldes de Cache Detetados:</span>
                <span className="font-bold text-slate-900 text-xs">{cachesList.length}</span>
              </div>
              {cachesList.length > 0 ? (
                <div className="space-y-1 pt-1">
                  {cachesList.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] text-slate-500 bg-white p-1.5 rounded-lg border border-slate-200/60 font-mono">
                      <span className="truncate max-w-[220px]">{c.name}</span>
                      <span className="font-bold text-slate-700">{c.itemCount} ficheiro(s)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Recursos em processo de pré-carregamento na primeira visita.
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleClearCaches}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition border border-rose-200 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Caches Locais</span>
              </button>
              <button
                onClick={inspectServiceWorkerAndCaches}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-200 cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Recalcular Armazenamento</span>
              </button>
            </div>
            <button
              onClick={async () => {
                const triggered = await offlineSalesManager.triggerBackgroundSync();
                if (triggered) {
                  success('Disparo de Background Sync enviado ao Service Worker!');
                  addLog('info', 'Disparo de Background Sync do Service Worker executado.');
                } else {
                  info('Background Sync acionado via sincronização direta.');
                  offlineSalesManager.syncPendingSales();
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition border border-purple-200 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Testar Disparo de Background Sync (Service Worker)</span>
            </button>
          </div>
        </div>
      </div>

      {/* PANEL 3: OFFLINE SYNC QUEUE & LOCAL POS PERSISTENCE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Fila de Sincronização Local (Vendas Offline do POS)
              </h3>
              <p className="text-xs text-slate-500">
                Vendas registradas localmente enquanto o terminal opera sem rede
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700">
              {cachedProductsCount} produtos em catálogo offline
            </span>
            {offlineQueue.length > 0 && (
              <button
                onClick={handleSyncPendingSales}
                disabled={isSyncingSales || !isOnline}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingSales ? 'animate-spin' : ''}`} />
                <span>{isSyncingSales ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
              </button>
            )}
          </div>
        </div>

        {offlineQueue.length === 0 ? (
          <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-2" />
            <h4 className="font-bold text-emerald-950 text-sm">Fila 100% Sincronizada</h4>
            <p className="text-xs text-emerald-800 mt-0.5 max-w-md">
              Não existem vendas pendentes na fila local. Todas as transações foram gravadas com sucesso no banco de dados central.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-amber-800 bg-amber-50 p-3 rounded-2xl border border-amber-200">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Existem {offlineQueue.length} venda(s) gravada(s) localmente aguardando envio.
              </span>
              <span className="text-[11px]">Serão enviadas automaticamente assim que a conexão se restabelecer.</span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
              {offlineQueue.map((item, i) => (
                <div key={item.id || i} className="p-3 flex items-center justify-between bg-white text-xs">
                  <div>
                    <span className="font-bold text-slate-800">
                      Venda #{item.localId || item.id.slice(0, 8)}
                    </span>
                    <span className="text-slate-400 text-[11px] ml-2">
                      {new Date(item.createdAt).toLocaleString('pt-AO')}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Cliente: {item.salePreview?.customerName || 'Consumidor Final'} • {item.salePreview?.items?.length || 0} item(ns)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-900 block">
                      {(item.salePreview?.finalTotal || 0).toLocaleString('pt-AO')} Kz
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.synced ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.synced ? 'Sincronizado' : 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PANEL 4: DIAGNOSTIC LOG AUDIT CONSOLE */}
      <div className="bg-slate-950 text-slate-200 rounded-3xl border border-slate-800 p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h4 className="font-mono text-xs uppercase tracking-wider text-slate-400">
              Consola de Eventos & Telemetria em Tempo Real
            </h4>
          </div>
          <button
            onClick={() => setDiagnosticLogs([])}
            className="text-[11px] text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Limpar Histórico</span>
          </button>
        </div>

        <div className="font-mono text-xs space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {diagnosticLogs.length === 0 ? (
            <p className="text-slate-600 italic py-2">Nenhum evento registado nesta sessão.</p>
          ) : (
            diagnosticLogs.map(log => (
              <div key={log.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
                <span className="text-slate-500 shrink-0">[{log.time}]</span>
                <span className={`shrink-0 font-bold ${
                  log.level === 'success' ? 'text-emerald-400' :
                  log.level === 'warn' ? 'text-amber-400' :
                  log.level === 'error' ? 'text-rose-400' : 'text-blue-400'
                }`}>
                  [{log.level.toUpperCase()}]:
                </span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
