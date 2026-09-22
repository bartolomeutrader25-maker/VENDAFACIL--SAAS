import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  X,
  Play,
  Check,
  BellRing,
  ShoppingBag,
  AlertTriangle,
  Sliders,
  Sparkles
} from 'lucide-react';
import {
  posAudio,
  PosAudioSettings,
  SaleSuccessSoundType,
  LowStockSoundType,
  ItemAddedSoundType
} from '../../lib/posAudio.js';

interface PosSoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PosSoundSettingsModal: React.FC<PosSoundSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<PosAudioSettings>(() => posAudio.getSettings());

  useEffect(() => {
    if (isOpen) {
      setSettings(posAudio.getSettings());
    }
  }, [isOpen]);

  const updateSetting = <K extends keyof PosAudioSettings>(key: K, value: PosAudioSettings[K]) => {
    const updated = posAudio.saveSettings({ [key]: value });
    setSettings(updated);
  };

  const handleTestSaleSound = (type: SaleSuccessSoundType) => {
    posAudio.playSaleSuccess(type);
  };

  const handleTestLowStockSound = (type: LowStockSoundType) => {
    posAudio.playLowStock(type);
  };

  const handleTestItemAddedSound = (type: ItemAddedSoundType) => {
    posAudio.playItemAdded(type);
  };

  if (!isOpen) return null;

  const saleSuccessOptions: { id: SaleSuccessSoundType; name: string; desc: string }[] = [
    {
      id: 'caixa_registadora',
      name: 'Caixa Registadora Clássica (Ka-Ching)',
      desc: 'Sino metálico nítido com ressonância de moedas. Ótimo para balcões movimentados.',
    },
    {
      id: 'fanfarra_vitoria',
      name: 'Fanfarra Triunfal',
      desc: 'Melodia ascendente alegre de 4 notas. Celebra a venda com energia.',
    },
    {
      id: 'chime_moderno',
      name: 'Chime Melódico Digital',
      desc: 'Acorde duplo suave e elegante, perfeito para lojas boutique.',
    },
    {
      id: 'suave',
      name: 'Confirmação Discreta',
      desc: 'Toque simples e curto de baixa intensidade.',
    },
  ];

  const lowStockOptions: { id: LowStockSoundType; name: string; desc: string }[] = [
    {
      id: 'triplo_urgente',
      name: 'Triplo Pulso de Urgência (Recomendado)',
      desc: '3 alertas rápidos consecutivos de alta frequência, impossível de ignorar no ruído da loja.',
    },
    {
      id: 'grave_aviso',
      name: 'Acorde Grave Dissonante',
      desc: 'Frequência baixa com textura de alerta para indicar rutura de stock imediata.',
    },
    {
      id: 'sino_atencao',
      name: 'Sino Metálico de Atenção',
      desc: 'Dois tons metálicos descendentes para alertar que o produto atingiu o mínimo.',
    },
    {
      id: 'sirene_curta',
      name: 'Sirene de Varredura Rápida',
      desc: 'Efeito sonoro de subida e descida expressivo.',
    },
  ];

  const itemAddedOptions: { id: ItemAddedSoundType; name: string; desc: string }[] = [
    {
      id: 'bip_laser',
      name: 'Bip Laser de Retalho',
      desc: 'O som autêntico dos leitores de código de barras de supermercado.',
    },
    {
      id: 'gota_d_agua',
      name: 'Pop Suave / Gota',
      desc: 'Estilo moderno de interface de utilizador.',
    },
    {
      id: 'suave',
      name: 'Clique Discreto',
      desc: 'Apenas uma confirmação sutil de adição.',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Alertas Sonoros do PDV</h3>
                <p className="text-xs text-slate-500">
                  Personalize sons para ambientes ruidosos e feedback de caixa
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
            {/* Master Toggle & Volume Slider */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Sons do Caixa Ativos</h4>
                  <p className="text-xs text-slate-500">Emitir alertas ao vender ou bipar produtos</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('enabled', !settings.enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {settings.enabled && (
                <div className="pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-slate-400" />
                      Volume dos Alertas
                    </span>
                    <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {Math.round(settings.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={settings.volume}
                    onChange={(e) => {
                      const vol = parseFloat(e.target.value);
                      updateSetting('volume', vol);
                    }}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Discreto (10%)</span>
                    <span>Padrão (80%)</span>
                    <span>Máximo / Balcão Cheio (100%)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 1: Confirmação de Venda Bem-Sucedida */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Confirmação de Venda (Sucesso)</h4>
                  <p className="text-xs text-slate-500">Tocado instantaneamente ao finalizar a venda no caixa</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {saleSuccessOptions.map((opt) => {
                  const isSelected = settings.saleSuccessSound === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => updateSetting('saleSuccessSound', opt.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-emerald-50/70 border-emerald-500 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                            {opt.name}
                          </p>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{opt.desc}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestSaleSound(opt.id);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-100 border border-slate-200 text-slate-700 hover:text-emerald-800 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                        title="Ouvir teste"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Ouvir</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Alerta de Stock Baixo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Alerta de Stock Baixo / Esgotado</h4>
                  <p className="text-xs text-slate-500">Tocado ao adicionar um artigo com stock igual ou inferior ao mínimo</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {lowStockOptions.map((opt) => {
                  const isSelected = settings.lowStockSound === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => updateSetting('lowStockSound', opt.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-50/70 border-amber-500 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-amber-600 bg-amber-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isSelected ? 'text-amber-950' : 'text-slate-800'}`}>
                            {opt.name}
                          </p>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{opt.desc}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestLowStockSound(opt.id);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-100 border border-slate-200 text-slate-700 hover:text-amber-800 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                        title="Ouvir teste"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Ouvir</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Bip de Adição de Artigo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <BellRing className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Bip de Adição / Leitura de Artigo</h4>
                  <p className="text-xs text-slate-500">Tocado ao clicar num produto ou bipar código de barras</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {itemAddedOptions.map((opt) => {
                  const isSelected = settings.itemAddedSound === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => updateSetting('itemAddedSound', opt.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-500 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                            {opt.name}
                          </p>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{opt.desc}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestItemAddedSound(opt.id);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-blue-100 border border-slate-200 text-slate-700 hover:text-blue-800 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                        title="Ouvir teste"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Ouvir</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Sons gravados e persistidos localmente no navegador
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Concluído
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
