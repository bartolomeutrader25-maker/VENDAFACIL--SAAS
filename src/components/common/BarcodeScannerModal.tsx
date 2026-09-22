import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ScanBarcode,
  Camera,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Repeat,
  Zap,
  ZapOff,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { posAudio } from '../../lib/posAudio.js';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => { found: boolean; productName?: string } | boolean | void;
  quickSamples?: string[];
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  quickSamples = ['5601234001', '5601234002', '5601234003', '5601234004', '5601234005'],
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [continuousMode, setContinuousMode] = useState(true); // default continuous for fast cashiers
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [lastScanResult, setLastScanResult] = useState<{
    code: string;
    found: boolean;
    productName?: string;
    timestamp: number;
  } | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const scannerContainerId = 'barcode-scanner-viewport';

  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1750, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // Audio context might be restricted before user interaction
    }
  };

  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80]);
      }
    } catch (e) {}
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Erro ao parar leitor de câmara:', err);
      } finally {
        html5QrCodeRef.current = null;
        setIsScanningActive(false);
        setIsTorchOn(false);
      }
    }
  };

  const handleDetectedCode = (decodedText: string) => {
    const cleanCode = decodedText.trim();
    if (!cleanCode) return;

    const now = Date.now();
    // Prevent duplicate triggers within 2.2 seconds for the same barcode
    if (cleanCode === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2200) {
      return;
    }

    lastScannedCodeRef.current = cleanCode;
    lastScannedTimeRef.current = now;

    triggerHaptic();

    // Call onScan prop
    const scanOutcome = onScan(cleanCode);
    let found = true;
    let productName: string | undefined = undefined;

    if (scanOutcome && typeof scanOutcome === 'object') {
      found = scanOutcome.found;
      productName = scanOutcome.productName;
    } else if (typeof scanOutcome === 'boolean') {
      found = scanOutcome;
    }

    if (!found) {
      posAudio.playLowStock('grave_aviso');
    }

    setLastScanResult({
      code: cleanCode,
      found,
      productName,
      timestamp: now,
    });

    if (!continuousMode) {
      // Stop and close modal after brief delay
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  const startScanner = async (cameraId?: string) => {
    setIsInitializing(true);
    setCameraError(null);

    try {
      // Stop any existing instance
      await stopScanner();

      // Ensure DOM element is present
      const container = document.getElementById(scannerContainerId);
      if (!container) {
        throw new Error('Elemento da câmara não encontrado no DOM.');
      }

      // Clear container children
      container.innerHTML = '';

      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
      });

      html5QrCodeRef.current = scanner;

      // Check available cameras
      try {
        const availableCameras = await Html5Qrcode.getCameras();
        if (availableCameras && availableCameras.length > 0) {
          setCameras(availableCameras);
        }
      } catch (camListErr) {
        console.warn('Não foi possível listar câmaras:', camListErr);
      }

      // Camera config: Prefer rear/environment camera
      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: 'environment' };

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Responsive rectangular box ideal for 1D barcodes
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const width = Math.min(Math.floor(viewfinderWidth * 0.85), 320);
          const height = Math.min(Math.floor(viewfinderHeight * 0.65), 190);
          return { width: Math.max(width, 220), height: Math.max(height, 120) };
        },
        aspectRatio: 1.333333,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      };

      await scanner.start(
        cameraConfig,
        scanConfig,
        (decodedText) => {
          handleDetectedCode(decodedText);
        },
        () => {
          // Frame without barcode, normal stream loop
        }
      );

      setIsScanningActive(true);
      setIsInitializing(false);

      // Check torch capabilities
      try {
        const capabilities: any = scanner.getRunningTrackCapabilities?.();
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch (tErr) {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.error('Erro ao iniciar câmara do leitor de código de barras:', err);
      setIsInitializing(false);
      setIsScanningActive(false);

      let msg = 'Não foi possível aceder à câmara do dispositivo.';
      const errStr = (err?.message || String(err)).toLowerCase();

      if (errStr.includes('permission') || errStr.includes('denied') || errStr.includes('notallowederror')) {
        msg = 'Permissão de câmara negada. Por favor, permita o acesso à câmara nas definições do seu navegador.';
      } else if (errStr.includes('notfounderror') || errStr.includes('devices not found')) {
        msg = 'Nenhuma câmara de vídeo foi encontrada no dispositivo.';
      } else if (errStr.includes('notreadableerror') || errStr.includes('could not start video source')) {
        msg = 'A câmara pode estar a ser usada por outra aplicação ou separador.';
      }

      setCameraError(msg);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextState = !isTorchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn('Erro ao alternar lanterna:', err);
    }
  };

  const switchCamera = async (cameraId: string) => {
    setSelectedCameraId(cameraId);
    await startScanner(cameraId);
  };

  useEffect(() => {
    if (isOpen) {
      setLastScanResult(null);
      // Wait for modal transition then mount camera
      const timer = setTimeout(() => {
        startScanner();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleDetectedCode(manualCode.trim());
      setManualCode('');
    }
  };

  const handleSampleClick = (code: string) => {
    handleDetectedCode(code);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 text-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-800 flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <ScanBarcode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <span>Leitor de Código de Barras</span>
                  {isScanningActive && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      Ao vivo
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Câmara ativa • Aponte para o código no produto
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  soundEnabled ? 'text-emerald-400 bg-emerald-950/40' : 'text-slate-500 hover:text-slate-300'
                }`}
                title={soundEnabled ? 'Som ativado (Bip)' : 'Som desativado'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Camera Viewfinder Area */}
          <div className="relative bg-black flex flex-col items-center justify-center overflow-hidden min-h-[290px] sm:min-h-[330px]">
            {/* Real Video Element Container for Html5Qrcode */}
            <div
              id={scannerContainerId}
              className="w-full h-full max-h-[330px] overflow-hidden flex items-center justify-center [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
            />

            {/* Custom Overlay Controls (Flash, Switch Cam) */}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
              {hasTorch && (
                <button
                  onClick={toggleTorch}
                  className={`w-9 h-9 rounded-xl backdrop-blur-md flex items-center justify-center transition-all ${
                    isTorchOn
                      ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30'
                      : 'bg-black/60 text-white hover:bg-black/80 border border-white/20'
                  }`}
                  title={isTorchOn ? 'Desligar Lanterna' : 'Ligar Lanterna'}
                >
                  {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                </button>
              )}

              {cameras.length > 1 && (
                <button
                  onClick={() => {
                    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
                    const nextIndex = (currentIndex + 1) % cameras.length;
                    switchCamera(cameras[nextIndex].id);
                  }}
                  className="w-9 h-9 rounded-xl bg-black/60 hover:bg-black/80 border border-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all"
                  title="Trocar Câmara"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Viewfinder Target Graphic Overlay */}
            {isScanningActive && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 z-10">
                <div className="w-full max-w-[280px] h-[160px] relative rounded-2xl border-2 border-emerald-400/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center overflow-hidden">
                  {/* Laser Scanning Animation */}
                  <motion.div
                    animate={{ y: [-70, 70, -70] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399]"
                  />

                  {/* Corner Target Markers */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-300" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-300" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-300" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-300" />

                  <span className="text-[11px] font-semibold text-emerald-300/90 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
                    Alinhe o código de barras aqui
                  </span>
                </div>
              </div>
            )}

            {/* Loading / Initializing Screen */}
            {isInitializing && !cameraError && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 z-30">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-semibold text-slate-200">A iniciar câmara do dispositivo...</p>
                <p className="text-[11px] text-slate-400 mt-1">A preparar leitor de código de barras</p>
              </div>
            )}

            {/* Camera Permission / Error Screen */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-30 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-100 mb-1">Câmara Indisponível</h4>
                  <p className="text-xs text-slate-400 max-w-xs">{cameraError}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => startScanner(selectedCameraId)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            )}

            {/* Live Scan Notification Toast inside Viewfinder */}
            <AnimatePresence>
              {lastScanResult && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className={`absolute bottom-3 left-3 right-3 z-30 p-2.5 rounded-2xl backdrop-blur-md border shadow-lg flex items-center gap-2.5 ${
                    lastScanResult.found
                      ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                      : 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      lastScanResult.found ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {lastScanResult.found ? (
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-bold text-xs truncate">
                      {lastScanResult.found
                        ? lastScanResult.productName || 'Produto adicionado ao carrinho!'
                        : 'Produto não encontrado'}
                    </p>
                    <p className="text-[10px] opacity-80 font-mono truncate">
                      Código: {lastScanResult.code}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Bar: Continuous Mode Toggle & Quick Info */}
          <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setContinuousMode(!continuousMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  continuousMode
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
                title="Quando ativado, mantém o leitor aberto para bipar vários produtos em sequência"
              >
                <Repeat className="w-3 h-3" />
                <span>Modo Contínuo: {continuousMode ? 'Ligado' : 'Desligado'}</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400">
              {continuousMode ? 'Bipe vários itens sem fechar' : 'Fecha ao ler primeiro item'}
            </span>
          </div>

          {/* Manual Entry Form and Quick Demo Barcodes */}
          <div className="p-4 bg-slate-950 border-t border-slate-800/80 space-y-3">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Digitar código manualmente..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
              >
                Adicionar
              </button>
            </form>

            {/* Quick Demo Test Buttons */}
            {quickSamples && quickSamples.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Testar com Códigos de Exemplo:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quickSamples.slice(0, 5).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleSampleClick(code)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-800 text-[11px] font-mono text-slate-300 transition-colors"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
