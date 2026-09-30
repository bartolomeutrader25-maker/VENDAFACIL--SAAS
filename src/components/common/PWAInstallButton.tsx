import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';
import { Download, Smartphone, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as standalone PWA, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-sm shadow-emerald-950/40 active:scale-95 transition-all cursor-pointer ${className}`}
        title="Instalar VendaFácil como App no seu dispositivo"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 active:scale-95 transition-colors cursor-pointer ${className}`}
          title="Instalar no iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <Smartphone className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-white mb-2">
                Instalar no iPhone ou iPad
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed space-y-2 mb-4">
                1. Toque no botão de <strong>Partilhar</strong> (ícone do quadrado com seta para cima) na barra do Safari.<br />
                2. Deslize para baixo e toque em <strong>«Adicionar ao Ecrã Principal»</strong>.<br />
                3. O VendaFácil funcionará como um aplicativo nativo e offline!
              </p>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white transition active:scale-98 cursor-pointer"
              >
                Compreendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
