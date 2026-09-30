import React, { useEffect, useState } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { offlineSalesManager, PendingOfflineSale } from '../../services/offlineSalesManager.js';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { useToast } from '../../context/ToastContext.js';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [pendingQueue, setPendingQueue] = useState<PendingOfflineSale[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { success, error, info } = useToast();

  useEffect(() => {
    const unsubscribe = offlineSalesManager.subscribe((queue) => {
      setPendingQueue(queue);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) {
      info('Aguardando restauração da conexão para sincronizar as vendas.');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await offlineSalesManager.syncPendingSales();
      if (result.syncedCount > 0) {
        success(`${result.syncedCount} venda(s) offline sincronizada(s) com sucesso no servidor!`);
      } else if (result.failedCount > 0) {
        error(`Erro ao sincronizar ${result.failedCount} venda(s). Tente novamente.`);
      }
    } catch (e: any) {
      error('Falha ao processar sincronização de vendas.');
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingCount = pendingQueue.length;

  // If online and no pending sales to sync, don't obstruct the UI
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Offline Mode Alert */}
      {!isOnline && (
        <div className="flex items-center gap-2.5 bg-amber-600 text-white px-3.5 py-2 rounded-2xl shadow-xl border border-amber-500/40 text-xs font-semibold backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <WifiOff className="w-3.5 h-3.5" />
          <span>Modo Offline Ativo — Vendas continuam a ser registadas normalmente</span>
        </div>
      )}

      {/* Pending Sync Card */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-3 bg-slate-900/95 border border-slate-700 text-slate-100 px-3.5 py-2 rounded-2xl shadow-2xl backdrop-blur-md text-xs">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-4 h-4 text-emerald-400" />
            <span>
              <strong className="text-emerald-400">{pendingCount}</strong> venda{pendingCount > 1 ? 's' : ''} gravada{pendingCount > 1 ? 's' : ''} offline
            </span>
          </div>

          {isOnline && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-sm shadow-emerald-900/50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'A sincronizar...' : 'Sincronizar'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
