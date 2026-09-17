import React, { useState } from 'react';
import { Package, Sparkles, ShoppingBag, Coffee, Wine, Scissors, HeartPulse, Wrench } from 'lucide-react';

interface ProductThumbnailProps {
  imageUrl?: string;
  name: string;
  categoryName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'pos-card' | 'full';
  className?: string;
}

export const ProductThumbnail: React.FC<ProductThumbnailProps> = ({
  imageUrl,
  name,
  categoryName,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  // Return appropriate fallback icon based on category name or keywords
  const getFallbackIcon = () => {
    const cat = (categoryName || '').toLowerCase();
    const nm = (name || '').toLowerCase();

    if (cat.includes('bebid') || nm.includes('sumo') || nm.includes('cerveja') || nm.includes('água') || nm.includes('cuca')) {
      return <Wine className="w-1/2 h-1/2 text-blue-500" />;
    }
    if (cat.includes('café') || cat.includes('padari') || nm.includes('bolo') || nm.includes('pão')) {
      return <Coffee className="w-1/2 h-1/2 text-amber-600" />;
    }
    if (cat.includes('cabel') || cat.includes('salão') || cat.includes('barb') || nm.includes('corte')) {
      return <Scissors className="w-1/2 h-1/2 text-pink-500" />;
    }
    if (cat.includes('cosmétic') || cat.includes('perfum') || cat.includes('beleza') || nm.includes('creme')) {
      return <Sparkles className="w-1/2 h-1/2 text-purple-500" />;
    }
    if (cat.includes('farmác') || cat.includes('saúde') || cat.includes('medic') || nm.includes('comprim')) {
      return <HeartPulse className="w-1/2 h-1/2 text-rose-500" />;
    }
    if (cat.includes('serviç') || nm.includes('reparaç') || nm.includes('mão de obra')) {
      return <Wrench className="w-1/2 h-1/2 text-orange-500" />;
    }
    if (cat.includes('aliment') || cat.includes('mercear') || cat.includes('minimerc')) {
      return <ShoppingBag className="w-1/2 h-1/2 text-emerald-600" />;
    }
    return <Package className="w-1/2 h-1/2 text-slate-400" />;
  };

  const dimensions = {
    xs: 'w-7 h-7 rounded-lg text-[9px]',
    sm: 'w-9 h-9 rounded-xl text-[10px]',
    md: 'w-12 h-12 rounded-xl text-xs',
    lg: 'w-16 h-16 rounded-2xl text-sm',
    'pos-card': 'w-full h-24 sm:h-28 rounded-xl',
    full: 'w-full h-full rounded-xl',
  }[size];

  if (imageUrl && !hasError) {
    return (
      <div
        className={`relative overflow-hidden shrink-0 bg-slate-100 border border-slate-200/80 shadow-2xs flex items-center justify-center ${dimensions} ${className}`}
      >
        <img
          src={imageUrl}
          alt={name}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover object-center"
          loading="lazy"
        />
      </div>
    );
  }

  // Elegant fallback placeholder with subtle pattern & initial letter / icon
  const firstLetter = name.trim().charAt(0).toUpperCase() || 'P';

  return (
    <div
      className={`relative overflow-hidden shrink-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200/80 border border-slate-200/80 shadow-2xs flex items-center justify-center select-none ${dimensions} ${className}`}
      title={name}
    >
      {size === 'pos-card' ? (
        <div className="flex flex-col items-center justify-center gap-1 opacity-70">
          {getFallbackIcon()}
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
            {categoryName || 'Produto'}
          </span>
        </div>
      ) : size === 'xs' || size === 'sm' ? (
        <span className="font-black text-slate-500">{firstLetter}</span>
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          {getFallbackIcon()}
        </div>
      )}
    </div>
  );
};
