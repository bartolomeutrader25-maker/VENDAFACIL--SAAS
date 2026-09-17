import React, { useRef } from 'react';
import { Sale, Company } from '../../types/index.js';
import { Share2, Printer, Check, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  company: Company | null;
  onNewSale?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  company,
  onNewSale,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !sale) return null;

  const curr = company?.currency || 'Kz';

  const formatCurrency = (val: number) => {
    return `${val.toLocaleString('pt-PT')} ${curr}`;
  };

  const getPaymentLabel = (method: string) => {
    const map: Record<string, string> = {
      dinheiro: 'Dinheiro (Numerário)',
      multicaixa_express: 'Multicaixa Express',
      transferencia: 'Transferência Bancária',
      cartao: 'Cartão de Débito / TPA',
      credito_fiado: 'Crédito / Fiado',
      outro: 'Outro',
    };
    return map[method] || method;
  };

  const generateWhatsAppMessage = () => {
    const itemsList = sale.items
      .map(
        item =>
          `• ${item.productName} (${item.quantity}x) = ${formatCurrency(item.subtotal)}`
      )
      .join('\n');

    const msg = `🧾 *RECIBO DIGITAL - VENDAFÁCIL*
*${company?.name || 'VendaFácil'}*
${company?.phone ? `Tel: ${company.phone}` : ''}
${company?.nif ? `NIF: ${company.nif}` : ''}
---------------------------------
*Venda:* #${sale.saleNumber}
*Data:* ${new Date(sale.createdAt).toLocaleString('pt-PT')}
*Cliente:* ${sale.customerName || 'Consumidor Final'}
*Operador:* ${sale.userName}
---------------------------------
*ITENS:*
${itemsList}
---------------------------------
*Subtotal:* ${formatCurrency(sale.subtotal)}
${sale.discount > 0 ? `*Desconto:* -${formatCurrency(sale.discount)}\n` : ''}*TOTAL:* ${formatCurrency(sale.total)}
*Pagamento:* ${getPaymentLabel(sale.paymentMethod)}
${sale.paymentMethod === 'credito_fiado' ? `*Valor Pago:* ${formatCurrency(sale.paidAmount)}\n*Saldo Pendente:* ${formatCurrency(sale.total - sale.paidAmount)}` : ''}
---------------------------------
_${company?.receiptFooter || 'Obrigado pela preferência! Volte sempre.'}_`;

    return encodeURIComponent(msg);
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${generateWhatsAppMessage()}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 my-8"
        >
          {/* Header Action Bar */}
          <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">Venda Concluída!</h3>
                <p className="text-xs text-emerald-100">Recibo #{sale.saleNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Printable Receipt Paper */}
          <div className="p-6 bg-amber-50/40 text-gray-800 font-mono text-sm max-h-[60vh] overflow-y-auto" ref={receiptRef}>
            <div className="text-center pb-4 border-b border-dashed border-gray-300">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-sans font-semibold mb-1">
                VENDAFÁCIL PDV
              </span>
              <h2 className="text-lg font-bold text-gray-900 font-sans tracking-tight">
                {company?.name || 'Minha Empresa'}
              </h2>
              {company?.address && <p className="text-xs text-gray-600">{company.address}</p>}
              <div className="text-xs text-gray-500 mt-1 flex flex-wrap justify-center gap-x-3">
                {company?.phone && <span>Tel: {company.phone}</span>}
                {company?.nif && <span>NIF: {company.nif}</span>}
              </div>
            </div>

            <div className="py-3 border-b border-dashed border-gray-300 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Recibo nº:</span>
                <span className="font-bold text-gray-800">{sale.saleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Data/Hora:</span>
                <span>{new Date(sale.createdAt).toLocaleString('pt-PT')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente:</span>
                <span className="font-semibold text-gray-800">{sale.customerName || 'Cliente Balcão'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Operador:</span>
                <span>{sale.userName}</span>
              </div>
            </div>

            {/* Table of items */}
            <div className="py-3 border-b border-dashed border-gray-300">
              <div className="text-xs font-bold text-gray-500 grid grid-cols-12 mb-2 pb-1 border-b border-gray-200">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qtd</span>
                <span className="col-span-4 text-right">Total</span>
              </div>
              <div className="space-y-2 text-xs">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-center">
                    <span className="col-span-6 font-medium text-gray-900 truncate pr-1">
                      {item.productName}
                    </span>
                    <span className="col-span-2 text-center text-gray-600">
                      {item.quantity}
                    </span>
                    <span className="col-span-4 text-right font-semibold text-gray-900">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="py-3 border-b border-dashed border-gray-300 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Desconto:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold font-sans text-gray-900 pt-1 border-t border-gray-200">
                <span>TOTAL A PAGAR:</span>
                <span className="text-emerald-700">{formatCurrency(sale.total)}</span>
              </div>
              <div className="flex justify-between pt-1 text-gray-600">
                <span>Forma de Pagamento:</span>
                <span className="font-semibold text-gray-900">{getPaymentLabel(sale.paymentMethod)}</span>
              </div>
              {sale.paymentMethod === 'credito_fiado' ? (
                <div className="bg-amber-100 p-2 rounded-lg text-amber-900 text-xs mt-2 space-y-1 font-sans">
                  <div className="flex justify-between font-semibold">
                    <span>Valor Pago Inicial:</span>
                    <span>{formatCurrency(sale.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-rose-700">
                    <span>Saldo a Receber (Fiado):</span>
                    <span>{formatCurrency(sale.total - sale.paidAmount)}</span>
                  </div>
                </div>
              ) : (
                sale.changeAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Troco:</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(sale.changeAmount)}</span>
                  </div>
                )
              )}
            </div>

            {/* Receipt Footer */}
            <div className="text-center pt-4 text-xs text-gray-500 font-sans">
              <p className="italic">{company?.receiptFooter || 'Obrigado pela preferência!'}</p>
              <p className="text-[10px] text-gray-400 mt-2">Emitido eletronicamente via VendaFácil SaaS</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={handleShareWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-medium text-sm transition-colors shadow-sm active:scale-98"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Enviar no WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 py-3 px-4 rounded-xl font-medium text-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {onNewSale && (
              <button
                onClick={() => {
                  onClose();
                  onNewSale();
                }}
                className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white py-3 px-4 rounded-xl font-medium text-sm transition-colors"
              >
                <span>Próxima Venda</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
