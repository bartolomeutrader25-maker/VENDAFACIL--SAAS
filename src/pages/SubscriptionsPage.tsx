import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Zap,
  ShieldCheck,
  CreditCard,
  Building2,
  Award,
  Crown,
  Clock,
  PhoneCall,
  Send,
  Copy,
  AlertTriangle
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const SubscriptionsPage: React.FC = () => {
  const { company, user, access, updateCompanyData } = useAuth();
  const { success, error } = useToast();

  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'multicaixa' | 'transferencia'>('multicaixa');
  const [reference, setReference] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutSent, setCheckoutSent] = useState(false);

  const currentPlanId = company?.planId || company?.plan || 'pro';
  const isTrial = access?.isTrial || company?.subscriptionStatus === 'trial' || company?.trialActive;
  const daysRemaining = access?.daysRemaining ?? (
    company?.trialEndDate 
      ? Math.max(0, Math.ceil((new Date(company.trialEndDate).getTime() - Date.now()) / 86400000))
      : 7
  );

  const plans = [
    {
      id: 'basic',
      name: 'Plano Básico',
      price: '5.000 Kz',
      period: 'por mês',
      rawPrice: 5000,
      description: 'Ideal para pequenos comerciantes, quiosques e lojas de bairro.',
      features: [
        'Vendas no telemóvel e PC ilimitadas',
        'Controlo de stock e avisos de rutura',
        'Registo e controlo de fiado/clientes',
        'Fecho e abertura de caixa diário',
        'Até 3 funcionários com acessos restritos',
        'Suporte padrão por email e WhatsApp',
      ],
      popular: false,
    },
    {
      id: 'pro',
      name: 'Plano Profissional',
      price: '10.000 Kz',
      period: 'por mês',
      rawPrice: 10000,
      description: 'Para empresas estruturadas, mercearias, boutiques e lojas com equipa.',
      features: [
        'Tudo do Plano Básico sem limites',
        'IA Gemini Consultora de Negócios 24/7',
        'Até 10 funcionários (caixas, gerentes, repositores)',
        'Fecho de caixa cego (anti-fraude)',
        'Demonstração de Lucro Real e DRE',
        'Leitor de Código de Barras por câmara',
        'Suporte prioritário direto no WhatsApp',
      ],
      popular: true,
    },
    {
      id: 'premium',
      name: 'Empresarial / Redes',
      price: '30.000 Kz',
      period: 'por mês',
      rawPrice: 30000,
      description: 'Para médias e grandes empresas com múltiplos pontos de venda.',
      features: [
        'Tudo do Plano Profissional',
        'Utilizadores e funcionários ilimitados',
        'Múltiplos terminais de caixa simultâneos',
        'Exportação contábil avançada',
        'Gestor de conta VIP dedicado',
        'Treinamento presencial/remoto da equipa',
      ],
      popular: false,
    },
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    success('Copiado para a área de transferência!');
  };

  const handleSendCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForCheckout) return;
    try {
      setIsSubmitting(true);
      await api.checkoutSubscriptionIntent({
        planId: selectedPlanForCheckout.id,
        paymentMethod: paymentMethod === 'multicaixa' ? 'Multicaixa Express' : 'Transferência Bancária (IBAN)',
        reference,
        proofNote
      });
      setCheckoutSent(true);
      success('Comprovativo enviado! A sua conta será ativada pelo administrador.');
    } catch (err: any) {
      error(err.message || 'Erro ao submeter comprovativo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Current Subscription Status Card */}
      <div className={`p-5 sm:p-6 rounded-3xl border ${
        isTrial 
          ? 'bg-amber-500/10 border-amber-500/30 text-slate-900' 
          : 'bg-emerald-500/10 border-emerald-500/30 text-slate-900'
      } flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
            isTrial ? 'bg-amber-500/20 text-amber-700' : 'bg-emerald-500/20 text-emerald-700'
          }`}>
            {isTrial ? <Clock className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Estado Atual da Conta
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                isTrial ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {isTrial ? 'Período de Teste Gratuito' : 'Assinatura Ativa'}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
              Empresa: {company?.name || 'Sua Loja'} &bull; Plano {currentPlanId.toUpperCase()}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {isTrial ? (
                <span>
                  O seu teste gratuito tem <strong className="text-amber-800 font-bold">{daysRemaining} dias restantes</strong>. Todos os dados serão mantidos 100% seguros quando ativar o plano.
                </span>
              ) : (
                <span>Assinatura ativa e em dia. Aproveite todos os recursos operacionais.</span>
              )}
            </p>
          </div>
        </div>

        {isTrial && (
          <button
            onClick={() => setSelectedPlanForCheckout(plans[1])}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ativar Agora (Sem Bloqueios)</span>
          </button>
        )}
      </div>

      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs text-center max-w-2xl mx-auto">
        <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
          Planos Claros & Sem Surpresas
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-3">
          Escolha o Plano Ideal para o seu Comércio
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Pagamento facilitado em Kwanzas. Cancele ou altere a qualquer momento sem burocracia.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((p) => {
          const isCurrent = currentPlanId === p.id && !isTrial;

          return (
            <div
              key={p.id}
              className={`rounded-3xl p-6 transition-all flex flex-col justify-between relative ${
                p.popular
                  ? 'bg-slate-900 text-white shadow-xl ring-2 ring-emerald-500'
                  : 'bg-white text-slate-900 border border-slate-200/80 shadow-2xs'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-md">
                  Recomendado para Negócios
                </span>
              )}

              <div>
                <h3 className="font-black text-lg">{p.name}</h3>
                <p className={`text-xs mt-1 mb-4 ${p.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                  {p.description}
                </p>

                <div className="mb-5">
                  <span className="text-3xl font-extrabold">{p.price}</span>
                  <span className={`text-xs ml-1 ${p.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                    /{p.period}
                  </span>
                </div>

                <div className={`space-y-2.5 pt-4 border-t text-xs ${p.popular ? 'border-slate-800' : 'border-slate-100'}`}>
                  {p.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          p.popular ? 'text-emerald-400' : 'text-emerald-600'
                        }`}
                      />
                      <span className={p.popular ? 'text-slate-300' : 'text-slate-600'}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4">
                <button
                  onClick={() => {
                    setSelectedPlanForCheckout(p);
                    setCheckoutSent(false);
                  }}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${
                    isCurrent
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                      : p.popular
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isCurrent ? 'Plano Ativo' : `Ativar ${p.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Details Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-base text-slate-900">Coordenadas para Pagamento em Angola</h4>
            <p className="text-xs text-slate-500">
              Aceitamos Multicaixa Express e transferências de qualquer banco angolano.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">
              Ativação em até 15 minutos
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 font-medium">Multicaixa Express (Telefones)</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Ativação Rápida</span>
            </div>
            
            <div className="space-y-1.5 my-1">
              <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-xs font-mono font-bold text-slate-900">972 911 640</span>
                <button
                  type="button"
                  onClick={() => handleCopy('972911640')}
                  className="p-1 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-50 transition"
                  title="Copiar 972 911 640"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-xs font-mono font-bold text-slate-900">947 050 586</span>
                <button
                  type="button"
                  onClick={() => handleCopy('947050586')}
                  className="p-1 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-50 transition"
                  title="Copiar 947 050 586"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <span className="text-[10px] text-slate-500 mt-1">Titular: BARTOLOMEU SUNDA CONDE MAVUNGO</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="min-w-0 mr-2">
              <span className="text-slate-500 font-medium">Transferência IBAN</span>
              <p className="text-xs font-mono font-bold text-slate-900 truncate mt-0.5">
                0040 0000 1472 2403 1016 5
              </p>
              <span className="text-[10px] text-slate-400">Titular: BARTOLOMEU SUNDA CONDE MAVUNGO</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('004000001472240310165')}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition shrink-0"
              title="Copiar IBAN"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: CHECKOUT / ATIVAÇÃO */}
      {selectedPlanForCheckout && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Ativação de Assinatura
                </span>
                <h4 className="text-lg font-extrabold text-slate-900">
                  {selectedPlanForCheckout.name} &bull; {selectedPlanForCheckout.price}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanForCheckout(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Direct WhatsApp CTA */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-900">Ativação Rápida pelo WhatsApp</p>
                <p className="text-[11px] text-emerald-700">Envie o comprovativo diretamente ao suporte e ative já.</p>
              </div>
              <a
                href={`https://wa.me/244972911640?text=${encodeURIComponent(
                  `Olá VendaFácil! 👋\n\nQuero ativar o *${selectedPlanForCheckout.name}* para a minha empresa *${company?.name}*.\n\nResponsável: ${user?.name}\nTelefone: ${user?.phone || company?.phone || ''}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Abrir WhatsApp</span>
              </a>
            </div>

            {/* Inline Form */}
            <form onSubmit={handleSendCheckout} className="space-y-4 pt-2">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Ou Notifique na Plataforma:
              </h5>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Método de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="multicaixa">Multicaixa Express (972 911 640 / 947 050 586)</option>
                  <option value="transferencia">Transferência Bancária (0040 0000 1472 2403 1016 5)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nº de Operação ou Referência do Recibo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 09847291 ou ID da transação"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observações adicionais</label>
                <input
                  type="text"
                  placeholder="Ex: Pago pelo telefone 923... titular João"
                  value={proofNote}
                  onChange={e => setProofNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              {checkoutSent ? (
                <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pedido enviado com sucesso! O administrador ativará a conta em minutos.</span>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedPlanForCheckout(null)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'A enviar...' : 'Confirmar Envio'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
