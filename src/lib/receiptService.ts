import { jsPDF } from 'jspdf';
import { Sale, Company } from '../types/index.js';

export const getPaymentMethodLabel = (method: string): string => {
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

export const formatCurrency = (val: number, currency: string = 'Kz'): string => {
  return `${(val || 0).toLocaleString('pt-PT')} ${currency}`;
};

/**
 * Generates a formatted WhatsApp text message for the sale receipt
 */
export const buildWhatsAppReceiptMessage = (sale: Sale, company: Company | null): string => {
  const curr = company?.currency || 'Kz';

  const itemsList = sale.items
    .map(
      (item) =>
        `▪ *${item.productName}*\n  ${item.quantity} x ${formatCurrency(item.unitPrice, curr)} = *${formatCurrency(item.subtotal, curr)}*`
    )
    .join('\n');

  let fiadoDetails = '';
  if (sale.paymentMethod === 'credito_fiado') {
    const pending = Math.max(0, sale.total - (sale.paidAmount || 0));
    fiadoDetails = `*Entrada Paga:* ${formatCurrency(sale.paidAmount || 0, curr)}\n*Saldo Pendente (Dívida):* ${formatCurrency(pending, curr)}\n`;
  } else if (sale.changeAmount > 0) {
    fiadoDetails = `*Troco:* ${formatCurrency(sale.changeAmount, curr)}\n`;
  }

  const msg = `🧾 *RECIBO DE VENDA*
*${company?.name || 'VendaFácil Comércio'}*
${company?.phone ? `📞 Tel: ${company.phone}` : ''}
${company?.nif ? `🆔 NIF: ${company.nif}` : ''}
${company?.address ? `📍 ${company.address}` : ''}
━━━━━━━━━━━━━━━━━━━━
*Recibo:* #${sale.saleNumber}
*Data:* ${new Date(sale.createdAt).toLocaleString('pt-PT')}
*Cliente:* ${sale.customerName || 'Cliente Balcão'}
*Operador:* ${sale.userName || 'Caixa'}
━━━━━━━━━━━━━━━━━━━━
*ITENS COMPRADOS:*
${itemsList}
━━━━━━━━━━━━━━━━━━━━
*Subtotal:* ${formatCurrency(sale.subtotal, curr)}
${sale.discount > 0 ? `*Desconto:* -${formatCurrency(sale.discount, curr)}\n` : ''}*TOTAL A PAGAR:* ${formatCurrency(sale.total, curr)}
*Forma de Pagamento:* ${getPaymentMethodLabel(sale.paymentMethod)}
${fiadoDetails}━━━━━━━━━━━━━━━━━━━━
_${company?.receiptFooter || 'Obrigado pela sua preferência! Volte sempre.'}_
_Emitido via VendaFácil SaaS_`;

  return msg;
};

/**
 * Open WhatsApp with pre-filled receipt text and phone number
 */
export const sendReceiptViaWhatsApp = (
  sale: Sale,
  company: Company | null,
  recipientPhone?: string
): void => {
  const message = buildWhatsAppReceiptMessage(sale, company);
  const encoded = encodeURIComponent(message);

  let cleanPhone = (recipientPhone || '').replace(/\D/g, '');
  // If Angolan phone number with 9 digits, ensure international prefix 244
  if (cleanPhone.length === 9 && cleanPhone.startsWith('9')) {
    cleanPhone = '244' + cleanPhone;
  }

  const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
};

/**
 * Generate and download a crisp, professional PDF receipt using jsPDF
 */
export const downloadReceiptPdf = (sale: Sale, company: Company | null): void => {
  const curr = company?.currency || 'Kz';
  // Standard 80mm receipt format (width: 80mm, dynamic height) or A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200 + sale.items.length * 9],
  });

  const pageWidth = 80;
  let y = 10;

  // Header - Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(company?.name || 'VendaFácil PDV', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);

  if (company?.address) {
    doc.text(company.address, pageWidth / 2, y, { align: 'center', maxWidth: 70 });
    y += 4;
  }

  const contacts = [];
  if (company?.phone) contacts.push(`Tel: ${company.phone}`);
  if (company?.nif) contacts.push(`NIF: ${company.nif}`);
  if (contacts.length > 0) {
    doc.text(contacts.join(' | '), pageWidth / 2, y, { align: 'center' });
    y += 4.5;
  }

  // Divider Line
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, y, 75, y);
  y += 4;

  // Receipt Meta Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text(`RECIBO DE VENDA #${sale.saleNumber}`, pageWidth / 2, y, { align: 'center' });
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);

  doc.text(`Data: ${new Date(sale.createdAt).toLocaleString('pt-PT')}`, 6, y);
  y += 3.5;
  doc.text(`Cliente: ${sale.customerName || 'Cliente Balcão'}`, 6, y);
  y += 3.5;
  doc.text(`Operador: ${sale.userName || 'Caixa'}`, 6, y);
  y += 4;

  // Items Header
  doc.setLineDashPattern([], 0);
  doc.setFillColor(245, 245, 245);
  doc.rect(5, y, 70, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  doc.text('Item', 7, y + 3.5);
  doc.text('Qtd', 46, y + 3.5, { align: 'center' });
  doc.text('Total', 73, y + 3.5, { align: 'right' });
  y += 6.5;

  // Items List
  doc.setFont('helvetica', 'normal');
  sale.items.forEach((item) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(20, 20, 20);
    doc.text(item.productName, 7, y, { maxWidth: 36 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    doc.text(`${item.quantity}x`, 46, y, { align: 'center' });
    doc.text(formatCurrency(item.subtotal, curr), 73, y, { align: 'right' });

    y += 4.5;
  });

  y += 1;
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, y, 75, y);
  y += 4;

  // Totals Section
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);

  doc.text('Subtotal:', 7, y);
  doc.text(formatCurrency(sale.subtotal, curr), 73, y, { align: 'right' });
  y += 4;

  if (sale.discount > 0) {
    doc.setTextColor(180, 40, 40);
    doc.text('Desconto:', 7, y);
    doc.text(`-${formatCurrency(sale.discount, curr)}`, 73, y, { align: 'right' });
    y += 4;
  }

  // Grand Total Box
  doc.setFillColor(236, 253, 245); // light emerald
  doc.rect(5, y, 70, 7.5, 'F');
  doc.setDrawColor(16, 185, 129);
  doc.setLineDashPattern([], 0);
  doc.rect(5, y, 70, 7.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(6, 95, 70); // dark emerald
  doc.text('TOTAL:', 8, y + 5);
  doc.text(formatCurrency(sale.total, curr), 72, y + 5, { align: 'right' });
  y += 10.5;

  // Payment details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);

  doc.text(`Forma Pagamento: ${getPaymentMethodLabel(sale.paymentMethod)}`, 7, y);
  y += 3.8;

  if (sale.paymentMethod === 'credito_fiado') {
    const pending = Math.max(0, sale.total - (sale.paidAmount || 0));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 40, 40);
    doc.text(`Valor Pago: ${formatCurrency(sale.paidAmount || 0, curr)}`, 7, y);
    y += 3.8;
    doc.text(`Saldo em Dívida: ${formatCurrency(pending, curr)}`, 7, y);
    y += 4.5;
  } else if (sale.changeAmount > 0) {
    doc.text(`Troco Devolvido: ${formatCurrency(sale.changeAmount, curr)}`, 7, y);
    y += 4;
  }

  // Footer Message
  y += 2;
  doc.setDrawColor(210, 210, 210);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, y, 75, y);
  y += 4;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(company?.receiptFooter || 'Obrigado pela preferência! Volte sempre.', pageWidth / 2, y, {
    align: 'center',
    maxWidth: 68,
  });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(140, 140, 140);
  doc.text('Emitido via VendaFácil SaaS • Software Certificado', pageWidth / 2, y, { align: 'center' });

  // Download PDF
  doc.save(`Recibo-${sale.saleNumber}.pdf`);
};

