import React, { useState, useEffect } from 'react';
import { Sale, Company } from '../../types/index.js';
import {
  Printer,
  Check,
  X,
  MessageSquare,
  Download,
  Copy,
  FileText,
  Phone,
  Send,
  FileCheck2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  downloadReceiptPdf,
  printReceiptDirect,
  sendReceiptViaWhatsApp,
  buildWhatsAppReceiptMessage,
  formatCurrency,
  getPaymentMethodLabel
} from '../../lib/receiptService.js';
import { useToast } from '../../context/ToastContext.js';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  company: Company | null;
  customerPhone?: string;
  onNewSale?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  company,
  customerPhone = '',
  onNewSale,
}) => {
  const { success, info } = useToast();
  const [printFormat, setPrintFormat] = useState<'thermal80' | 'a4'>('thermal80');
  const [phone, setPhone] = useState(customerPhone);
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Sync phone whenever sale or customerPhone changes
  useEffect(() => {
    if (customerPhone) {
      setPhone(customerPhone);
    } else {
      setPhone('');
    }
    setCopied(false);
  }, [customerPhone, sale]);

  if (!isOpen || !sale) return null;

  const curr = company?.currency || 'Kz';

  const handlePrint = (mode: 'thermal80' | 'a4' = printFormat) => {
    printReceiptDirect(sale, company, mode);
    info(mode === 'thermal80' ? 'Enviando recibo para impressora térmica...' : 'Abrindo impressão em formato A4...');
  };

  const handleDownloadPdf = () => {
    try {
      setIsExportingPdf(true);
      downloadReceiptPdf(sale, company);
      success(`PDF do recibo #${sale.saleNumber} baixado com sucesso!`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSendWhatsApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    sendReceiptViaWhatsApp(sale, company, phone);
    success('Abrindo WhatsApp com o recibo formatado...');
  };

  const handleCopyText = async () => {
    try {
      const msg = buildWhatsAppReceiptMessage(sale, company);
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      success('Texto do recibo copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-6 flex flex-col max-h-[92vh]"
        >
          {/* Header Action Bar */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:px-6 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
                <Check className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg leading-tight text-white flex items-center gap-2">
                  <span>Venda Concluída</span>
                  <span className="text-xs bg-emerald-500/60 px-2 py-0.5 rounded-full font-mono font-medium">
                    #{sale.saleNumber}
                  </span>
                </h3>
                <p className="text-xs text-emerald-100">Impressão direta, exportação de PDF e envio WhatsApp</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Action Bar (Direct Print & Export PDF buttons) */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Format Selector */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setPrintFormat('thermal80')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  printFormat === 'thermal80'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Térmica 80mm
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  printFormat === 'a4'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Folha A4
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePrint(printFormat)}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition-transform active:scale-95 cursor-pointer"
                title="Imprimir diretamente no formato selecionado"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Imprimir Direto</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                title="Descarregar ficheiro PDF oficial do recibo"
              >
                {isExportingPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>Baixar PDF</span>
              </button>
            </div>
          </div>

          {/* Modal Body: Scrollable area with Receipt Preview & WhatsApp Box */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-100/60">
            {/* WhatsApp Direct Dispatch Card */}
            <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3.5 sm:p-4 text-emerald-950 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-emerald-900">
                    Enviar Recibo via WhatsApp
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-white/80 hover:bg-white border border-emerald-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  title="Copiar texto formatado do recibo"
                >
                  {copied ? (
                    <>
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>
              </div>

              <form onSubmit={handleSendWhatsApp} className="flex flex-col sm:flex-row gap-2 mt-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nº WhatsApp do cliente (Ex: 923 000 000)"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs text-slate-800 placeholder-emerald-800/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors shadow-2xs active:scale-95 shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Recibo</span>
                </button>
              </form>
              <p className="text-[10px] text-emerald-700/80 mt-1.5">
                {phone.trim()
                  ? 'O WhatsApp abrirá diretamente na conversa com o número indicado.'
                  : 'Sem número: o WhatsApp abrirá para você escolher o contato da lista.'}
              </p>
            </div>

            {/* Printable Paper Preview */}
            <div
              className={`bg-white text-slate-800 font-mono text-xs rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm mx-auto transition-all ${
                printFormat === 'thermal80' ? 'max-w-md' : 'max-w-xl'
              }`}
            >
              {/* Header */}
              <div className="text-center pb-3.5 border-b border-dashed border-slate-300">
                <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-sans font-bold uppercase tracking-wider mb-1.5">
                  VendaFácil PDV
                </span>
                <h2 className="text-base font-bold text-slate-900 font-sans tracking-tight uppercase">
                  {company?.name || 'VendaFácil Comércio'}
                </h2>
                {company?.address && <p className="text-[11px] text-slate-500 mt-0.5">{company.address}</p>}
                <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap justify-center gap-x-2">
                  {company?.phone && <span>Tel: {company.phone}</span>}
                  {company?.nif && <span>NIF: {company.nif}</span>}
                </div>
              </div>

              {/* Meta details */}
              <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Recibo nº:</span>
                  <span className="font-bold text-slate-900">#{sale.saleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data e Hora:</span>
                  <span>{new Date(sale.createdAt).toLocaleString('pt-PT')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-semibold text-slate-800">{sale.customerName || 'Cliente Balcão'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Operador / Caixa:</span>
                  <span>{sale.userName || 'Caixa'}</span>
                </div>
              </div>

              {/* Table of items */}
              <div className="py-3 border-b border-dashed border-slate-300">
                <div className="text-[10px] font-bold text-slate-400 grid grid-cols-12 mb-2 pb-1 border-b border-slate-100 uppercase">
                  <span className="col-span-6">Artigo</span>
                  <span className="col-span-2 text-center">Qtd</span>
                  <span className="col-span-4 text-right">Total</span>
                </div>
                <div className="space-y-1.5">
                  {sale.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 items-baseline text-[11px]">
                      <span className="col-span-6 font-semibold text-slate-900 truncate pr-1">
                        {item.productName}
                      </span>
                      <span className="col-span-2 text-center text-slate-500 font-sans">
                        {item.quantity}x
                      </span>
                      <span className="col-span-4 text-right font-bold text-slate-900">
                        {formatCurrency(item.subtotal, curr)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(sale.subtotal, curr)}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Desconto:</span>
                    <span>-{formatCurrency(sale.discount, curr)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm sm:text-base font-bold font-sans text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>TOTAL A PAGAR:</span>
                  <span className="text-emerald-700">{formatCurrency(sale.total, curr)}</span>
                </div>

                <div className="flex justify-between pt-1 text-slate-600 text-[11px]">
                  <span>Forma de Pagamento:</span>
                  <span className="font-semibold text-slate-800">{getPaymentMethodLabel(sale.paymentMethod)}</span>
                </div>

                {sale.paymentMethod === 'credito_fiado' ? (
                  <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-amber-900 text-xs mt-2 space-y-1 font-sans">
                    <div className="flex justify-between font-semibold">
                      <span>Valor Pago Inicial:</span>
                      <span>{formatCurrency(sale.paidAmount || 0, curr)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-700 pt-1 border-t border-amber-200">
                      <span>Saldo a Receber (Fiado):</span>
                      <span>{formatCurrency(Math.max(0, sale.total - (sale.paidAmount || 0)), curr)}</span>
                    </div>
                  </div>
                ) : (
                  sale.changeAmount > 0 && (
                    <div className="flex justify-between text-slate-600 text-xs pt-0.5">
                      <span>Troco Devolvido:</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(sale.changeAmount, curr)}</span>
                    </div>
                  )
                )}
              </div>

              {/* Receipt Footer note */}
              <div className="text-center pt-3 text-[11px] text-slate-500 font-sans space-y-1">
                <p className="italic font-medium">{company?.receiptFooter || 'Obrigado pela preferência! Volte sempre.'}</p>
                <p className="text-[9px] text-slate-400">Documento emitido eletronicamente via VendaFácil SaaS</p>
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 sm:px-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 hidden sm:block">
              Recibo disponível para reimpressão posterior no PDV
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Fechar
              </button>

              {onNewSale && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNewSale();
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-transform active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Nova Venda</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
