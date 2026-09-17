import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Clock, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';

interface TrialBannerProps {
  onUpgradeClick?: () => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ onUpgradeClick }) => {
  const { company, access, user } = useAuth();

  // Don't show to super admin unless testing tenant
  if (user?.isSuperAdmin && !company?.trialActive) return null;

  const isTrial = access?.isTrial || company?.subscriptionStatus === 'trial' || company?.trialActive;
  if (!isTrial) return null;

  const daysRemaining = access?.daysRemaining !== undefined 
    ? access.daysRemaining 
    : company?.trialEndDate 
      ? Math.max(0, Math.ceil((new Date(company.trialEndDate).getTime() - Date.now()) / 86400000))
      : 7;

  const endDateStr = company?.trialEndDate
    ? new Date(company.trialEndDate).toLocaleDateString('pt-PT')
    : 'breve';

  const isUrgent = daysRemaining <= 2;

  return (
    <div className={`w-full px-4 py-2 border-b text-xs flex flex-wrap items-center justify-between gap-2 transition-all ${
      isUrgent
        ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
        : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-200'
    }`}>
      <div className="flex items-center gap-2">
        {isUrgent ? (
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
        ) : (
          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
        )}
        <span>
          <strong className="font-semibold">Conta em Período de Teste Gratuito:</strong>{' '}
          {daysRemaining > 1 ? (
            <span>Restam <strong className="underline decoration-amber-400 font-bold">{daysRemaining} dias</strong> (até {endDateStr}).</span>
          ) : daysRemaining === 1 ? (
            <span className="text-amber-300 font-bold">Último dia de teste hoje!</span>
          ) : (
            <span className="text-red-300 font-bold">O seu teste termina hoje.</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUpgradeClick}
          className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition text-xs shadow-sm ${
            isUrgent
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ativar Assinatura Definitiva</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
