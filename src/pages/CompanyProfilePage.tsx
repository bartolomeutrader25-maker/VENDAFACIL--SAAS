import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  CheckCircle2,
  Sparkles,
  CreditCard
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const CompanyProfilePage: React.FC = () => {
  const { company, setCompany, updateCompanyData } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState(company?.name || '');
  const [nif, setNif] = useState(company?.nif || '');
  const [phone, setPhone] = useState(company?.phone || '');
  const [email, setEmail] = useState(company?.email || '');
  const [address, setAddress] = useState(company?.address || '');
  const [currency, setCurrency] = useState(company?.currency || 'Kz');
  const [receiptFooter, setReceiptFooter] = useState(
    company?.receiptFooter || 'Obrigado pela preferência! Volte sempre.'
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setNif(company.nif || '');
      setPhone(company.phone || '');
      setEmail(company.email || '');
      setAddress(company.address || '');
      setCurrency(company.currency || 'Kz');
      if (company.receiptFooter) setReceiptFooter(company.receiptFooter);
    }
  }, [company?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const updated = await api.updateCompanyProfile({
        name,
        nif,
        phone,
        email,
        address,
        currency,
        receiptFooter,
      });

      if (setCompany) setCompany(updated);
      else if (updateCompanyData) updateCompanyData(updated);
      success('Dados da empresa atualizados com sucesso!');
    } catch (e: any) {
      error(e.message || 'Erro ao atualizar empresa');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Perfil da Empresa & Configurações
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Identificação fiscal, moeda do sistema e personalização dos recibos digitais
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Business Info */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <span>Dados Gerais do Negócio</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nome Comercial da Empresa *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">NIF / Número Fiscal</label>
              <input
                type="text"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                placeholder="Ex: 5000123456"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Telefone Principal / WhatsApp</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+244 923 000 000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email de Contacto</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@empresa.ao"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Endereço Físico / Bairro / Cidade</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Avenida 4 de Fevereiro, Maianga, Luanda"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Currency & Receipt Customization */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>Moeda & Recibos de Venda</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Símbolo da Moeda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="Kz">Kwanza Angolano (Kz)</option>
                <option value="MT">Metical Moçambicano (MT)</option>
                <option value="€">Euro (€)</option>
                <option value="$">Dólar ($)</option>
                <option value="R$">Real Brasileiro (R$)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mensagem de Rodapé no Recibo Digital
              </label>
              <input
                type="text"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'A guardar...' : 'Guardar Alterações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
