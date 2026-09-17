import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  CreditCard,
  CheckCircle2,
  Package,
  TrendingDown,
  Clock,
  ArrowRight
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const NotificationsPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { company } = useAuth();
  const { success } = useToast();

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const curr = company?.currency || 'Kz';

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const [prods, recs] = await Promise.all([
        api.getProducts(),
        api.getReceivables(),
      ]);

      const lowStockAlerts = prods
        .filter((p) => p.stockQuantity <= p.minStock)
        .map((p) => ({
          id: `stock-${p.id}`,
          type: 'stock',
          title: `Stock Crítico: ${p.name}`,
          description: `Apenas ${p.stockQuantity} unidades restantes (Mínimo: ${p.minStock}). Necessária reposição.`,
          date: new Date().toISOString(),
          actionPage: 'stock',
          severity: p.stockQuantity <= 0 ? 'high' : 'medium',
        }));

      const pendingRecAlerts = recs
        .filter((r) => r.status !== 'pago')
        .map((r) => ({
          id: `fiado-${r.id}`,
          type: 'fiado',
          title: `Conta Fiado Pendente: ${r.customerName}`,
          description: `Valor pendente de ${(r.totalAmount - r.paidAmount).toLocaleString('pt-PT')} ${curr}. Venda #${r.saleNumber}.`,
          date: r.createdAt,
          actionPage: 'fiado',
          severity: 'medium',
        }));

      setAlerts([...lowStockAlerts, ...pendingRecAlerts]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Central de Alertas & Notificações
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Avisos automáticos de rotura de stock e cobranças pendentes
          </p>
        </div>

        <button
          onClick={() => {
            setAlerts([]);
            success('Todas as notificações foram marcadas como lidas');
          }}
          className="text-xs font-bold text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          Marcar como lidas
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            onClick={() => onNavigate(alert.actionPage)}
            className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  alert.type === 'stock'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {alert.type === 'stock' ? <Package className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900">{alert.title}</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{alert.description}</p>
                <span className="text-[10px] text-slate-400 mt-2 block flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(alert.date).toLocaleDateString('pt-PT')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 shrink-0">
              <span>Resolver</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-bold text-slate-900">Tudo em dia!</h3>
            <p className="text-xs text-slate-400 mt-1">Nenhum alerta de stock ou pendência crítica no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};
