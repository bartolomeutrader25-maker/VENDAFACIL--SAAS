import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Trash2, Image as ImageIcon, Sparkles, Camera } from 'lucide-react';
import { ProductThumbnail } from './ProductThumbnail.js';

interface ProductImageUploaderProps {
  imageUrl: string;
  onChange: (url: string) => void;
  productName: string;
  categoryName?: string;
}

const SAMPLE_IMAGES = [
  {
    category: 'Minimercado & Bebidas',
    items: [
      { name: 'Água Mineral', url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80' },
      { name: 'Sumo / Refrigerante', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80' },
      { name: 'Cerveja / Bebida', url: 'https://images.unsplash.com/photo-1608270118318-7f9202534571?w=400&auto=format&fit=crop&q=80' },
      { name: 'Arroz & Cereais', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80' },
      { name: 'Óleo Alimentar', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80' },
      { name: 'Pão & Padaria', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80' },
    ]
  },
  {
    category: 'Salão & Cosméticos',
    items: [
      { name: 'Corte de Cabelo', url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&auto=format&fit=crop&q=80' },
      { name: 'Barba & Bigode', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&auto=format&fit=crop&q=80' },
      { name: 'Unhas & Manicure', url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=400&auto=format&fit=crop&q=80' },
      { name: 'Perfume Luxo', url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&auto=format&fit=crop&q=80' },
      { name: 'Creme & Skincare', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80' },
      { name: 'Maquilhagem & Batom', url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&auto=format&fit=crop&q=80' },
    ]
  },
  {
    category: 'Farmácia & Serviços',
    items: [
      { name: 'Medicamento / Comprimidos', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80' },
      { name: 'Vitaminas & Xaropes', url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=80' },
      { name: 'Serviço Técnico / Reparação', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80' },
      { name: 'Informática & Telemóveis', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02560?w=400&auto=format&fit=crop&q=80' },
    ]
  }
];

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  imageUrl,
  onChange,
  productName,
  categoryName,
}) => {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showSampleGallery, setShowSampleGallery] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress image client-side to keep base64 ultra lightweight
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          onChange(dataUrl);
        }
        setIsProcessing(false);
      };
      img.onerror = () => {
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (urlDraft.trim()) {
      onChange(urlDraft.trim());
      setShowUrlInput(false);
      setUrlDraft('');
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="font-bold text-slate-700 text-xs">
          Imagem do Produto (Opcional)
        </label>
        <span className="text-[10px] text-slate-400">
          Aparecerá visível nas vendas do PDV
        </span>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
        {/* Preview box */}
        <div className="relative">
          <ProductThumbnail
            imageUrl={imageUrl}
            name={productName || 'Produto'}
            categoryName={categoryName}
            size="lg"
            className="rounded-xl ring-2 ring-white shadow-sm"
          />
          {imageUrl && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm hover:bg-rose-600 transition-colors"
              title="Remover imagem"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Upload Buttons */}
        <div className="flex-1 space-y-1.5 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isProcessing ? 'A carregar...' : imageUrl ? 'Alterar Foto' : 'Carregar / Tirar Foto'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-700 text-slate-600 text-xs font-semibold transition-all shadow-2xs"
            >
              <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
              <span>Link URL</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSampleGallery(!showSampleGallery)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-amber-500 hover:text-amber-700 text-slate-600 text-xs font-semibold transition-all shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Modelos</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-400 truncate">
            {imageUrl ? 'Imagem pronta para o catálogo e PDV' : 'Sem foto: usará o ícone visual da categoria'}
          </p>
        </div>
      </div>

      {/* URL Input Modal Drawer */}
      {showUrlInput && (
        <div className="flex gap-1.5 p-2 rounded-xl bg-blue-50/70 border border-blue-200">
          <input
            type="url"
            placeholder="https://exemplo.com/foto-produto.jpg"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            className="flex-1 bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
          >
            Aplicar
          </button>
        </div>
      )}

      {/* Sample Gallery Grid */}
      {showSampleGallery && (
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Selecione uma imagem de exemplo:</span>
            <button
              type="button"
              onClick={() => setShowSampleGallery(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              Fechar
            </button>
          </div>

          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {SAMPLE_IMAGES.map((sec, idx) => (
              <div key={idx} className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {sec.category}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {sec.items.map((item, itemIdx) => (
                    <button
                      key={itemIdx}
                      type="button"
                      onClick={() => {
                        onChange(item.url);
                        setShowSampleGallery(false);
                      }}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 hover:border-emerald-500 aspect-square transition-all shadow-2xs hover:scale-105"
                      title={item.name}
                    >
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] font-bold py-0.5 px-1 truncate block text-center">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
