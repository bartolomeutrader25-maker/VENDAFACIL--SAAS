import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../lib/api.js';
import { 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  Copy, 
  PhoneCall, 
  Clock, 
  LogOut, 
  RefreshCw,
  AlertTriangle,
  Building2,
  ChevronRight
} from 'lucide-react';

export const BlockedAccountScreen: React.FC = () => {
  const { company, user, logout, refreshAuth } = useAuth();
  const { success, error } = useToast();

  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | 'premium'>('pro');
  const [paymentMethod, setPaymentMethod] = useState<'multicaixa' | 'transferencia'>('multicaixa');
  const [reference, setReference] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const basicPrice = 5000;
  const proPrice = 10000;
  const premiumPrice = 30000;
  const chosenPrice = selectedPlan === 'basic' ? basicPrice : selectedPlan === 'premium' ? premiumPrice : proPrice;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    success('Copiado para a área de transferência!');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSendProof = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.checkoutSubscriptionIntent({
        planId: selectedPlan,
        paymentMethod: paymentMethod === 'multicaixa' ? 'Multicaixa Express' : 'Transferência Bancária (IBAN)',
        reference,
        proofNote
      });
      setSubmittedSuccess(true);
      success('Pedido de ativação enviado com sucesso! O administrador ativará a sua conta em minutos.');
    } catch (err: any) {
      error(err.message || 'Erro ao enviar comprovativo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const planNameFormatted = selectedPlan === 'basic' 
    ? 'Básico (Kz 5.000/mês)' 
    : selectedPlan === 'premium' 
    ? 'Empresarial / Redes (Kz 30.000/mês)' 
    : 'Profissional (Kz 10.000/mês)';

  const whatsappMessage = encodeURIComponent(
    `Olá equipe VendaFácil! 👋\n\nO período de teste da minha empresa *${company?.name || 'Minha Loja'}* terminou e desejo ativar o *Plano ${planNameFormatted}*.\n\nResponsável: ${user?.name}\nTelefone: ${user?.phone || company?.phone || 'N/A'}\nEmail: ${user?.email}`
  );

  const adminPhone = '244972911640';
  const whatsappUrl = `https://wa.me/${adminPhone}?text=${whatsappMessage}`;

  return (
    <div id="blocked-account-screen" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8">
      {/* Top Bar */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            VF
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">VendaFácil SaaS</h1>
            <p className="text-xs text-slate-400">Plataforma de Gestão Comercial</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshAuth()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
            title="Verificar se já foi ativado"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Verificar Ativação</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full my-auto py-8">
        {/* Status Card Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 shadow-lg shadow-amber-500/5">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-3">
            <Clock className="w-3.5 h-3.5" />
            Período de Teste Gratuito Terminado
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
            O teste gratuito da empresa <span className="text-emerald-400">{company?.name || 'sua empresa'}</span> chegou ao fim
          </h2>

          <p className="text-slate-400 text-sm md:text-base">
            Para continuar a emitir vendas, cadastrar produtos e gerir o seu negócio sem interrupções,
            escolha um dos planos e ative a sua assinatura.
          </p>
        </div>

        {/* Data Protection Guarantee Box */}
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 md:p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-emerald-200">
              Os seus dados estão 100% seguros e guardados connosco!
            </h4>
            <p className="text-xs text-emerald-300/80 leading-relaxed mt-0.5">
              Nenhuma informação foi apagada. Todos os seus produtos, histórico de vendas, clientes, dívidas (fiado)
              e registos de caixa estão preservados. Assim que o pagamento for validado, tudo continuará exatamente de onde parou.
            </p>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Plano Básico */}
          <div 
            onClick={() => setSelectedPlan('basic')}
            className={`cursor-pointer rounded-2xl p-6 border transition relative ${
              selectedPlan === 'basic' 
                ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl' 
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Plano Básico</span>
              {selectedPlan === 'basic' && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selecionado
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-extrabold text-white">Kz 5.000</span>
              <span className="text-xs text-slate-400">/ mês</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Ideal para pequenos comerciantes, lojas de bairro e quiosques.</p>

            <ul className="space-y-2 text-xs text-slate-300 mb-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Vendas no telemóvel e computador ilimitadas</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Controlo de stock e alertas automáticos</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Gestão de fiado e clientes devedores</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Fecho diário e controlo de caixa</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Até 3 funcionários com acessos restritos</span>
              </li>
            </ul>

            <button 
              type="button"
              className={`w-full py-2.5 rounded-xl text-xs font-semibold transition ${
                selectedPlan === 'basic'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {selectedPlan === 'basic' ? 'Plano Ativo na Escolha' : 'Escolher Básico'}
            </button>
          </div>

          {/* Plano Profissional (Recomendado) */}
          <div 
            onClick={() => setSelectedPlan('pro')}
            className={`cursor-pointer rounded-2xl p-6 border transition relative ${
              selectedPlan === 'pro' 
                ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl' 
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="absolute -top-3 right-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md">
              Mais Escolhido
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Plano Profissional
              </span>
              {selectedPlan === 'pro' && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selecionado
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-extrabold text-white">Kz 10.000</span>
              <span className="text-xs text-slate-400">/ mês</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Para negócios estruturados, com equipa e múltiplos operadores.</p>

            <ul className="space-y-2 text-xs text-slate-300 mb-4">
              <li className="flex items-center gap-2 font-medium text-emerald-300">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>IA Consultora de Negócios (análise de lucro e dicas)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Tudo do Plano Básico sem limites</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Até 10 funcionários (caixas, gerentes, repositores)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Fecho de caixa cego (anti-fraude e quebra de caixa)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Suporte prioritário via WhatsApp direto</span>
              </li>
            </ul>

            <button 
              type="button"
              className={`w-full py-2.5 rounded-xl text-xs font-semibold transition ${
                selectedPlan === 'pro'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {selectedPlan === 'pro' ? 'Plano Ativo na Escolha' : 'Escolher Profissional'}
            </button>
          </div>

          {/* Plano Empresarial / Redes */}
          <div 
            onClick={() => setSelectedPlan('premium')}
            className={`cursor-pointer rounded-2xl p-6 border transition relative ${
              selectedPlan === 'premium' 
                ? 'bg-slate-900 border-purple-500 ring-2 ring-purple-500/30 shadow-xl' 
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                Empresarial / Redes
              </span>
              {selectedPlan === 'premium' && (
                <span className="flex items-center gap-1 text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selecionado
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-extrabold text-white">Kz 30.000</span>
              <span className="text-xs text-slate-400">/ mês</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Para médias e grandes empresas com múltiplos pontos de venda.</p>

            <ul className="space-y-2 text-xs text-slate-300 mb-4">
              <li className="flex items-center gap-2 font-medium text-purple-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Tudo do Plano Profissional</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Utilizadores e funcionários ilimitados</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Múltiplos caixas e terminais em rede</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Exportação e relatórios contábeis VIP</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Gestor de conta VIP dedicado</span>
              </li>
            </ul>

            <button 
              type="button"
              className={`w-full py-2.5 rounded-xl text-xs font-semibold transition ${
                selectedPlan === 'premium'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {selectedPlan === 'premium' ? 'Plano Ativo na Escolha' : 'Escolher Empresarial'}
            </button>
          </div>
        </div>

        {/* Payment & Contact Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <span>Passo 2: Efetue o Pagamento para Ativação Imediata</span>
          </h3>
          <p className="text-xs text-slate-400 mb-5">
            Valor a pagar: <strong className="text-emerald-400 font-bold text-sm">Kz {chosenPrice.toLocaleString('pt-AO')}</strong> referente a 30 dias de acesso ao VendaFácil.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Multicaixa Express */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">Multicaixa Express (Telefones)</span>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">Rápido</span>
              </div>
              
              <div className="space-y-1.5 my-1">
                <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400">972 911 640</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('972911640', 'phone-1')}
                    className="text-slate-400 hover:text-white transition p-1"
                    title="Copiar 972 911 640"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400">947 050 586</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('947050586', 'phone-2')}
                    className="text-slate-400 hover:text-white transition p-1"
                    title="Copiar 947 050 586"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-1">Beneficiário: BARTOLOMEU SUNDA CONDE MAVUNGO</p>
            </div>

            {/* IBAN Bancário */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">Transferência Bancária (IBAN)</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">Todos os bancos</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 mb-1">
                <span className="font-mono text-xs font-bold text-emerald-400 truncate mr-2">0040 0000 1472 2403 1016 5</span>
                <button
                  type="button"
                  onClick={() => handleCopy('004000001472240310165', 'iban')}
                  className="text-slate-400 hover:text-white transition p-1 shrink-0"
                  title="Copiar IBAN"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400">Titular: BARTOLOMEU SUNDA CONDE MAVUNGO</p>
            </div>
          </div>

          {/* Action Buttons: WhatsApp Direct vs Submit Proof */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Ativar via WhatsApp (Recomendado)</span>
            </a>

            <button
              type="button"
              onClick={() => setSubmittedSuccess(false)}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition"
            >
              <Send className="w-4 h-4" />
              <span>Informar Comprovativo na Plataforma</span>
            </button>
          </div>

          {/* Inline Form for Proof Submission */}
          <form onSubmit={handleSendProof} className="mt-6 pt-6 border-t border-slate-800 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Notificar Administrador do Pagamento Efetuado:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Método Utilizado</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="multicaixa">Multicaixa Express</option>
                  <option value="transferencia">Transferência Bancária (IBAN)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nº de Operação / Referência (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: 984728472 ou nome da conta"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Observações / Telefone de contacto</label>
              <input
                type="text"
                placeholder="Ex: Pagamento feito pelo terminal X às 14h, contacto 923 111 222"
                value={proofNote}
                onChange={e => setProofNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {submittedSuccess ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>O seu comprovativo foi registado! A nossa equipa irá validar e a sua conta será desbloqueada em instantes.</span>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 transition"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirmar Envio do Pedido</span>
                  </>
                )}
              </button>
            )}
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full pt-4 border-t border-slate-900 text-center text-xs text-slate-500">
        VendaFácil SaaS &bull; Gestão Comercial Mobile-First &bull; Suporte Técnico: (+244) 923 456 789 &bull; suporte@vendafacil.ao
      </footer>
    </div>
  );
};
