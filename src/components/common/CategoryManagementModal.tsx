import React, { useState } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  FolderTree,
  Sparkles,
  Scissors,
  HeartPulse,
  Wrench,
  Coffee,
  Wine,
  Shirt,
  Smartphone,
  Tag,
  ShoppingBag,
  Utensils,
  Package,
  Store,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category } from '../../types/index.js';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCategoriesChanged: () => void;
  onSelectCategory?: (categoryId: string) => void;
}

// Available icons mapping
export const CATEGORY_ICONS: Record<string, any> = {
  Tag,
  ShoppingBag,
  Store,
  Package,
  Utensils,
  Wine,
  Coffee,
  Scissors,
  Sparkles,
  HeartPulse,
  Wrench,
  Shirt,
  Smartphone,
};

// Available vibrant color accents
export const CATEGORY_COLORS = [
  { label: 'Esmeralda', hex: '#10B981', bg: 'bg-emerald-500' },
  { label: 'Azul', hex: '#3B82F6', bg: 'bg-blue-500' },
  { label: 'Índigo', hex: '#6366F1', bg: 'bg-indigo-500' },
  { label: 'Roxo', hex: '#8B5CF6', bg: 'bg-purple-500' },
  { label: 'Rosa', hex: '#EC4899', bg: 'bg-pink-500' },
  { label: 'Laranja', hex: '#F97316', bg: 'bg-orange-500' },
  { label: 'Âmbar', hex: '#F59E0B', bg: 'bg-amber-500' },
  { label: 'Vermelho', hex: '#EF4444', bg: 'bg-red-500' },
  { label: 'Teal', hex: '#14B8A6', bg: 'bg-teal-500' },
  { label: 'Cinza', hex: '#64748B', bg: 'bg-slate-500' },
];

