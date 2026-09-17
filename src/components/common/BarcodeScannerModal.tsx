import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanBarcode, Camera, Search, X, Check, Volume2 } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);

  if (!isOpen) return null;

  const quickSamples = ['5601234001', '5601234002', '5601234003', '5601234004', '5601234005'];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      playBeep();
      onScan(manualCode.trim());
      onClose();
    }
  };

  const handleSampleClick = (code: string) => {
    playBeep();
    onScan(code);
    onClose();
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // AudioContext might be constrained
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gray-900 text-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-800"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanBarcode className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm">Leitor de Código de Barras</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Camera Scanner Viewfinder Area */}
          <div className="p-6 flex flex-col items-center justify-center relative overflow-hidden bg-black/40">
            <div className="w-64 h-44 border-2 border-emerald-500/80 rounded-2xl relative flex items-center justify-center overflow-hidden shadow-inner">
              {/* Animated Laser Scanning Bar */}
              <motion.div
                animate={{ y: [-70, 70, -70] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399]"
              />

              <div className="text-center z-10 p-4">
                <Camera className="w-8 h-8 text-gray-500 mx-auto mb-2 opacity-60" />
                <p className="text-xs text-gray-300 font-medium">Aponte a câmara para o código</p>
                <p className="text-[11px] text-emerald-400 mt-1">Câmara Ativa • Detetor Rápido</p>
              </div>

              {/* Corner brackets */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
            </div>

            <p className="text-xs text-gray-400 text-center mt-3">
              Ou selecione um código de demonstração:
            </p>

            {/* Quick barcode buttons for fast demonstration */}
            <div className="flex flex-wrap gap-1.5 justify-center mt-2 max-w-xs">
              {quickSamples.map(code => (
                <button
                  key={code}
                  onClick={() => handleSampleClick(code)}
                  className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-emerald-900/50 hover:text-emerald-300 border border-gray-700 text-xs font-mono transition-colors"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Entry Form */}
          <div className="p-4 bg-gray-800/80 border-t border-gray-800">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Digitar código manualmente..."
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-colors"
              >
                Buscar
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
