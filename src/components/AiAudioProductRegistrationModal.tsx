import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Camera,
  RefreshCw,
  Sparkles,
  X,
  Upload,
  Check,
  AlertCircle,
  Volume2,
  Calendar,
  Layers,
  DollarSign,
  Tag,
  Package,
  FileText,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category } from '../types/index.js';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.js';

interface AiAudioProductRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  currency: string;
  onProductCreated: (newProduct: any) => void;
}

export const AiAudioProductRegistrationModal: React.FC<AiAudioProductRegistrationModalProps> = ({
  isOpen,
  onClose,
  categories,
  currency,
  onProductCreated,
}) => {
  const { success, error, warning } = useToast();

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Camera Capture State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Extraction & Processing State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);

  // Structured Form Fields (Organized: Nome, Categoria, Preço de Compra, Preço de Venda, Stock Actual, Stock Mínimo, Data de Vencimento)
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(1);
  const [minStock, setMinStock] = useState<number>(5);
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('un');
  const [description, setDescription] = useState('');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      resetAll();
      if (categories.length > 0) {
        setCategoryId(categories[0].id);
        setCategoryName(categories[0].name);
      }
    } else {
      stopCamera();
      stopRecording();
    }
  }, [isOpen]);

  const resetAll = () => {
    setName('');
    setCostPrice(0);
    setSalePrice(0);
    setCurrentStock(1);
    setMinStock(5);
    setExpirationDate('');
    setBarcode('');
    setUnit('un');
    setDescription('');
    setCapturedImage(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setSpeechTranscript('');
    setAnalysisNote(null);
    setRecordingSeconds(0);
    setIsAnalyzing(false);
    setIsSaving(false);
  };

  // Timer for audio recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Audio recording handlers
  const startRecording = async () => {
    try {
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingSeconds(0);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start Web Speech API transcription in parallel if available in browser
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.lang = 'pt-PT';
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript + ' ';
            }
            setSpeechTranscript(transcript.trim());
          };
          rec.onerror = () => {};
          rec.start();
          recognitionRef.current = rec;
        } catch {
          // Ignore speech recognition error, Gemini handles audio directly
        }
      }
    } catch (err: any) {
      console.error('Microphone error:', err);
      error('Permissão de microfone negada ou indisponível.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  // Camera handlers
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setIsCameraActive(false);
      error('Permissão de câmara negada ou dispositivo indisponível.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Convert Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Trigger AI Extraction via Gemini 3.8 Flash
  const handleExtractWithAi = async () => {
    if (!audioBlob && !capturedImage && !speechTranscript) {
      warning('Grave um áudio ou capture uma foto do produto para iniciar a análise por IA.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisNote(null);

      let audioBase64: string | undefined;
      if (audioBlob) {
        audioBase64 = await blobToBase64(audioBlob);
      }

      const result = await api.extractProductWithAi({
        audioBase64,
        audioMimeType: audioBlob ? audioBlob.type || 'audio/webm' : undefined,
        audioTranscript: speechTranscript || undefined,
        imageBase64: capturedImage || undefined,
        imageMimeType: 'image/jpeg',
      });

      // Populate structured fields
      if (result.name) setName(result.name);
      if (result.costPrice !== undefined && result.costPrice !== null) setCostPrice(Number(result.costPrice));
      if (result.salePrice !== undefined && result.salePrice !== null) setSalePrice(Number(result.salePrice));
      if (result.currentStock !== undefined && result.currentStock !== null) setCurrentStock(Number(result.currentStock));
      if (result.minStock !== undefined && result.minStock !== null) setMinStock(Number(result.minStock));
      if (result.expirationDate) setExpirationDate(result.expirationDate);
      if (result.barcode) setBarcode(result.barcode);
      if (result.unit) setUnit(result.unit);
      if (result.description) setDescription(result.description);

      // Match category
      if (result.matchedCategoryId) {
        setCategoryId(result.matchedCategoryId);
      } else if (result.categoryName) {
        setCategoryName(result.categoryName);
        const match = categories.find(
          (c) => c.name.toLowerCase() === result.categoryName.toLowerCase()
        );
        if (match) {
          setCategoryId(match.id);
        }
      }

      if (result.confidenceNotes) {
        setAnalysisNote(result.confidenceNotes);
      }

      success('Dados do produto extraídos com sucesso pela Inteligência Artificial!');
    } catch (err: any) {
      console.error('AI Extraction error:', err);
      let errMsg = err.message || 'Erro ao processar áudio/imagem com IA';
      if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('alta procura')) {
        errMsg = 'Os servidores de IA do Google estão temporariamente com alta procura. Por favor, tente novamente dentro de instantes ou preencha o formulário.';
      }
      error(errMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit and Save Product
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      warning('O nome do produto é obrigatório.');
      return;
    }
    if (salePrice < 0) {
      warning('O preço de venda não pode ser negativo.');
      return;
    }

    try {
      setIsSaving(true);

      const targetCat = categories.find((c) => c.id === categoryId);

      const payload = {
        name: name.trim(),
        categoryId: categoryId || 'cat-default',
        categoryName: targetCat ? targetCat.name : categoryName || 'Geral',
        costPrice: Number(costPrice) || 0,
        salePrice: Number(salePrice) || 0,
        sellingPrice: Number(salePrice) || 0,
        currentStock: Number(currentStock) || 0,
        stockQuantity: Number(currentStock) || 0,
        minStock: Number(minStock) || 5,
        unit: unit || 'un',
        expirationDate: expirationDate ? expirationDate.trim() : undefined,
        imageUrl: capturedImage || '',
        barcode: barcode.trim() || undefined,
        description: description.trim() || undefined,
      };

      const created = await api.createProduct(payload);
      success(`Produto "${created.name}" cadastrado com sucesso!`);
      onProductCreated(created);
      onClose();
    } catch (err: any) {
      error(err.message || 'Erro ao salvar novo produto.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const profit = (salePrice || 0) - (costPrice || 0);
  const marginPercent = salePrice > 0 ? Math.round((profit / salePrice) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-4 sm:px-6 py-3.5 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                Registo por Áudio e Captura de Imagem
              </h2>
              <p className="text-[11px] text-emerald-100/90 font-medium">
                Registe novos produtos falando pelo microfone e fotografando a embalagem com a IA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Audio & Visual Capture Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Audio Recording Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <Mic className="w-3.5 h-3.5 text-emerald-600" />
                    1. Falar por Áudio (Voz)
                  </span>
                  {isRecording && (
                    <span className="flex items-center gap-1.5 text-[11px] text-rose-600 font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Gravando ({recordingSeconds}s)
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  Ex: <em>"Cadastrar Leite Nido 400g, Categoria Laticínios, comprei a 1.800 Kz e vou vender a 2.500 Kz, tenho 24 latas em stock, mínimo 6, validade 15 de Dezembro de 2026."</em>
                </p>

                {speechTranscript && (
                  <div className="mb-3 p-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 font-medium italic">
                    "{speechTranscript}"
                  </div>
                )}

                {audioUrl && !isRecording && (
                  <div className="mb-3 flex items-center gap-2 p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <audio src={audioUrl} controls className="w-full h-8" />
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>{audioBlob ? 'Regravar Áudio' : 'Começar a Falar'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Square className="w-4 h-4" />
                    <span>Parar Gravação</span>
                  </button>
                )}
                {audioBlob && !isRecording && (
                  <button
                    type="button"
                    onClick={() => {
                      setAudioBlob(null);
                      setAudioUrl(null);
                      setSpeechTranscript('');
                    }}
                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Limpar áudio"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Camera / Image Capture Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    2. Captura da Imagem / Rótulo
                  </span>
                  {capturedImage && (
                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Foto Capturada
                    </span>
                  )}
                </div>

                {isCameraActive ? (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video mb-3 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 inset-x-0 flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" /> Disparar Foto
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3 py-1.5 bg-slate-800/80 text-white rounded-full font-bold text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : capturedImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video mb-3 bg-slate-100 flex items-center justify-center">
                    <img
                      src={capturedImage}
                      alt="Produto"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setCapturedImage(null)}
                      className="absolute top-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition-colors cursor-pointer"
                      title="Remover foto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl aspect-video mb-3 flex flex-col items-center justify-center p-3 text-center bg-white">
                    <Camera className="w-7 h-7 text-slate-300 mb-1" />
                    <p className="text-xs text-slate-500 font-medium">
                      Capture a embalagem para ler o nome, código de barras e validade
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                {!isCameraActive && (
                  <>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{capturedImage ? 'Tirar Nova Foto' : 'Abrir Câmara'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                      title="Carregar foto do dispositivo"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Galeria</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* AI Trigger Action Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-emerald-200/80 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900">
                  3. Processamento Automático por Inteligência Artificial
                </p>
                <p className="text-[11px] text-slate-500">
                  O Gemini analisa a sua voz e a imagem para preencher instantaneamente a lista organizada abaixo.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isAnalyzing || (!audioBlob && !capturedImage && !speechTranscript)}
              onClick={handleExtractWithAi}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all shrink-0 cursor-pointer ${
                isAnalyzing || (!audioBlob && !capturedImage && !speechTranscript)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-98'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>A analisar dados com IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Extrair Dados Automaticamente</span>
                </>
              )}
            </button>
          </div>

          {analysisNote && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Resultado do Reconhecimento:</strong> {analysisNote}
              </div>
            </div>
          )}

          {/* Structured & Organised Product Information Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                Lista Organizada do Produto (Confirme ou Ajuste)
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                Todos os 7 campos solicitados organizados
              </span>
            </div>

            {/* Field 1: Nome do Produto */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-emerald-600" />
                Nome do Produto *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Leite Nido 400g ou Óleo Alimentar Sol 1L"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            {/* Field 2: Categoria do Produto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-emerald-600" />
                  Categoria do Produto *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {categoryName && !categories.some((c) => c.name.toLowerCase() === categoryName.toLowerCase()) && (
                    <option value="cat-custom">
                      ✨ {categoryName} (Nova)
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Package className="w-3 h-3 text-emerald-600" />
                  Unidade de Medida
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                >
                  <option value="un">Unidade (un)</option>
                  <option value="kg">Quilograma (kg)</option>
                  <option value="cx">Caixa (cx)</option>
                  <option value="pct">Pacote (pct)</option>
                  <option value="l">Litro (l)</option>
                  <option value="fardo">Fardo</option>
                </select>
              </div>
            </div>

            {/* Field 3 & 4: Preço de Compra & Preço de Venda */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-slate-500" />
                  Preço de Compra ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={costPrice || ''}
                  onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-600" />
                  Preço de Venda ({currency}) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={salePrice || ''}
                  onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl px-3 py-2 text-sm text-emerald-950 font-black focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Profit Margin Preview Bar */}
            <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">Margem e Lucro Estimado:</span>
              <span className={`font-bold ${marginPercent >= 20 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {marginPercent}% ({profit.toLocaleString('pt-PT')} {currency}/unidade)
              </span>
            </div>

            {/* Field 5 & 6: Stock Actual & Stock Mínimo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Package className="w-3 h-3 text-emerald-600" />
                  Stock Actual (Quantidade Física) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Stock Mínimo (Alerta de Reposição)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Field 7: Data de Vencimento do Produto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  Data de Vencimento / Validade
                </label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Essencial para controle de perecíveis, farmácias, bebidas e cosméticos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-500" />
                  Código de Barras (Opcional)
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Lido na foto ou falado"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Footer buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>A registar no catálogo...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Registar Produto no Catálogo</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
