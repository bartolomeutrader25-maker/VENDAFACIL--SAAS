import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Sliders,
  RefreshCw,
  Check,
  X,
  Upload,
  Camera,
  Download,
  ArrowRight,
  Layers,
  Undo,
  HelpCircle,
  Eye,
  Info
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';

interface ProductImageAiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyImage: (imageUrl: string) => void;
  currentImageUrl?: string;
  productName?: string;
  categoryName?: string;
  productId?: string;
}

type StudioMode = 'create' | 'edit';
type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9';

export const ProductImageAiStudioModal: React.FC<ProductImageAiStudioModalProps> = ({
  isOpen,
  onClose,
  onApplyImage,
  currentImageUrl = '',
  productName = '',
  categoryName = '',
  productId,
}) => {
  const { success, error, info } = useToast();

  const [mode, setMode] = useState<StudioMode>(currentImageUrl ? 'edit' : 'create');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [sourceImage, setSourceImage] = useState(currentImageUrl);
  const [generatedImage, setGeneratedImage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState<number>(-1);

  // Sync currentImageUrl when modal opens
  useEffect(() => {
    if (isOpen) {
      setSourceImage(currentImageUrl || '');
      setMode(currentImageUrl ? 'edit' : 'create');
      setGeneratedImage('');
      setHistory([]);
      setActiveHistoryIndex(-1);

      // Auto-suggest initial prompt based on product
      if (productName) {
        if (!currentImageUrl) {
          setPrompt(`Fotografia de estúdio profissional do produto ${productName}${categoryName ? ` (${categoryName})` : ''}, fundo branco suave comercial, iluminação perfeita`);
        } else {
          setPrompt(`Melhorar iluminação, remover imperfeições e colocar o produto ${productName} sobre fundo de estúdio comercial limpo e nítido`);
        }
      } else {
        setPrompt('');
      }
    }
  }, [isOpen, currentImageUrl, productName, categoryName]);

  if (!isOpen) return null;

  // Smart suggestions tailored to product
  const createSuggestions = [
    `Fotografia profissional de estúdio sobre fundo branco limpo`,
    `Embalagem moderna com iluminação comercial suave e foco nítido`,
    `Apresentação publicitária premium com ingredientes frescos ao redor`,
    `Disposição minimalista sobre balcão de madeira rústica e luz natural`,
    `Garrafa/recipiente gelado com gotas de condensação e frescura`,
  ];

  const editSuggestions = [
    `Remover o fundo atual e aplicar estúdio comercial branco impecável`,
    `Ajustar a iluminação para estúdio profissional e aumentar a nitidez`,
    `Posicionar o produto sobre prateleira de loja moderna e iluminada`,
    `Realçar as cores da embalagem e dar acabamento de revista publicitária`,
    `Adicionar reflexo suave e elegante na base do produto`,
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      error('Por favor introduza uma descrição ou comando em texto.');
      return;
    }

    if (mode === 'edit' && !sourceImage) {
      error('Carregue uma imagem base para realizar a edição.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await api.generateProductImageAi({
        prompt: prompt.trim(),
        mode,
        sourceImageBase64: mode === 'edit' ? sourceImage : undefined,
        aspectRatio,
        productContext: {
          name: productName,
          category: categoryName,
        },
        productId,
      });

      if (res.success && res.imageUrl) {
        setGeneratedImage(res.imageUrl);
        setHistory((prev) => [res.imageUrl, ...prev]);
        setActiveHistoryIndex(0);
        success(mode === 'create' ? 'Nova imagem criada com sucesso!' : 'Imagem editada com sucesso!');
      } else {
        error('A IA não conseguiu gerar a imagem com os parâmetros fornecidos.');
      }
    } catch (err: any) {
      console.error('Erro ao gerar imagem:', err);
      error(err?.message || 'Falha ao processar com a IA Gemini. Tente com outra descrição.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!generatedImage) return;
    onApplyImage(generatedImage);
    success('Imagem aplicada ao produto!');
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSourceImage(event.target?.result as string);
      setMode('edit');
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `${productName ? productName.toLowerCase().replace(/\s+/g, '-') : 'produto'}-gemini-ai.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Estúdio de Imagem IA para Produtos
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                  gemini-3.1-flash-image-preview
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {productName ? `A criar/editar fotografia para: ${productName}` : 'Crie fotos de estúdio ou edite imagens com inteligência artificial'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* MODE SELECTOR TABS */}
          <div className="flex p-1 bg-slate-100 rounded-2xl max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'create'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wand2 className="w-4 h-4 text-indigo-600" />
              <span>Criar Nova Imagem</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('edit')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'edit'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4 text-purple-600" />
              <span>Editar Imagem Existente</span>
            </button>
          </div>

          {/* MAIN WORKSPACE GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: CONTROLS & PROMPTS (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* If Edit mode, show source image preview / file picker */}
              {mode === 'edit' && (
                <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-purple-600" />
                      Imagem Base para Edição
                    </span>
                    <label className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer">
                      Substituir foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {sourceImage ? (
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-purple-200 bg-white shadow-2xs shrink-0">
                        <img
                          src={sourceImage}
                          alt="Base"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs text-purple-950">
                        <p className="font-semibold truncate max-w-xs">
                          {productName || 'Fotografia atual do produto'}
                        </p>
                        <p className="text-[11px] text-purple-700 mt-0.5">
                          A IA manterá a estrutura do produto aplicando as modificações solicitadas.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-purple-300 text-center bg-white">
                      <label className="cursor-pointer flex flex-col items-center">
                        <Camera className="w-6 h-6 text-purple-500 mb-1" />
                        <span className="text-xs font-bold text-purple-800">
                          Carregar imagem do computador ou telemóvel
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* PROMPT TEXTAREA */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  {mode === 'create'
                    ? 'Descrição em Texto (Prompt de Criação)'
                    : 'Instruções de Edição com IA (O que alterar na foto?)'}
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      mode === 'create'
                        ? 'Ex: Garrafa de refrigerante gelada em fundo branco de estúdio com iluminação suave e gotas de água...'
                        : 'Ex: Remover o fundo e colocar sobre estúdio comercial branco; melhorar iluminação e realçar as cores da embalagem...'
                    }
                    className="w-full rounded-2xl border border-slate-300 p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none shadow-2xs leading-relaxed"
                  />
                  {prompt && (
                    <button
                      type="button"
                      onClick={() => setPrompt('')}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* QUICK SUGGESTIONS CHIPS */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Sugestões Rápidas de Alta Qualidade:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(mode === 'create' ? createSuggestions : editSuggestions).map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPrompt(sug)}
                      className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200/90 transition text-left cursor-pointer active:scale-95"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* ASPECT RATIO CONFIG */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-slate-700 block">
                  Proporção da Imagem:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: '1:1' as AspectRatio, label: '1:1 Quadrado', desc: 'Ideal PDV' },
                    { id: '4:3' as AspectRatio, label: '4:3 Catálogo', desc: 'Horizontal' },
                    { id: '3:4' as AspectRatio, label: '3:4 Vertical', desc: 'Mobile' },
                    { id: '16:9' as AspectRatio, label: '16:9 Banner', desc: 'Panorâmico' },
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setAspectRatio(ratio.id)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        aspectRatio === ratio.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold ring-2 ring-indigo-400/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold">{ratio.label}</div>
                      <div className="text-[10px] text-slate-400">{ratio.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ACTION GENERATE BUTTON */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim() || (mode === 'edit' && !sourceImage)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>
                    {isGenerating
                      ? 'A Renderizar com Gemini 3.1 Flash Image...'
                      : mode === 'create'
                      ? 'Gerar Nova Imagem com IA'
                      : 'Executar Edição com IA'}
                  </span>
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: PREVIEW & VARIANTS (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 flex flex-col items-center">
                <span className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5 self-start">
                  <Eye className="w-4 h-4 text-slate-400" />
                  Resultado da IA (Visualização):
                </span>

                {/* IMAGE CONTAINER */}
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-200/80 border border-slate-300 flex items-center justify-center shadow-inner">
                  {isGenerating ? (
                    <div className="flex flex-col items-center p-6 text-center text-slate-600">
                      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="font-bold text-xs text-slate-800">
                        A processar modelo de difusão Gemini...
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                        Renderizando imagem de alta fidelidade para o seu produto
                      </p>
                    </div>
                  ) : generatedImage ? (
                    <img
                      src={generatedImage}
                      alt="Gerado por IA"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center p-6 text-center text-slate-400">
                      <ImageIcon className="w-12 h-12 stroke-[1.2] mb-2 opacity-50" />
                      <p className="text-xs font-semibold text-slate-500">
                        Nenhuma imagem gerada ainda
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Escreva uma descrição e clique no botão acima
                      </p>
                    </div>
                  )}

                  {/* Top-right badge */}
                  {generatedImage && !isGenerating && (
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Gerada por IA</span>
                    </div>
                  )}
                </div>

                {/* GENERATED IMAGE ACTIONS */}
                {generatedImage && !isGenerating && (
                  <div className="w-full mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                      title="Descarregar imagem gerada"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleApply}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Aplicar ao Produto</span>
                    </button>
                  </div>
                )}
              </div>

              {/* VARIANTS HISTORY LIST */}
              {history.length > 1 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Variações Geradas nesta Sessão:
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {history.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setGeneratedImage(img);
                          setActiveHistoryIndex(idx);
                        }}
                        className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                          generatedImage === img
                            ? 'border-indigo-600 ring-2 ring-indigo-400/30'
                            : 'border-slate-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt={`Var ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              As imagens geradas ficam automaticamente salvas e otimizadas para o catálogo do POS offline e online.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
