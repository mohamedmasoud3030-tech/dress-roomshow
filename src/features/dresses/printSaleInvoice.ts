import { formatMoneyOMR } from '../../shared/utils/format';
import type { SaleInvoice } from './salesLedger.types';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function printSaleInvoice(invoice: SaleInvoice): void {
  const rows = invoice.items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.dressCode)}</td>
          <td>${escapeHtml(item.dressName)}</td>
          <td>${escapeHtml(formatMoneyOMR(item.unitPrice))}</td>
        </tr>`,
    )
    .join('');

  const html = `<!doctype html>
  <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(invoice.invoiceNumber)}</title>
      <style>
        body { font-family: Tahoma, Arial, sans-serif; margin: 32px; color: #1f1b18; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #8b5e3c; padding-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        th, td { border: 1px solid #e8ded2; padding: 10px; text-align: right; }
        th { background: #faf7f2; }
        .total { margin-top: 20px; font-size: 20px; font-weight: 700; }
      </style>
    </head>
    <body>
      <section class="header">
        <div><h1>Dress Roomshow</h1><p>فاتورة بيع</p></div>
        <div><p>رقم الفاتورة: ${escapeHtml(invoice.invoiceNumber)}</p><p>التاريخ: ${escapeHtml(invoice.invoiceDate)}</p></div>
      </section>
      <p>العميلة: ${escapeHtml(invoice.customerName)}</p>
      <p>الهاتف: ${escapeHtml(invoice.customerPhone)}</p>
      <table>
        <thead><tr><th>#</th><th>كود الفستان</th><th>اسم الفستان</th><th>السعر</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="total">الإجمالي: ${escapeHtml(formatMoneyOMR(invoice.subtotal))}</p>
      <p>ملاحظات: ${escapeHtml(invoice.notes ?? '')}</p>
      <script>window.print();</script>
    </body>
  </html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
