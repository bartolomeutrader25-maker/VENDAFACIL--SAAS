import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Package,
  Users,
  ShoppingCart,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  X,
  Send,
  Bot,
  User as UserIcon,
  HelpCircle,
  Wallet,
  Building2,
  Boxes,
  CreditCard,
  Printer,
  Share2,
  Smartphone,
  Compass,
  Check,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../lib/api.js';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  initialStep?: number;
}

interface StepItem {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  icon: any;
  route: string;
  actionText: string;
}

interface TourMessage {
  role: 'user' | 'model';
  content: string;
  time: string;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  initialStep = 1,
}) => {
  const { user, company } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<number[]>([1]);

  // AI mini-chat inside the tour
  const [aiMessages, setAiMessages] = useState<TourMessage[]>([
    {
      role: 'model',
      content: `Olá **${user?.name?.split(' ')[0] || 'Comerciante'}**! Estou aqui para esclarecer qualquer dúvida sobre como usar o VendaFácil na **${company?.name || 'sua empresa'}**.\n\nEscolha uma das perguntas frequentes abaixo ou digite a sua dúvida diretamente!`,
      time: 'Agora',
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const curr = company?.currency || 'Kz';

  useEffect(() => {
    if (initialStep) {
      setCurrentStep(initialStep);
    }
  }, [initialStep]);

  useEffect(() => {
    if (currentStep === 6) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentStep, aiMessages, isAiLoading]);

  if (!isOpen) return null;

  const steps: StepItem[] = [
    {
      id: 1,
      badge: 'Visão Geral',
      title: 'Navegar no SaaS Todo',
      subtitle: 'Conheça o painel, os menus e como gerir o negócio no telemóvel ou PC.',
      icon: Compass,
      route: 'dashboard',
      actionText: 'Ver Dashboard',
    },
    {
      id: 2,
      badge: '1º Passo Essencial',
      title: 'Registar o Primeiro Produto',
      subtitle: 'Cadastre preços de custo e venda, stock e código de barras.',
      icon: Package,
      route: 'produtos',
      actionText: 'Ir para Produtos & Cadastrar',
    },
    {
      id: 3,
      badge: '2º Passo Essencial',
      title: 'Cadastrar o Primeiro Cliente',
      subtitle: 'Guarde WhatsApp, limite de fiado e histórico de compras.',
      icon: Users,
      route: 'clientes',
      actionText: 'Ir para Clientes & Registar',
    },
    {
      id: 4,
      badge: '3º Passo Essencial',
      title: 'Realizar a Primeira Venda (PDV)',
      subtitle: 'Venda em 10 segundos com Dinheiro, TPA, Express, Fiado e Recibo WhatsApp.',
      icon: ShoppingCart,
      route: 'pdv',
      actionText: 'Abrir PDV & Vender',
    },
    {
      id: 5,
      badge: 'Gestão Diária',
      title: 'Caixa, Stock & Relatórios de Lucro',
      subtitle: 'Abertura/fecho cego de caixa, alerta de reposição e lucro líquido real.',
      icon: BarChart3,
      route: 'caixa',
      actionText: 'Ver Gestão de Caixa',
    },
    {
      id: 6,
      badge: 'Inteligência Artificial',
      title: 'Falar com o Assistente IA',
      subtitle: 'Tire qualquer inquietação, dúvida operacional ou peça dicas de vendas 24/7.',
      icon: Sparkles,
      route: 'ia',
      actionText: 'Abrir Painel IA Completo',
    },
  ];

  const quickQuestions = [
    'Como registar o primeiro produto passo a passo?',
    'Como realizar uma venda rápida no PDV?',
    'Como cadastrar clientes e definir limite de fiado?',
    'Como funciona a cobrança de fiado por WhatsApp?',
    'Como abrir e fechar o caixa no final do dia?',
    'Como imprimir recibo ou enviar por telemóvel?',
  ];

  const toggleStepCompleted = (id: number) => {
    setCompletedSteps((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const markStepDone = (id: number) => {
    if (!completedSteps.includes(id)) {
      setCompletedSteps((prev) => [...prev, id]);
    }
  };

  const progressPercent = Math.round((completedSteps.length / steps.length) * 100);

  const handleFinishTour = () => {
    if (user?.id) {
      localStorage.setItem(`vf_guided_tour_completed_${user.id}`, 'true');
    }
    onClose();
  };

  const handleActionNavigate = (route: string, stepId: number) => {
    markStepDone(stepId);
    if (user?.id) {
      localStorage.setItem(`vf_guided_tour_completed_${user.id}`, 'true');
    }
    onNavigate(route);
    onClose();
  };

  const handleNext = () => {
    markStepDone(currentStep);
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinishTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSendAiQuestion = async (queryText?: string) => {
    const text = (queryText || aiInput).trim();
    if (!text || isAiLoading) return;

    const userMsg: TourMessage = {
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    };

    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setIsAiLoading(true);

    try {
      const historyPayload = aiMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.askAi(text, historyPayload);
      const aiReply = res?.response || 'Não foi possível responder no momento. Tente novamente.';

      setAiMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: aiReply,
          time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (e: any) {
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: `ℹ️ **Orientação Rápida:** Para realizar esta ação, utilize o menu lateral ou consulte o passo a passo do Tour Guiado. Se precisar de assistência personalizada, pode também abrir o menu **Assistente IA 🤖**.`,
          time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const currentStepData = steps.find((s) => s.id === currentStep) || steps[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200/90 my-auto flex flex-col max-h-[92vh]"
        >
          {/* TOP BANNER */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-5 sm:p-6 text-white relative shrink-0">
            <button
              onClick={handleFinishTour}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              title="Fechar Tour"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold uppercase tracking-wider">
                Tour Guiado VendaFácil
              </span>
              <span className="text-xs text-emerald-200 font-semibold">
                Passo {currentStep} de {steps.length}
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-black tracking-tight">
              {currentStep === 1 && 'Bem-vindo ao VendaFácil SaaS 👋'}
              {currentStep === 2 && 'Como Registar o Primeiro Produto 📦'}
              {currentStep === 3 && 'Como Cadastrar o Primeiro Cliente 👥'}
              {currentStep === 4 && 'Como Fazer a Primeira Venda no PDV 🛒'}
              {currentStep === 5 && 'Caixa, Stock & Lucro Líquido 📊'}
              {currentStep === 6 && 'Falar Diretamente com a IA 🤖'}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
              {company?.name
                ? `Guia passo a passo para começar a faturar na ${company.name} sem complicação.`
                : 'Aprenda em 3 minutos como colocar a sua loja ou serviço a faturar.'}
            </p>

            {/* STEPPER PROGRESS */}
            <div className="mt-4 pt-3 border-t border-white/15">
              <div className="flex items-center justify-between gap-1 sm:gap-2">
                {steps.map((step) => {
                  const isActive = currentStep === step.id;
                  const isDone = completedSteps.includes(step.id);
                  return (
                    <button
                      key={step.id}
                      onClick={() => setCurrentStep(step.id)}
                      className={`flex-1 py-1.5 px-1 rounded-lg text-center transition-all flex flex-col items-center gap-1 ${
                        isActive
                          ? 'bg-white text-emerald-900 font-extrabold shadow-sm scale-102'
                          : isDone
                          ? 'bg-emerald-600/60 text-white hover:bg-emerald-600'
                          : 'bg-black/20 text-white/70 hover:bg-black/30'
                      }`}
                    >
                      <span className="text-[10px] sm:text-xs leading-none font-bold">
                        {step.id === 6 ? 'IA' : `${step.id}`}
                      </span>
                      <div className="hidden sm:block text-[9px] truncate max-w-[70px] opacity-90">
                        {step.badge}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP CONTENT BODY */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* STEP 1: ESTRUTURA DO SAAS & NAVEGAÇÃO */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-slate-800">
                  <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-600" />
                    Como o VendaFácil está organizado
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    A plataforma foi desenhada para ser simples, rápida e funcionar com perfeição tanto no telemóvel quanto no computador ou tablet.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-white transition-colors">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                      <ShoppingCart className="w-4 h-4" />
                      <span>1. Nova Venda (PDV)</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      O ecrã mais importante. Venda rápida com seleção de produtos, leitor de código de barras e cálculo de troco automático.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-white transition-colors">
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
                      <Package className="w-4 h-4" />
                      <span>2. Produtos & Stock</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Catálogo dos seus artigos com controlo de quantidade, preços de custo/venda e alertas de reposição mínima.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-white transition-colors">
                    <div className="flex items-center gap-2 text-purple-700 font-bold text-xs">
                      <Users className="w-4 h-4" />
                      <span>3. Clientes & Fiado</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Ficha de clientes com limites de crédito e módulo de Fiado com envio de lembrete por WhatsApp em 1 clique.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-white transition-colors">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                      <Wallet className="w-4 h-4" />
                      <span>4. Caixa & Despesas</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Abertura e fecho de caixa diário com conferência cega, registo de saídas (energia, transporte, pão) e saldo real.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-purple-100 bg-purple-50/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-purple-900">Assistente IA VendaFácil 🤖</p>
                      <p className="text-[11px] text-purple-700">Disponível 24/7 para responder a dúvidas e analisar faturamento e lucros.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentStep(6)}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors"
                  >
                    Falar com IA
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: REGISTAR O PRIMEIRO PRODUTO */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
                  <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    Como Registar Produtos Corretamente
                  </h3>
                  <p className="text-xs text-blue-800 mt-1">
                    Um bom cadastro de produtos garante que o sistema calcule o seu <strong>lucro líquido real</strong> e avise quando o stock estiver a acabar.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Aceda ao menu Produtos e clique em "+ Novo Produto"</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pode aceder pelo menu lateral no computador ou na barra inferior no telemóvel.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Defina o Preço de Venda e Preço de Custo</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Exemplo: Custo de 1.800 {curr} e Venda de 2.500 {curr}. O sistema calcula automaticamente 700 {curr} de lucro por unidade vendida!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Stock Inicial e Alerta Mínimo</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Indique a quantidade em loja (ex: 20 un) e o stock mínimo (ex: 5 un). Quando restar 5 ou menos, receberá um aviso de reposição.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Código de Barras (Opcional ou Automático)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pode usar a câmara do telemóvel para ler o código da embalagem ou clicar em "Gerar" para criar um código próprio.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 flex items-center justify-between gap-2">
                  <span>💡 <strong>Dica Pro:</strong> Pode organizar os seus produtos por categorias como Bebidas, Mercearia, Limpeza, etc.</span>
                  <button
                    onClick={() => handleSendAiQuestion('Como cadastrar produtos com leitor de código de barras?')}
                    className="text-[11px] font-bold text-amber-800 underline whitespace-nowrap"
                  >
                    Dúvida com IA?
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CADASTRAR CLIENTES */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100">
                  <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Como Cadastrar Clientes & Controlar Fiado
                  </h3>
                  <p className="text-xs text-purple-800 mt-1">
                    Cadastrar os clientes permite enviar recibos no WhatsApp, acompanhar quem mais compra e controlar fiados sem cadernos perdidos.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Aceda ao menu Clientes</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Clique em <strong>"+ Novo Cliente"</strong> no topo da página.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Telefone com WhatsApp é Fundamental</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ao inserir o telemóvel angolano (ex: 923 000 000), o VendaFácil habilita o envio de comprovativos e lembretes amigáveis de pagamento por WhatsApp em 1 clique.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Defina o Limite de Fiado Autorizado</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Exemplo: 50.000 {curr}. Se o cliente tentar comprar a fiado acima desse limite, o PDV avisa o operador para prevenir prejuízos.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 text-xs text-emerald-900 flex items-center justify-between gap-2">
                  <span>📱 <strong>Venda Rápida:</strong> Para clientes casuais, não precisa cadastrar; basta escolher "Venda Rápida ao Balcão".</span>
                  <button
                    onClick={() => handleSendAiQuestion('Como funciona a cobrança de fiado por WhatsApp?')}
                    className="text-[11px] font-bold text-emerald-800 underline whitespace-nowrap"
                  >
                    Perguntar à IA
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: PRIMEIRA VENDA NO PDV */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                  <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-600" />
                    Como Realizar a Primeira Venda em Menos de 10 Segundos
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1">
                    O PDV (Ponto de Venda) foi otimizado para não criar filas na sua loja e emitir recibos instantaneamente.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Adicione os Produtos ao Carrinho</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Toque no produto ou bipe o código de barras. Toque novamente para aumentar a quantidade.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Escolha o Método de Pagamento</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1.5">
                        <span className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 text-center">
                          💵 Dinheiro
                        </span>
                        <span className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 text-center">
                          💳 TPA
                        </span>
                        <span className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 text-center">
                          📲 Express
                        </span>
                        <span className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 text-center">
                          📋 Fiado
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Cálculo de Troco Automático</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Se a compra for de 3.200 {curr} e o cliente entregar 5.000 {curr}, o sistema informa instantaneamente o troco de 1.800 {curr}.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Recibo & Partilha no WhatsApp</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ao finalizar, visualize o recibo térmico pronto para imprimir ou toque no botão verde do WhatsApp para enviar direto ao telemóvel do cliente!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: CAIXA, STOCK E RELATÓRIOS */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100">
                  <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-amber-600" />
                    Rotina Diária Recomendada para o Seu Negócio
                  </h3>
                  <p className="text-xs text-amber-800 mt-1">
                    Para garantir que nenhuma quantia desapareça e saber exatamente quanto ganhou de lucro limpo ao final do mês:
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs shrink-0">
                      Manhã
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Abertura de Caixa</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Abra o caixa com o fundo de maneio inicial (troco deixado na gaveta).
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs shrink-0">
                      Dia
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Vendas & Despesas Rápidas</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Faça as vendas no PDV. Se precisar tirar dinheiro da gaveta para pagar água, transporte ou pão, lance em <strong>Despesas</strong> em 5 segundos.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <div className="p-1.5 rounded-xl bg-purple-100 text-purple-800 font-bold text-xs shrink-0">
                      Noite
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Fechamento Cego de Caixa</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        O operador conta as notas físicas sem saber o total do sistema. O sistema compara e avisa se sobrou ou faltou algum valor.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <div className="p-1.5 rounded-xl bg-blue-100 text-blue-800 font-bold text-xs shrink-0">
                      Semanal
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Relatórios de Lucro Líquido & Stock</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Veja o seu lucro real descontando despesas e custo de mercadoria, e quais produtos devem ser recomprados.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: CHAT IA INTEGRADO PARA QUALQUER INQUIETAÇÃO */}
            {currentStep === 6 && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-purple-900">
                        Assistente IA: Tire Qualquer Dúvida do Negócio
                      </h3>
                      <p className="text-[11px] text-purple-700">
                        Tem dúvidas sobre cadastros, fiado, relatórios ou dicas de venda? Pergunte aqui em tempo real.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick questions pills */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Perguntas Frequentes (Toque para perguntar):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendAiQuestion(q)}
                        disabled={isAiLoading}
                        className="text-[11px] bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 px-2.5 py-1.5 rounded-xl font-medium border border-slate-200/80 transition-all text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Message Box */}
                <div className="h-56 sm:h-64 border border-slate-200 rounded-2xl p-3 overflow-y-auto space-y-2.5 bg-slate-50/50">
                  {aiMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'model' && (
                        <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-white border border-slate-200/80 text-slate-800 shadow-2xs rounded-bl-none'
                        }`}
                      >
                        <div className="whitespace-pre-line">{msg.content}</div>
                        <span className={`block text-[9px] mt-1 ${msg.role === 'user' ? 'text-emerald-100 text-right' : 'text-slate-400'}`}>
                          {msg.time}
                        </span>
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-7 h-7 rounded-lg bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                          <UserIcon className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isAiLoading && (
                    <div className="flex gap-2 items-center text-xs text-purple-600 bg-purple-50 p-2.5 rounded-xl w-fit border border-purple-100">
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>A processar resposta inteligente com IA...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAiQuestion();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Digite a sua inquietação ou dúvida aqui..."
                    disabled={isAiLoading}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!aiInput.trim() || isAiLoading}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors shrink-0"
                    title="Enviar pergunta"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* FOOTER CONTROLS */}
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Left: Quick Jump / Checkbox */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={() => toggleStepCompleted(currentStep)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
              >
                {completedSteps.includes(currentStep) ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400" />
                )}
                <span>Marcar passo como lido</span>
              </button>

              <button
                onClick={handleFinishTour}
                className="text-xs text-slate-400 hover:text-slate-700 sm:hidden"
              >
                Pular
              </button>
            </div>

            {/* Right: Prev / Action / Next */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {currentStep > 1 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
              )}

              {/* Action Button that takes user directly to the page */}
              {currentStepData.route && (
                <button
                  onClick={() => handleActionNavigate(currentStepData.route, currentStep)}
                  className="px-3 py-2 rounded-xl bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                  title={currentStepData.actionText}
                >
                  <span>{currentStepData.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {currentStep < steps.length ? (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span>Próximo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleFinishTour}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Concluir Tour</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
