import React, { useEffect, useState, useCallback } from 'react';
import {
  verifyFirebaseConnection,
  FirebaseConnectionStatus,
} from '../lib/firebaseVerifier.js';
import {
  Database,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Server,
  ArrowRight,
  WifiOff
} from 'lucide-react';

interface FirebaseStartupGateProps {
  children: React.ReactNode;
}

export const FirebaseStartupGate: React.FC<FirebaseStartupGateProps> = ({ children }) => {
  const [status, setStatus] = useState<FirebaseConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bypassed, setBypassed] = useState(false);

  const runVerification = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await verifyFirebaseConnection(8000);
      setStatus(res);
      if (res.isReady) {
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    } catch (e: any) {
      setStatus({
        isReady: false,
        firestoreReachable: false,
        authReachable: false,
        error: e?.message || 'Erro inesperado ao verificar ligação ao Firebase',
        details: {
          firestore: 'error',
          auth: 'error',
          databaseId: 'ai-studio-vendafcil-0ba928b2-5a74-4d87-a33f-0fbecff8d27d',
          projectId: 'gen-lang-client-0139354544',
        },
      });
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    runVerification();
  }, [runVerification]);

  // If verified or user explicitly clicked proceed
  if ((status && status.isReady) || bypassed) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 select-none">
        {/* Glow backdrop */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
          {/* Animated Logo / Icon badge */}
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-xl shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Database className="w-8 h-8 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-950 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white mb-1.5">
            A Iniciar VendaFácil
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            A sincronizar e verificar conectividade com o Cloud Firestore e Autenticação...
          </p>

          {/* Micro status steps */}
          <div className="w-full bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 p-3.5 space-y-2.5 text-left text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Base de Dados Firestore</span>
              </div>
              <span className="text-[11px] font-medium text-emerald-400 animate-pulse">A verificar...</span>
            </div>
            <div className="h-px bg-slate-800" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Firebase Authentication</span>
              </div>
              <span className="text-[11px] font-medium text-blue-400 animate-pulse">A sincronizar...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error / Unreachable State
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>

        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mb-2">
          Verificação de Conexão Firebase
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
          {status?.error || 'Não foi possível confirmar a resposta do Firestore ou do serviço de autenticação antes de carregar o sistema.'}
        </p>

        {/* Diagnostic details */}
        <div className="bg-slate-950/70 rounded-2xl border border-slate-800/80 p-4 mb-6 text-left space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              Firestore DB:
            </span>
            <span className={`font-mono font-medium px-2 py-0.5 rounded-md text-[11px] ${
              status?.firestoreReachable ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
            }`}>
              {status?.firestoreReachable ? 'Acessível' : 'Inacessível'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Auth Service:
            </span>
            <span className={`font-mono font-medium px-2 py-0.5 rounded-md text-[11px] ${
              status?.authReachable ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
            }`}>
              {status?.authReachable ? 'Acessível' : 'Inacessível'}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 font-mono break-all">
            DB: {status?.details.databaseId}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={runVerification}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar Novamente</span>
          </button>

          <button
            onClick={() => setBypassed(true)}
            className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer"
            title="Continuar com a aplicação"
          >
            <span>Continuar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
