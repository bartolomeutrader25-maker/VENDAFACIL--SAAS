import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  CloudUpload,
  Database,
  Layers,
  ChevronDown,
  Clock,
  Sparkles,
  X
} from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { offlineSalesManager, PendingOfflineSale } from '../../services/offlineSalesManager.js';
import { testFirestoreConnection } from '../../firebaseConfig.js';
import { useToast } from '../../context/ToastContext.js';

interface GlobalSyncStatusProps {
  /** If true, displays compact version suitable for navigation headers */
  compact?: boolean;
}

export const GlobalSyncStatus: React.FC<GlobalSyncStatusProps> = ({ compact = true }) => {
  const isOnline = useOnlineStatus();
  const { success, error, info } = useToast();

  const [isSyncing, setIsSyncing] = useState(offlineSalesManager.getIsSyncing());
  const [pendingQueue, setPendingQueue] = useState<PendingOfflineSale[]>(offlineSalesManager.getPendingQueue());
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(offlineSalesManager.getLastSyncTime());
  const [cachedProductsCount, setCachedProductsCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [firestoreReachable, setFirestoreReachable] = useState<boolean | null>(null);
  const [dismissOfflineAlert, setDismissOfflineAlert] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Subscribe to offline sales queue and sync state changes
  useEffect(() => {
    const unsubQueue = offlineSalesManager.subscribe((queue) => {
      setPendingQueue(queue);
    });

    const unsubSync = offlineSalesManager.subscribeSync((syncing) => {
      setIsSyncing(syncing);
      setLastSyncTime(offlineSalesManager.getLastSyncTime());
    });

    setCachedProductsCount(offlineSalesManager.getCachedProducts().length);

    return () => {
      unsubQueue();
      unsubSync();
    };
  }, []);

  // When connection drops or recovers, update alert visibility
  useEffect(() => {
    if (!isOnline) {
      setDismissOfflineAlert(false);
    }
  }, [isOnline]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Trigger manual sync
  const handleManualSync = async () => {
    if (!isOnline) {
      info('Aguardando restauração da conexão de rede para sincronizar.');
      return;
    }

    try {
      const res = await offlineSalesManager.syncPendingSales();
      if (res.syncedCount > 0) {
        success(`${res.syncedCount} venda(s) offline sincronizada(s) com sucesso na nuvem!`);
      } else if (res.failedCount > 0) {
        error(`Erro ao sincronizar ${res.failedCount} venda(s). Tente novamente.`);
      } else {
        info('Todas as transações já se encontram sincronizadas.');
      }
    } catch {
      error('Falha temporária ao sincronizar com o servidor.');
    }
  };

  // Test Cloud Firestore connection
  const handleCheckConnection = async () => {
    setIsTestingConnection(true);
    try {
      const ok = await testFirestoreConnection();
      setFirestoreReachable(ok);
      if (ok) {
        success('Conexão ao Cloud Firestore ativa e respondendo!');
      } else {
        error('Cloud Firestore inacessível no momento.');
      }
    } catch {
      setFirestoreReachable(false);
      error('Erro ao verificar conexão com o Firestore.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const pendingCount = pendingQueue.length;

  // Determine current visual state
  type AppSyncState = 'syncing' | 'offline' | 'online';
  const currentState: AppSyncState = isSyncing
    ? 'syncing'
    : !isOnline
    ? 'offline'
    : 'online';

  const formatLastSync = (iso: string | null) => {
    if (!iso) return 'Nenhuma nesta sessão';
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Recentemente';
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* TRIGGER BADGE / PILL */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs select-none cursor-pointer active:scale-95 ${
          currentState === 'syncing'
            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 ring-2 ring-blue-400/20'
            : currentState === 'offline'
            ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 ring-2 ring-amber-400/30'
            : pendingCount > 0
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
        }`}
        title="Clique para ver o status detalhado da conexão e sincronização"
      >
        {currentState === 'syncing' ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span className="hidden sm:inline">A Sincronizar...</span>
            <span className="sm:hidden">Sincronizando</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-black">
                {pendingCount}
              </span>
            )}
          </>
        ) : currentState === 'offline' ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-extrabold text-amber-800">Offline</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-black">
                {pendingCount}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline text-slate-800">Online</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black" title="Vendas pendentes de envio">
                {pendingCount}
              </span>
            )}
          </>
        )}

        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* DROPDOWN / POPOVER CARD */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-3xl shadow-2xl border border-slate-200/90 z-50 p-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${
                currentState === 'syncing' ? 'bg-blue-100 text-blue-700' :
                currentState === 'offline' ? 'bg-amber-100 text-amber-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {currentState === 'syncing' ? <RefreshCw className="w-4 h-4 animate-spin" /> :
                 currentState === 'offline' ? <WifiOff className="w-4 h-4" /> :
                 <Wifi className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Status de Conectividade
                </h4>
                <p className="text-sm font-extrabold text-slate-900">
                  {currentState === 'syncing' ? 'A Sincronizar com a Nuvem' :
                   currentState === 'offline' ? 'Operação em Modo Offline' :
                   'Ligado & Sincronizado'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Explanation */}
          <div className="py-3">
            {currentState === 'offline' ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Sem ligação à internet no momento
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  O VendaFácil continua a funcionar normalmente. O POS guarda todas as vendas no dispositivo e enviará automaticamente assim que a rede voltar.
                </p>
              </div>
            ) : currentState === 'syncing' ? (
              <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-2xl text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                  Sincronização em curso...
                </p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  A gravar vendas e registos locais na base de dados central do Cloud Firestore.
                </p>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-2xl text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Conexão à Nuvem 100% Operacional
                </p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Todas as vendas, faturas e alterações de stock são salvas instantaneamente no servidor.
                </p>
              </div>
            )}
          </div>

          {/* Metrics breakdown */}
          <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <CloudUpload className="w-3.5 h-3.5 text-slate-400" />
                Vendas pendentes na fila:
              </span>
              <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                pendingCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
              }`}>
                {pendingCount} {pendingCount === 1 ? 'venda' : 'vendas'}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                Catálogo local (POS):
              </span>
              <span className="font-bold text-slate-800">
                {cachedProductsCount} produtos em cache
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Última sincronização:
              </span>
              <span className="font-bold text-slate-800 font-mono text-[11px]">
                {formatLastSync(lastSyncTime)}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                Background Sync SW:
              </span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                Ativo (Automático)
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-500" />
                Destino Nuvem:
              </span>
              <span className="font-bold text-slate-700 text-[10px] font-mono">
                Cloud Firestore
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            {pendingCount > 0 && isOnline ? (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'A Sincronizar...' : 'Sincronizar Vendas'}</span>
              </button>
            ) : (
              <button
                onClick={handleCheckConnection}
                disabled={isTestingConnection}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 px-3 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                <span>{isTestingConnection ? 'Verificando...' : 'Testar Conexão'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* PERSISTENT FLOATING BANNER (Quando em modo Offline) */}
      {!isOnline && !dismissOfflineAlert && (
        <div className="fixed bottom-4 left-4 z-40 max-w-sm w-[calc(100vw-2rem)] bg-slate-900/95 border border-amber-500/50 text-white p-3.5 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  Modo Offline Ativo
                </span>
                <button
                  onClick={() => setDismissOfflineAlert(true)}
                  className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                  title="Fechar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Pode continuar a vender normalmente no POS. As vendas são salvas localmente e sincronizadas assim que a internet voltar.
              </p>
              {pendingCount > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-800/60">
                  <CloudUpload className="w-3 h-3 text-amber-400" />
                  <span>{pendingCount} venda{pendingCount > 1 ? 's' : ''} gravada{pendingCount > 1 ? 's' : ''} offline</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SYNCING FLOATING TOAST (Quando está a sincronizar ativamente) */}
      {isSyncing && (
        <div className="fixed bottom-4 left-4 z-40 bg-slate-950/95 border border-blue-500/60 text-white px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
          <div>
            <p className="font-bold text-blue-300">A Sincronizar com o Servidor...</p>
            <p className="text-[10px] text-slate-400">Gravando transações pendentes no Firestore</p>
          </div>
        </div>
      )}
    </div>
  );
};
