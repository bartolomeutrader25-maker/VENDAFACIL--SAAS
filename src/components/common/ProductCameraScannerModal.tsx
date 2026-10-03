import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FlipHorizontal,
  Upload,
  Calendar,
  Layers,
  Barcode,
  Tag,
  DollarSign,
  Maximize2,
  Scan,
  Check,
  Zap,
  ArrowRight,
  Plus,
  Trash2,
  Star,
  Pill,
  FileText
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';

export interface ScannedProductData {
  name: string;
  dosagePresentation: string; // Apresentação farmacológica / formato
  categoryName: string;
  batchNumber: string;
  manufacturingDate: string;
  expirationDate: string;
  barcode: string;
  sellingPrice: number;
  costPrice: number;
  unit: string;
  confidenceNotes: string;
  imageUrl: string;
  allImages?: string[];
}

interface ProductCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: ScannedProductData) => void;
  existingCategories?: string[];
}

export const ProductCameraScannerModal: React.FC<ProductCameraScannerModalProps> = ({
  isOpen,
  onClose,
  onApply,
  existingCategories = [],
}) => {
  const { error, success } = useToast();

  const [step, setStep] = useState<'camera' | 'analyzing' | 'review'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Multi-photo state
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number>(0);

  // Scanned Fields Form state for review/confirmation
  const [scannedData, setScannedData] = useState<ScannedProductData>({
    name: '',
    dosagePresentation: '',
    categoryName: '',
    batchNumber: '',
    manufacturingDate: '',
    expirationDate: '',
    barcode: '',
    sellingPrice: 0,
    costPrice: 0,
    unit: 'un',
    confidenceNotes: '',
    imageUrl: '',
    allImages: [],
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start live camera stream
  const startCamera = async (mode = facingMode) => {
    setCameraError(null);

    // Stop existing tracks first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Acesso à câmera não é suportado pelo seu navegador.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Erro ao aceder à câmera com ideal mode:', err);
      // Fallback with basic constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (fallbackErr: any) {
        console.error('Falha geral ao iniciar câmera:', fallbackErr);
        setCameraError(
          'Não foi possível aceder à câmera. Verifique as permissões de vídeo ou carregue fotos do produto da galeria.'
        );
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep('camera');
      setCapturedImages([]);
      setPrimaryImageIndex(0);
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  // Toggle between environment (back) and user (front)
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture single frame from video and add to photos list
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    setCapturedImages((prev) => [...prev, dataUrl]);
  };

  // Upload photo files fallback (supports multiple)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const readFiles: File[] = Array.from(files);
    let loadedCount = 0;
    const newImgs: string[] = [];

    readFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) newImgs.push(dataUrl);
        loadedCount++;
        if (loadedCount === readFiles.length) {
          setCapturedImages((prev) => [...prev, ...newImgs]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setCapturedImages((prev) => prev.filter((_, idx) => idx !== index));
    if (primaryImageIndex === index) {
      setPrimaryImageIndex(0);
    } else if (primaryImageIndex > index) {
      setPrimaryImageIndex((prev) => prev - 1);
    }
  };

  // Execute AI Multi-Photo Analysis
  const handleStartAnalysis = async () => {
    if (capturedImages.length === 0) return;

    stopCamera();
    setStep('analyzing');

    try {
      const res = await api.scanProductWithCamera({
        imagesBase64: capturedImages,
        primaryImageIndex,
        existingCategories,
      });

      if (res && res.success && res.data) {
        setScannedData({
          name: res.data.name || '',
          dosagePresentation: res.data.dosagePresentation || '',
          categoryName: res.data.categoryName || '',
          batchNumber: res.data.batchNumber || '',
          manufacturingDate: res.data.manufacturingDate || '',
          expirationDate: res.data.expirationDate || '',
          barcode: res.data.barcode || '',
          sellingPrice: res.data.sellingPrice || 0,
          costPrice: res.data.costPrice || 0,
          unit: res.data.unit || 'un',
          confidenceNotes:
            res.data.confidenceNotes ||
            `Informações consolidadas com sucesso a partir de ${capturedImages.length} fotos.`,
          imageUrl: capturedImages[primaryImageIndex] || capturedImages[0] || '',
          allImages: capturedImages,
        });
        setStep('review');
        success(`Rótulo, lote, validade e código de barras analisados a partir de ${capturedImages.length} fotos!`);
      } else {
        throw new Error('Falha ao processar imagens com a IA');
      }
    } catch (err: any) {
      console.error('Erro na análise multi-foto:', err);
      error(err.message || 'Erro ao analisar fotos. Pode preencher manualmente ou adicionar mais fotos.');
      setScannedData((prev) => ({
        ...prev,
        imageUrl: capturedImages[primaryImageIndex] || capturedImages[0] || '',
        allImages: capturedImages,
        confidenceNotes:
          'Aviso: Alguns dados podem necessitar de conferência. Ajuste os campos abaixo.',
      }));
      setStep('review');
    }
  };

  const handleRetakeAll = () => {
    setCapturedImages([]);
    setPrimaryImageIndex(0);
    setStep('camera');
    startCamera(facingMode);
  };

  const handleAddMorePhotos = () => {
    setStep('camera');
    startCamera(facingMode);
  };

  const handleConfirmAndApply = () => {
    const selectedImage = capturedImages[primaryImageIndex] || capturedImages[0] || scannedData.imageUrl;
    onApply({
      ...scannedData,
      imageUrl: selectedImage,
      allImages: capturedImages,
    });
    onClose();
  };

  // Helper guidance text according to number of photos captured
  const getGuidanceBadge = () => {
    if (capturedImages.length === 0) {
      return '1ª Foto: Aponte para a Frente da embalagem (Nome e Apresentação Farmacológica)';
    }
    if (capturedImages.length === 1) {
      return '2ª Foto: Aponte para o Lote e Datas de Fabricação/Vencimento ou Código de Barras';
    }
    return `Fotos prontas (${capturedImages.length})! Pode tirar mais ângulos ou clicar em 'Escanear com IA'`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[94vh]">
        {/* HEADER */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Scanner Multi-Foto com Câmera
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {capturedImages.length} {capturedImages.length === 1 ? 'Foto' : 'Fotos'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tire várias fotos da embalagem: frente, carimbo de lote/datas e código de barras
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

        {/* HIDDEN FILE INPUT (SUPPORTS MULTIPLE) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
          {/* STEP 1: CAMERA LIVE VIEW & CAPTURED STRIP */}
          {step === 'camera' && (
            <div className="space-y-3">
              {/* Guidance Notice */}
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{getGuidanceBadge()}</span>
              </div>

              {/* Live Video Viewfinder */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center border border-slate-800 shadow-inner">
                {cameraError ? (
                  <div className="p-6 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                      {cameraError}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Carregar Fotos da Galeria</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />

                    {/* Viewfinder Overlay with Animated Scanning Line */}
                    <div className="absolute inset-3 sm:inset-5 pointer-events-none border-2 border-emerald-400/60 rounded-2xl flex flex-col justify-between p-3 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                      {/* Laser Bar */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_8px_#34d399]" />

                      {/* Instructions */}
                      <div className="flex justify-between items-center text-[10px] text-emerald-300 font-mono font-bold bg-slate-950/75 backdrop-blur-sm px-2.5 py-1 rounded-lg self-center border border-emerald-500/30">
                        <span>
                          {capturedImages.length === 0
                            ? 'Foto 1: Nome e dosagem'
                            : capturedImages.length === 1
                            ? 'Foto 2: Lote, fabrico e validade'
                            : 'Foto 3+: Código de barras / outro ângulo'}
                        </span>
                      </div>
                    </div>

                    {/* Flip Camera Button */}
                    <button
                      type="button"
                      onClick={handleToggleFacingMode}
                      className="absolute top-2.5 right-2.5 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700 backdrop-blur-md transition shadow-md cursor-pointer"
                      title="Alternar entre câmera frontal e traseira"
                    >
                      <FlipHorizontal className="w-4 h-4 text-emerald-400" />
                    </button>
                  </>
                )}
              </div>

              {/* Captured Photos Strip / Thumbnails */}
              {capturedImages.length > 0 && (
                <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-300">
                      Fotos Capturadas ({capturedImages.length}):
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ★ = Imagem principal do produto
                    </span>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5">
                    {capturedImages.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative rounded-xl overflow-hidden border-2 shrink-0 group ${
                          primaryImageIndex === idx
                            ? 'border-emerald-400 ring-2 ring-emerald-500/30'
                            : 'border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Foto ${idx + 1}`}
                          className="w-16 h-16 object-cover cursor-pointer"
                          onClick={() => setPrimaryImageIndex(idx)}
                        />

                        {/* Primary Badge or Selector */}
                        <button
                          type="button"
                          onClick={() => setPrimaryImageIndex(idx)}
                          className={`absolute top-1 left-1 p-0.5 rounded-md text-[9px] font-bold ${
                            primaryImageIndex === idx
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-black/60 text-slate-400 hover:text-white'
                          }`}
                          title={primaryImageIndex === idx ? 'Foto Principal' : 'Definir como Foto Principal'}
                        >
                          <Star className="w-3 h-3 fill-current" />
                        </button>

                        {/* Tag: Foto 1, Foto 2 */}
                        <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[9px] text-center font-bold py-0.5 text-slate-300">
                          {idx === 0 ? 'Frente' : idx === 1 ? 'Lote/Val' : `Foto ${idx + 1}`}
                        </span>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600/90 text-white flex items-center justify-center hover:bg-rose-500"
                          title="Remover esta foto"
                        >
                          <X className="w-2.5 h-2.5 stroke-[3]" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shutter and Action Buttons */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {/* Gallery upload */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    title="Carregar fotos da galeria"
                  >
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="hidden sm:inline">Galeria</span>
                  </button>

                  {/* Shutter Capture Button */}
                  <button
                    type="button"
                    onClick={handleSnapPhoto}
                    disabled={Boolean(cameraError)}
                    className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Camera className="w-5 h-5 stroke-[2.5]" />
                    <span>
                      {capturedImages.length === 0
                        ? 'Tirar 1ª Foto (Frente)'
                        : `Tirar Foto ${capturedImages.length + 1} (Outro Ângulo)`}
                    </span>
                  </button>
                </div>

                {/* Finalize & Analyze Button if >= 1 photo is taken */}
                {capturedImages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleStartAnalysis}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 animate-pulse"
                  >
                    <Scan className="w-5 h-5 stroke-[2.5]" />
                    <span>
                      Escanear e Consolidar com IA ({capturedImages.length} {capturedImages.length === 1 ? 'Foto' : 'Fotos'})
                    </span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: ANALYZING STATE */}
          {step === 'analyzing' && (
            <div className="py-8 text-center space-y-4">
              <div className="flex justify-center gap-2 max-w-sm mx-auto overflow-hidden">
                {capturedImages.slice(0, 4).map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-emerald-500/40">
                    <img src={img} alt="Captura" className="w-full h-full object-cover opacity-50 blur-2xs" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] font-mono text-emerald-300">
                      Foto {idx + 1}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-extrabold text-white flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>A Cruzar {capturedImages.length} Fotos com IA...</span>
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Consolidando: Nome comercial, Apresentação Farmacológica, Número de Lote, Data de Fabrico, Validade e Código de Barras.
                </p>
              </div>

              {/* Badges of fields being extracted */}
              <div className="flex flex-wrap justify-center gap-1.5 pt-2 text-[10px] font-bold text-emerald-300">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                  Nome & Dosagem
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  Lote & Validade
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300">
                  Código de Barras
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & CONFIRM */}
          {step === 'review' && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {/* Photo Selector Banner */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Selecione a Foto Principal do Catálogo:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddMorePhotos}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tirar + Fotos</span>
                  </button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {capturedImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrimaryImageIndex(idx)}
                      className={`relative rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        primaryImageIndex === idx
                          ? 'border-emerald-400 ring-2 ring-emerald-500/40 scale-102'
                          : 'border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Foto ${idx + 1}`} className="w-14 h-14 object-cover" />
                      {primaryImageIndex === idx && (
                        <div className="absolute top-1 left-1 bg-emerald-500 text-slate-950 p-0.5 rounded text-[8px] font-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-slate-400 leading-tight">
                  {scannedData.confidenceNotes}
                </p>
              </div>

              {/* Editable Fields Grid */}
              <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 text-xs">
                {/* 1. Nome do Produto */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nome Comercial do Produto *
                  </label>
                  <input
                    type="text"
                    value={scannedData.name}
                    onChange={(e) => setScannedData({ ...scannedData, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                    placeholder="Ex: Paracetamol 500mg, Amoxicilina, Água Mineral Pura..."
                  />
                </div>

                {/* 2. Apresentação Farmacológica / Formato */}
                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5" />
                    <span>Apresentação Farmacológica / Formato Técnico</span>
                  </label>
                  <input
                    type="text"
                    value={scannedData.dosagePresentation}
                    onChange={(e) =>
                      setScannedData({ ...scannedData, dosagePresentation: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-emerald-300 font-semibold focus:outline-none focus:border-emerald-400"
                    placeholder="Ex: Caixa com 20 Comprimidos 500mg, Xarope 120ml, Pomada 30g..."
                  />
                </div>

                {/* 3. Categoria & Unidade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Tipo / Categoria
                    </label>
                    <input
                      type="text"
                      value={scannedData.categoryName}
                      onChange={(e) =>
                        setScannedData({ ...scannedData, categoryName: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
                      placeholder="Ex: Farmácia & Medicamentos, Bebidas, Mercearia..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Unidade de Medida
                    </label>
                    <select
                      value={scannedData.unit}
                      onChange={(e) => setScannedData({ ...scannedData, unit: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
                    >
                      <option value="un">Unidade (un)</option>
                      <option value="cx">Caixa (cx)</option>
                      <option value="pct">Pacote (pct)</option>
                      <option value="kg">Quilograma (kg)</option>
                      <option value="lt">Litro (lt)</option>
                    </select>
                  </div>
                </div>

                {/* 4. Rastreabilidade: LOTE, DATA DE FABRICAÇÃO E VENCIMENTO */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Rastreabilidade Farmacológica & Comercial:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Número do Lote */}
                    <div>
                      <label className="block text-[10px] font-bold text-amber-300 mb-1">
                        Nº do Lote
                      </label>
                      <input
                        type="text"
                        value={scannedData.batchNumber}
                        onChange={(e) =>
                          setScannedData({ ...scannedData, batchNumber: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-400"
                        placeholder="Ex: LOT-2026A"
                      />
                    </div>

                    {/* Data de Fabricação */}
                    <div>
                      <label className="block text-[10px] font-bold text-amber-300 mb-1">
                        Data de Fabricação
                      </label>
                      <input
                        type="date"
                        value={scannedData.manufacturingDate}
                        onChange={(e) =>
                          setScannedData({ ...scannedData, manufacturingDate: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Data de Vencimento / Validade */}
                    <div>
                      <label className="block text-[10px] font-bold text-amber-300 mb-1">
                        Data de Vencimento
                      </label>
                      <input
                        type="date"
                        value={scannedData.expirationDate}
                        onChange={(e) =>
                          setScannedData({ ...scannedData, expirationDate: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Código de Barras & Preço */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Código de Barras (EAN / UPC)
                    </label>
                    <div className="relative">
                      <Barcode className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={scannedData.barcode}
                        onChange={(e) =>
                          setScannedData({ ...scannedData, barcode: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                        placeholder="Ex: 560123456789"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Preço de Venda Sugerido (Kz)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={scannedData.sellingPrice || ''}
                      onChange={(e) =>
                        setScannedData({
                          ...scannedData,
                          sellingPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-black focus:outline-none focus:border-emerald-500"
                      placeholder="0 Kz"
                    />
                  </div>
                </div>
              </div>

              {/* Confirm CTA */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleRetakeAll}
                  className="py-3 px-3.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Refazer Fotos
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAndApply}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirmar e Preencher Produto</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