// Presets by SaaS business segment
const SEGMENT_PRESETS: { segment: string; items: { name: string; icon: string; color: string }[] }[] = [
  {
    segment: 'Minimercado & Mercearia',
    items: [
      { name: 'Bebidas & Sumos', icon: 'Wine', color: '#3B82F6' },
      { name: 'Alimentação Básica', icon: 'ShoppingBag', color: '#10B981' },
      { name: 'Laticínios & Queijos', icon: 'Package', color: '#F59E0B' },
      { name: 'Congelados & Carnes', icon: 'Utensils', color: '#EF4444' },
      { name: 'Higiene & Limpeza', icon: 'Sparkles', color: '#14B8A6' },
      { name: 'Padaria & Biscoitos', icon: 'Coffee', color: '#F97316' },
    ],
  },
  {
    segment: 'Salão de Beleza & Estética',
    items: [
      { name: 'Cortes & Cabelo', icon: 'Scissors', color: '#EC4899' },
      { name: 'Tratamentos & Química', icon: 'Sparkles', color: '#8B5CF6' },
      { name: 'Unhas, Manicure & Pedicure', icon: 'Sparkles', color: '#EC4899' },
      { name: 'Barbearia & Cuidados', icon: 'Scissors', color: '#6366F1' },
      { name: 'Estética Facial & Corporal', icon: 'HeartPulse', color: '#14B8A6' },
    ],
  },
  {
    segment: 'Cosméticos & Perfumaria',
    items: [
      { name: 'Perfumaria & Colónias', icon: 'Sparkles', color: '#8B5CF6' },
      { name: 'Maquilhagem & Acessórios', icon: 'Sparkles', color: '#EC4899' },
      { name: 'Cuidados com a Pele (Skincare)', icon: 'HeartPulse', color: '#10B981' },
      { name: 'Higiene Pessoal & Banho', icon: 'Sparkles', color: '#3B82F6' },
    ],
  },
  {
    segment: 'Farmácia & Saúde',
    items: [
      { name: 'Medicamentos & Genéricos', icon: 'HeartPulse', color: '#EF4444' },
      { name: 'Suplementos & Vitaminas', icon: 'HeartPulse', color: '#10B981' },
      { name: 'Primeiros Socorros & Curativos', icon: 'HeartPulse', color: '#F59E0B' },
      { name: 'Saúde do Bebé & Mamã', icon: 'HeartPulse', color: '#EC4899' },
    ],
  },
  {
    segment: 'Prestação de Serviços',
    items: [
      { name: 'Consultorias & Pareceres', icon: 'Wrench', color: '#3B82F6' },
      { name: 'Mão de Obra & Reparações', icon: 'Wrench', color: '#F97316' },
      { name: 'Design, Impressão & Cópias', icon: 'Tag', color: '#6366F1' },
      { name: 'Serviços Técnicos', icon: 'Smartphone', color: '#14B8A6' },
    ],
  },
  {
    segment: 'Boutique, Eletrónica & Outros',
    items: [
      { name: 'Roupas & Vestuário', icon: 'Shirt', color: '#EC4899' },
      { name: 'Calçados & Bolsas', icon: 'ShoppingBag', color: '#8B5CF6' },
      { name: 'Acessórios & Telemóveis', icon: 'Smartphone', color: '#3B82F6' },
      { name: 'Diversos & Artigos Gerais', icon: 'Tag', color: '#64748B' },
    ],
  },
];

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesChanged,
  onSelectCategory,
}) => {
  const { success, error } = useToast();

  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState('#10B981');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'presets'>('list');

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingCat(null);
    setName('');
    setIcon('Tag');
    setColor('#10B981');
    setActiveTab('create');
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCat(cat);
    setName(cat.name);
    setIcon(cat.icon || 'Tag');
    setColor(cat.color || '#10B981');
    setActiveTab('create');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Indique o nome da categoria');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingCat) {
        await api.updateCategory(editingCat.id, { name: name.trim(), icon, color });
        success('Categoria atualizada com sucesso!');
      } else {
        const created = await api.createCategory({ name: name.trim(), icon, color });
        success('Nova categoria adicionada!');
        if (onSelectCategory) {
          onSelectCategory(created.id);
        }
      }
      onCategoriesChanged();
      setActiveTab('list');
      setEditingCat(null);
      setName('');
    } catch (err: any) {
      error(err.message || 'Erro ao guardar categoria');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (cat.itemCount && cat.itemCount > 0) {
      if (!confirm(`A categoria "${cat.name}" contém ${cat.itemCount} produto(s). Deseja mesmo eliminá-la?`)) {
        return;
      }
    } else {
      if (!confirm(`Deseja eliminar a categoria "${cat.name}"?`)) return;
    }

    try {
      await api.deleteCategory(cat.id);
      success('Categoria removida');
      onCategoriesChanged();
    } catch (err: any) {
      error(err.message || 'Erro ao remover categoria');
    }
  };

  const handleAddPreset = async (item: { name: string; icon: string; color: string }) => {
    // Check if category already exists with same name
    const exists = categories.some((c) => c.name.toLowerCase() === item.name.toLowerCase());
    if (exists) {
      error(`A categoria "${item.name}" já está cadastrada.`);
      return;
    }

    try {
      const created = await api.createCategory(item);
      success(`Categoria "${item.name}" adicionada!`);
      onCategoriesChanged();
      if (onSelectCategory) {
        onSelectCategory(created.id);
      }
    } catch (err: any) {
      error(err.message || 'Erro ao adicionar categoria rápida');
    }
  };

  const IconComp = CATEGORY_ICONS[icon] || Tag;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 my-6 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 leading-tight">
                Gestão de Categorias de Produtos
              </h3>
              <p className="text-xs text-slate-500">
                Organize minimercados, cosméticos, salão, farmácia ou serviços
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl mt-4 shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeTab === 'list'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Minhas Categorias ({categories.length})
          </button>
          <button
            onClick={handleStartCreate}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingCat ? 'Editar' : 'Nova Categoria'}</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'presets'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Modelos Prontos</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto py-4 min-h-[300px]">
          {/* TAB 1: CATEGORIES LIST */}
          {activeTab === 'list' && (
            <div className="space-y-2.5">
              {categories.map((cat) => {
                const CatIcon = CATEGORY_ICONS[cat.icon || 'Tag'] || Tag;
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                        style={{ backgroundColor: cat.color || '#10B981' }}
                      >
                        <CatIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {cat.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {cat.itemCount || 0} produto(s) associado(s)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onSelectCategory && (
                        <button
                          onClick={() => {
                            onSelectCategory(cat.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors mr-1"
                        >
                          Selecionar
                        </button>
                      )}
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar Categoria"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar Categoria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {categories.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <FolderTree className="w-10 h-10 mx-auto mb-2 opacity-50 text-slate-400" />
                  <p className="font-bold text-slate-700 text-sm">Nenhuma categoria registada</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Crie a sua primeira categoria ou selecione dos Modelos Prontos abaixo.
                  </p>
                  <button
                    onClick={() => setActiveTab('presets')}
                    className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Ver Modelos Prontos
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE / EDIT FORM */}
          {activeTab === 'create' && (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Bebidas, Cuidados Capilares, Perfumes, Medicamentos..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Cor Temática</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                        color === c.hex
                          ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-sm'
                          : 'opacity-80 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    >
                      {color === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon picker */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Ícone Ilustrativo</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {Object.entries(CATEGORY_ICONS).map(([key, Comp]) => {
                    const isSelected = icon === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setIcon(key)}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold shadow-2xs'
                            : 'border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Comp className="w-4 h-4" />
                        <span className="text-[9px] truncate max-w-full">{key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                  style={{ backgroundColor: color }}
                >
                  <IconComp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    Pré-visualização
                  </p>
                  <p className="text-sm font-black text-slate-900 leading-tight">
                    {name.trim() || 'Nome da Categoria'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm"
                >
                  {isSubmitting ? 'A guardar...' : editingCat ? 'Salvar Alterações' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PRESETS FOR BUSINESSES */}
          {activeTab === 'presets' && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-500 text-xs">
                Toque em qualquer categoria para adicioná-la instantaneamente ao catálogo da sua loja:
              </p>

              {SEGMENT_PRESETS.map((seg, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {seg.segment}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {seg.items.map((it, itemIdx) => {
                      const PresetIcon = CATEGORY_ICONS[it.icon] || Tag;
                      const alreadyAdded = categories.some(
                        (c) => c.name.toLowerCase() === it.name.toLowerCase()
                      );

                      return (
                        <div
                          key={itemIdx}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 transition-all"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                              style={{ backgroundColor: it.color }}
                            >
                              <PresetIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-xs text-slate-800 truncate">
                              {it.name}
                            </span>
                          </div>

                          {alreadyAdded ? (
                            <span className="text-[10px] text-emerald-700 font-bold px-2 py-0.5 rounded-md bg-emerald-50">
                              Já existe
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddPreset(it)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-all active:scale-95"
                            >
                              <Plus className="w-3 h-3 stroke-[3]" />
                              <span>Adicionar</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
