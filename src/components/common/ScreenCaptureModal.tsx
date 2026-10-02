import React, { useState, useRef, useEffect } from 'react';
import {
  Monitor,
  Check,
  X,
  Crop,
  Maximize2,
  Square,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

interface ScreenCaptureModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onApply: (croppedDataUrl: string) => void;
}

export const ScreenCaptureModal: React.FC<ScreenCaptureModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onApply,
}) => {
  const [cropMode, setCropMode] = useState<'square' | 'contain' | 'custom'>('square');
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Crop selection coordinates in percentages (0 to 1)
  const [cropRect, setCropRect] = useState({ x: 0.25, y: 0.2, width: 0.5, height: 0.6 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen && imageSrc) {
      // Initialize centered square crop
      setCropRect({ x: 0.25, y: 0.15, width: 0.5, height: 0.7 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setIsDragging(true);
    setDragStart({ x, y });
    setCropRect({ x, y, width: 0.05, height: 0.05 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const currentY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const left = Math.min(dragStart.x, currentX);
    const top = Math.min(dragStart.y, currentY);
    const width = Math.max(0.05, Math.abs(currentX - dragStart.x));
    const height = Math.max(0.05, Math.abs(currentY - dragStart.y));

    setCropRect({ x: left, y: top, width, height });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleApplyCropped = () => {
    setIsProcessing(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      if (cropMode === 'contain') {
        // Use full screenshot scaled nicely
        const MAX_DIM = 800;
        let w = img.width;
        let h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) {
            h = (h / w) * MAX_DIM;
            w = MAX_DIM;
          } else {
            w = (w / h) * MAX_DIM;
            h = MAX_DIM;
          }
        }
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
      } else {
        // Crop selected region
        const srcX = cropRect.x * img.width;
        const srcY = cropRect.y * img.height;
        const srcW = cropRect.width * img.width;
        const srcH = cropRect.height * img.height;

        const TARGET_SIZE = 600;
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, TARGET_SIZE, TARGET_SIZE);
      }

      const resultDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setIsProcessing(false);
      onApply(resultDataUrl);
      onClose();
    };
    img.src = imageSrc;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* HEADER */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">
                Captura de Ecrã Realizada
              </h3>
              <p className="text-[11px] text-slate-300">
                Selecione ou recorte a área do produto para aplicar ao cadastro
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

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Crop toolbar buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-slate-100 border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 pl-1 flex items-center gap-1.5">
              <Crop className="w-3.5 h-3.5 text-cyan-600" />
              Opção de Enquadramento:
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCropMode('square');
                  setCropRect({ x: 0.25, y: 0.15, width: 0.5, height: 0.7 });
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                  cropMode === 'square'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>Recorte Quadrado (PDV)</span>
              </button>

              <button
                type="button"
                onClick={() => setCropMode('contain')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                  cropMode === 'contain'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Usar Ecrã Inteiro</span>
              </button>
            </div>
          </div>

          {/* Interactive Screen Preview Container */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-300 bg-slate-900 select-none flex items-center justify-center max-h-[50vh]">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="relative cursor-crosshair inline-block max-w-full"
            >
              <img
                src={imageSrc}
                alt="Captura do Ecrã"
                className="max-h-[50vh] w-auto object-contain pointer-events-none block"
                draggable={false}
              />

              {/* Visual Crop Overlay (when in crop mode) */}
              {cropMode !== 'contain' && (
                <div
                  className="absolute border-2 border-cyan-400 bg-cyan-400/20 shadow-lg pointer-events-none rounded-lg"
                  style={{
                    left: `${cropRect.x * 100}%`,
                    top: `${cropRect.y * 100}%`,
                    width: `${cropRect.width * 100}%`,
                    height: `${cropRect.height * 100}%`,
                  }}
                >
                  <div className="absolute top-1 left-1 bg-cyan-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                    Área do Produto
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1">
            <Info className="w-3.5 h-3.5 text-cyan-600" />
            <span>
              {cropMode === 'contain'
                ? 'A imagem do ecrã será aplicada na íntegra ao catálogo do produto.'
                : 'Arraste o cursor sobre a imagem para ajustar o retângulo ao redor do produto.'}
            </span>
          </p>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-white text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleApplyCropped}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-extrabold shadow-md shadow-cyan-600/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isProcessing ? 'A Processar...' : 'Aplicar ao Produto'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