/**
 * Direct print receipt via an isolated hidden iframe with thermal ticket CSS
 */
export const printReceiptDirect = (
  sale: Sale,
  company: Company | null,
  mode: 'thermal80' | 'a4' = 'thermal80'
): void => {
  const curr = company?.currency || 'Kz';

  const itemsHtml = sale.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 3px 0; text-align: left; vertical-align: top;">
          <strong>${escapeHtml(item.productName)}</strong>
        </td>
        <td style="padding: 3px 0; text-align: center; vertical-align: top;">
          ${item.quantity}
        </td>
        <td style="padding: 3px 0; text-align: right; vertical-align: top;">
          ${formatCurrency(item.subtotal, curr)}
        </td>
      </tr>
    `
    )
    .join('');

  const fiadoHtml =
    sale.paymentMethod === 'credito_fiado'
      ? `
      <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 6px; border-radius: 4px; margin-top: 6px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Valor Pago Inicial:</span>
          <strong>${formatCurrency(sale.paidAmount || 0, curr)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; color: #b91c1c; font-weight: bold; margin-top: 2px;">
          <span>Saldo em Dívida (Fiado):</span>
          <span>${formatCurrency(Math.max(0, sale.total - (sale.paidAmount || 0)), curr)}</span>
        </div>
      </div>
    `
      : sale.changeAmount > 0
      ? `
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 2px;">
        <span>Troco Devolvido:</span>
        <strong style="color: #047857;">${formatCurrency(sale.changeAmount, curr)}</strong>
      </div>
    `
      : '';

  const isThermal = mode === 'thermal80';

  const ticketHtml = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8">
      <title>Recibo #${sale.saleNumber}</title>
      <style>
        @page {
          margin: ${isThermal ? '2mm' : '15mm'};
          size: ${isThermal ? '80mm auto' : 'auto'};
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Courier New', Courier, monospace, system-ui;
          background: #fff;
          color: #111;
          font-size: ${isThermal ? '12px' : '13px'};
          line-height: 1.35;
          padding: ${isThermal ? '4px' : '20px'};
          max-width: ${isThermal ? '80mm' : '750px'};
          margin: 0 auto;
        }
        .header {
          text-align: center;
          padding-bottom: 8px;
          border-bottom: 1px dashed #555;
          margin-bottom: 8px;
        }
        .brand-badge {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 2px 6px;
          background: #eee;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 4px;
        }
        .company-name {
          font-size: 16px;
          font-weight: bold;
          font-family: system-ui, -apple-system, sans-serif;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .company-info {
          font-size: 10px;
          color: #444;
        }
        .meta-section {
          padding: 6px 0;
          border-bottom: 1px dashed #555;
          font-size: 11px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          font-size: 11px;
        }
        th {
          border-bottom: 1px solid #333;
          padding: 4px 0;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 10px;
        }
        .totals-section {
          padding: 8px 0;
          border-top: 1px dashed #555;
          border-bottom: 1px dashed #555;
          margin: 6px 0;
        }
        .total-highlight {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: bold;
          margin-top: 4px;
          padding-top: 4px;
          border-top: 1px solid #ddd;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .footer {
          text-align: center;
          padding-top: 10px;
          font-size: 10px;
          color: #555;
        }
        @media print {
          body {
            width: ${isThermal ? '80mm' : 'auto'};
            padding: 0;
          }
          button {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand-badge">VendaFácil PDV</div>
        <div class="company-name">${escapeHtml(company?.name || 'VendaFácil')}</div>
        ${company?.address ? `<div class="company-info">${escapeHtml(company.address)}</div>` : ''}
        <div class="company-info">
          ${company?.phone ? `Tel: ${escapeHtml(company.phone)} ` : ''}
          ${company?.nif ? `| NIF: ${escapeHtml(company.nif)}` : ''}
        </div>
      </div>

      <div class="meta-section">
        <div class="meta-row">
          <span>Recibo nº:</span>
          <strong>#${escapeHtml(sale.saleNumber)}</strong>
        </div>
        <div class="meta-row">
          <span>Data:</span>
          <span>${new Date(sale.createdAt).toLocaleString('pt-PT')}</span>
        </div>
        <div class="meta-row">
          <span>Cliente:</span>
          <strong>${escapeHtml(sale.customerName || 'Cliente Balcão')}</strong>
        </div>
        <div class="meta-row">
          <span>Operador:</span>
          <span>${escapeHtml(sale.userName || 'Caixa')}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Artigo</th>
            <th style="text-align: center; width: 35px;">Qtd</th>
            <th style="text-align: right; width: 75px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="totals-section">
        <div class="meta-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(sale.subtotal, curr)}</span>
        </div>
        ${
          sale.discount > 0
            ? `
          <div class="meta-row" style="color: #b91c1c;">
            <span>Desconto:</span>
            <span>-${formatCurrency(sale.discount, curr)}</span>
          </div>
        `
            : ''
        }
        <div class="total-highlight">
          <span>TOTAL PAGO:</span>
          <span>${formatCurrency(sale.total, curr)}</span>
        </div>
        <div class="meta-row" style="margin-top: 4px;">
          <span>Pagamento:</span>
          <strong>${getPaymentMethodLabel(sale.paymentMethod)}</strong>
        </div>
        ${fiadoHtml}
      </div>

      <div class="footer">
        <p style="font-style: italic; margin-bottom: 4px;">
          ${escapeHtml(company?.receiptFooter || 'Obrigado pela preferência! Volte sempre.')}
        </p>
        <p style="font-size: 8px; color: #888;">
          Emitido eletronicamente via VendaFácil SaaS
        </p>
      </div>
    </body>
    </html>
  `;

  // Create isolated iframe to trigger clean print dialog
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = 'none';

  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentWindow?.document;
  if (frameDoc) {
    frameDoc.open();
    frameDoc.write(ticketHtml);
    frameDoc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (err) {
        console.error('Erro ao imprimir recibo:', err);
      } finally {
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1500);
      }
    }, 250);
  }
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
