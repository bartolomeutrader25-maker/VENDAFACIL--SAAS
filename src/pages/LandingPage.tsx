import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingCart,
  TrendingUp,
  Boxes,
  Users,
  Wallet,
  Sparkles,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  MessageSquare,
  BarChart3,
  Building2,
  Zap,
  Copy,
  CreditCard,
  PhoneCall
} from 'lucide-react';

interface LandingPageProps {
  onStartFree: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartFree, onLogin }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const features = [
    {
      icon: ShoppingCart,
      title: 'Vendas no PDV em 10 Segundos',
      desc: 'Registe vendas rapidamente pelo telemóvel com código de barras, cálculo automático de troco e recibos digitais.',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      icon: Boxes,
      title: 'Controlo Total de Stock',
      desc: 'Evite rupturas com alertas de stock mínimo, histórico de entradas e saídas e cálculo automático de margem de lucro.',
      color: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    {
      icon: Wallet,
      title: 'Gestão de Caixa & Despesas',
      desc: 'Abra e feche o caixa com conferência física detalhada, registo de sangrias e acompanhamento de lucros diários.',
      color: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    {
      icon: Users,
      title: 'Gestão de Fiado & Cobranças',
      desc: 'Controle dívidas pendentes de clientes com lembretes automáticos e partilha de faturas diretamente no WhatsApp.',
      color: 'bg-purple-50 text-purple-600 border-purple-200',
    },
    {
      icon: Sparkles,
      title: 'Assistente IA de Negócio',
      desc: 'Faça perguntas à IA como "Quanto lucrei este mês?" ou "Quais produtos repor?" e receba consultoria imediata.',
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    },
    {
      icon: BarChart3,
      title: 'Relatórios Claros & Métricas',
      desc: 'Gráficos simples que mostram vendas de hoje, últimos 7 e 30 dias, produtos mais vendidos e despesas categorizadas.',
      color: 'bg-rose-50 text-rose-600 border-rose-200',
    },
  ];

  const plans = [
    {
      id: 'free',
      name: 'TESTE GRÁTIS',
      price: '0 Kz',
      period: '7 dias livres',
      desc: 'Acesso total durante 7 dias para testar todas as funcionalidades.',
      features: [
        'Vendas no telemóvel e PC sem limites',
        'Cadastro ilimitado de produtos e stock',
        'Abertura e fecho de caixa diário',
        'Registo de fiado e clientes',
        'Sem necessidade de cartão ou pagamento'
      ],
      popular: false,
      buttonText: 'Começar 7 Dias Grátis',
    },
    {
      id: 'basic',
      name: 'BÁSICO',
      price: '5.000 Kz',
      period: 'por mês',
      desc: 'Ideal para pequenos comerciantes, quiosques e lojas de bairro.',
      features: [
        'Vendas no telemóvel e PC ilimitadas',
        'Controlo de stock e avisos de rutura',
        'Registo e controlo de fiado/clientes',
        'Fecho e abertura de caixa diário',
        'Até 3 funcionários com acessos restritos',
        'Suporte padrão por email e WhatsApp'
      ],
      popular: false,
      buttonText: 'Escolher Básico',
    },
    {
      id: 'pro',
      name: 'PROFISSIONAL',
      price: '10.000 Kz',
      period: 'por mês',
      desc: 'O plano mais escolhido por lojas estruturadas com equipa.',
      features: [
        'Tudo do Plano Básico sem limites',
        'IA Gemini Consultora de Negócios 24/7',
        'Até 10 funcionários (caixas, gerentes)',
        'Fecho de caixa cego (anti-fraude)',
        'Demonstração de Lucro Real e DRE',
        'Leitor de Código de Barras por câmara',
        'Suporte prioritário direto no WhatsApp'
      ],
      popular: true,
      buttonText: 'Testar 7 Dias Grátis',
    },
    {
      id: 'premium',
      name: 'EMPRESARIAL / REDES',
      price: '30.000 Kz',
      period: 'por mês',
      desc: 'Para médias e grandes empresas com múltiplos pontos de venda.',
      features: [
        'Tudo do Plano Profissional',
        'Utilizadores e funcionários ilimitados',
        'Múltiplos terminais de caixa simultâneos',
        'Exportação contábil avançada (PDF, Excel)',
        'Gestor de conta VIP dedicado',
        'Treinamento presencial/remoto da equipa'
      ],
      popular: false,
      buttonText: 'Falar com Consultor',
    },
  ];

  const faqs = [
    {
      q: 'O VendaFácil funciona no telemóvel?',
      a: 'Sim! O sistema foi desenvolvido com design mobile-first, funcionando perfeitamente em smartphones Android e iPhone, bem como em tablets e computadores.',
    },
    {
      q: 'Qual é a moeda utilizada no sistema?',
      a: 'A moeda padrão é o Kwanza (Kz), adaptada para o comércio em Angola, mas o sistema está preparado para suportar USD, EUR e outras moedas.',
    },
    {
      q: 'Posso enviar recibos e cobranças pelo WhatsApp?',
      a: 'Sim! Com um clique, pode partilhar o recibo digital da venda ou o lembrete de fiado diretamente para o WhatsApp do cliente.',
    },
    {
      q: 'Como funciona o Assistente com Inteligência Artificial?',
      a: 'A IA do VendaFácil analisa com segurança apenas os dados da sua empresa para responder a perguntas como faturamento, margem de lucro e produtos que precisam de reposição.',
    },
    {
      q: 'Os dados da minha empresa ficam seguros e isolados?',
      a: 'Sim. A plataforma utiliza arquitetura multi-tenant com isolamento total dos dados de cada empresa e controlo de permissões por funcionário.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-extrabold text-xl shadow-lg shadow-emerald-500/25">
              V
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">VendaFácil</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={onStartFree}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>Começar Grátis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-16 px-4 sm:px-8 overflow-hidden">
        {/* Background glow accents */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 sm:w-[600px] h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Zap className="w-3.5 h-3.5" />
            <span>SaaS Mobile-First para Pequenos Negócios</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Controle o seu negócio diretamente pelo{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              telemóvel.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Venda, controle o stock, acompanhe o caixa e descubra quanto realmente está a ganhar — tudo num único aplicativo simples e rápido.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={onStartFree}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 px-8 py-4 rounded-2xl font-extrabold text-base shadow-xl shadow-emerald-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Começar Gratuitamente</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
            <button
              onClick={onLogin}
              className="w-full sm:w-auto bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-6 py-4 rounded-2xl font-bold text-base transition-colors flex items-center justify-center gap-2"
            >
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span>Ver Demonstração ao Vivo</span>
            </button>
          </div>

          <div className="mt-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sem cartão de crédito
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Moeda Kwanza (Kz)
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Pronto em 1 minuto
            </span>
          </div>
        </div>

        {/* Mobile Device Mockup Preview */}
        <div className="mt-12 sm:mt-16 max-w-5xl mx-auto relative">
          <div className="p-3 sm:p-5 rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 shadow-2xl shadow-black/50">
            <div className="bg-slate-950 rounded-2xl p-4 sm:p-6 border border-slate-800">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-mono text-slate-500 ml-2">vendafacil.app</span>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                  PDV Rápido & Mobile-First
                </span>
              </div>

              {/* Sample Dashboard Preview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400">Vendas de Hoje</span>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">45.700 Kz</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400">Lucro Estimado</span>
                  <p className="text-lg font-bold text-teal-300 mt-0.5">14.330 Kz</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400">Produtos Vendidos</span>
                  <p className="text-lg font-bold text-white mt-0.5">28 un</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400">Valores a Receber (Fiado)</span>
                  <p className="text-lg font-bold text-amber-400 mt-0.5">70.000 Kz</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience Bar */}
      <section className="py-8 bg-slate-950 border-y border-slate-800/80 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
            Desenvolvido especialmente para pequenos e médios negócios:
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 text-xs font-medium text-slate-300">
            {['Minimercados', 'Boutiques & Roupa', 'Salões de Beleza & Barbearias', 'Restaurantes & Lanchonetes', 'Farmácias', 'Lojas de Eletrónica', 'Vendedores Online', 'Lojas de Cosméticos'].map((tag) => (
              <span key={tag} className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
            Tudo o que o seu negócio precisa
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">
            Simplicidade máxima, controlo profissional
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-3">
            Diga adeus aos cadernos manuais e planilhas confusas. Tudo no seu telemóvel com poucos toques.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-all hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${f.color} mb-5`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">{f.title}</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 sm:py-24 bg-slate-950 border-t border-slate-800 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
              Preços Transparentes em Kwanzas
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">
              Escolha o plano ideal para a sua empresa
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-3">
              Comece gratuitamente e faça upgrade à medida que as suas vendas aumentam.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`rounded-3xl p-6 flex flex-col justify-between border transition-all ${
                  p.popular
                    ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10'
                    : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div>
                  {p.popular && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider mb-3">
                      Mais Popular
                    </span>
                  )}
                  <h3 className="font-bold text-lg text-white">{p.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{p.price}</span>
                    <span className="text-xs text-slate-400">{p.period}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{p.desc}</p>

                  <div className="my-6 border-t border-slate-800 pt-4 space-y-2.5">
                    {p.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={onStartFree}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all ${
                    p.popular
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  {p.buttonText}
                </button>
              </div>
            ))}
          </div>

          {/* Dados Bancários Oficiais para Pagamento */}
          <div className="mt-12 max-w-4xl mx-auto rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">Dados Oficiais para Pagamento e Ativação</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Angola (AOA)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Aceitamos transferências de qualquer banco em Angola ou via Multicaixa Express.
                  </p>
                </div>
              </div>

              <a
                href="https://wa.me/244972911640?text=Ol%C3%A1%21+Gostaria+de+enviar+o+comprovativo+de+pagamento+para+ativar+o+VendaF%C3%A1cil."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shrink-0 shadow-lg shadow-emerald-500/10"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Enviar Comprovativo no WhatsApp</span>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {/* Card IBAN */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transferência Bancária (IBAN)</span>
                  <span className="text-[10px] text-slate-500 font-mono">BAI / Todos os Bancos</span>
                </div>
                
                <div className="flex items-center justify-between bg-slate-900/90 px-3.5 py-2.5 rounded-xl border border-slate-800 my-2">
                  <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400 tracking-wide select-all">
                    0040 0000 1472 2403 1016 5
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('004000001472240310165', 'iban-landing')}
                    className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition shrink-0 ml-2"
                    title="Copiar IBAN"
                  >
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-medium">{copiedKey === 'iban-landing' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Titular / Beneficiário:</span>
                  <strong className="text-slate-200 font-semibold text-right">BARTOLOMEU SUNDA CONDE MAVUNGO</strong>
                </div>
              </div>

              {/* Card Multicaixa Express */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Multicaixa Express (Telefones)</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">Ativação Rápida</span>
                </div>

                <div className="space-y-2 my-2">
                  {/* Número 1 */}
                  <div className="flex items-center justify-between bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800">
                    <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400 tracking-wide select-all">
                      972 911 640
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('972911640', 'phone-landing-1')}
                      className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition shrink-0 ml-2"
                      title="Copiar 972 911 640"
                    >
                      <Copy className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] font-medium">{copiedKey === 'phone-landing-1' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>

                  {/* Número 2 */}
                  <div className="flex items-center justify-between bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800">
                    <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400 tracking-wide select-all">
                      947 050 586
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('947050586', 'phone-landing-2')}
                      className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition shrink-0 ml-2"
                      title="Copiar 947 050 586"
                    >
                      <Copy className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] font-medium">{copiedKey === 'phone-landing-2' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Nome no Express:</span>
                  <strong className="text-slate-200 font-semibold text-right">BARTOLOMEU SUNDA CONDE MAVUNGO</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-8 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-white">Perguntas Frequentes</h2>
          <p className="text-sm text-slate-400 mt-1">Tire todas as suas dúvidas sobre o VendaFácil</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between text-sm font-semibold text-white"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-4 text-xs sm:text-sm text-slate-300 border-t border-slate-800/60 pt-3 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 sm:px-8 bg-gradient-to-b from-slate-950 to-slate-900 border-t border-slate-800 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Comece hoje a gerir o seu negócio de forma inteligente.
          </h2>
          <p className="text-slate-400 text-sm mt-3">
            Cadastre os seus produtos e faça a sua primeira venda em menos de 2 minutos.
          </p>
          <button
            onClick={onStartFree}
            className="mt-6 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-4 rounded-2xl font-extrabold text-base shadow-xl shadow-emerald-500/25 transition-all"
          >
            <span>Criar Conta Gratuita</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-950 border-t border-slate-800/60 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} VendaFácil SaaS. Todos os direitos reservados. Feito para comerciantes em Angola e no mundo.</p>
      </footer>
    </div>
  );
};
