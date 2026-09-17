import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export const AiAssistantPage: React.FC = () => {
  const { company, user } = useAuth();
  const { error } = useToast();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: `Olá **${user?.name.split(' ')[0] || 'Comerciante'}**! Sou o **Assistente IA do VendaFácil** 🤖.\n\nTenho acesso seguro aos dados em tempo real da **${company?.name || 'sua empresa'}** (vendas, lucros, stock, despesas e fiado) para lhe fornecer análises precisas e dicas para fazer o seu negócio crescer.\n\nComo posso ajudar hoje?`,
      timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Qual foi o meu faturamento e lucro este mês?',
    'Quais produtos estão com stock crítico para reposição?',
    'Quem são os clientes com mais dívidas de fiado pendentes?',
    'Qual é o meu produto campeão de vendas e mais rentável?',
    'Dá-me 3 sugestões para aumentar as vendas esta semana.',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Format chat history for API
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.askAi(query, historyPayload);

      const aiMsg: Message = {
        role: 'model',
        content: res.reply || 'Desculpe, não consegui processar a resposta no momento.',
        timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      error('Erro ao comunicar com o Assistente IA');
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: '⚠️ Ocorreu um erro temporário ao analisar os dados do seu negócio. Por favor tente novamente.',
          timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderFormattedContent = (content: string) => {
    // Simple custom markdown parser for bullet points, bolding and paragraphs
    return content.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-slate-900 text-sm mt-3 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('* ') || line.startsWith('- ')) {
        const text = line.substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-slate-800 text-xs sm:text-sm my-1 leading-relaxed">
            {renderBoldText(text)}
          </li>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="text-slate-800 text-xs sm:text-sm leading-relaxed">
          {renderBoldText(line)}
        </p>
      );
    });
  };

  const renderBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-950">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between shrink-0 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base text-slate-900 leading-tight">
                Assistente IA de Negócio
              </h2>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                Gemini 3.7 Flash
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Análise inteligente de vendas, stock, caixa e rentabilidade
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                role: 'model',
                content: `Conversa reiniciada. Como posso ajudar com a **${company?.name || 'sua empresa'}**?`,
                timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
              },
            ])
          }
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          title="Limpar Conversa"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                  isUser
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm'
                }`}
              >
                {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 shadow-2xs ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-tr-xs'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-900 rounded-tl-xs'
                }`}
              >
                {isUser ? (
                  <p className="text-xs sm:text-sm font-medium leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="space-y-1">{renderFormattedContent(msg.content)}</div>
                )}
                <div
                  className={`text-[10px] mt-2 flex items-center gap-1 ${
                    isUser ? 'text-emerald-200 justify-end' : 'text-slate-400 justify-start'
                  }`}
                >
                  <Clock className="w-2.5 h-2.5" />
                  <span>{msg.timestamp}</span>
                </div>
              </div>
            </motion.div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl rounded-tl-xs p-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce [animation-delay:0.4s]" />
              <span className="text-xs text-slate-500 ml-1 font-medium">A analisar dados do seu negócio...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Pills */}
      <div className="flex gap-2 overflow-x-auto py-2.5 scrollbar-none shrink-0">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 border border-slate-200/80 hover:border-purple-200 text-slate-700 text-xs font-semibold whitespace-nowrap transition-all shadow-2xs disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-md flex items-center gap-2 shrink-0">
        <textarea
          rows={1}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte sobre vendas, lucros, produtos ou fiado..."
          className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none resize-none font-medium"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim() || isLoading}
          className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-sm shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
