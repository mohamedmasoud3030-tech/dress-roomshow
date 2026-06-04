import { formatMoneyOMR } from '../../shared/utils/format';
import type { SaleInvoice } from './salesLedger.service';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);
}

export function printSaleInvoice(invoice: SaleInvoice): void {
  const popup = window.open('', '_blank', 'width=860,height=720');
  if (!popup) throw new Error('تعذر فتح نافذة الطباعة. اسمحي بالنوافذ المنبثقة ثم أعيدي المحاولة.');
  const lines = invoice.lines.map((line) => `<tr><td>${escapeHtml(line.dressCode)}</td><td>${escapeHtml(line.dressName)}</td><td>${escapeHtml(formatMoneyOMR(line.amount))}</td></tr>`).join('');
  popup.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(invoice.invoiceNumber)}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#0f172a}h1{margin:0}small{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #cbd5e1;padding:10px;text-align:right}.total{margin-top:20px;font-size:20px;font-weight:bold}.signatures{display:flex;justify-content:space-between;margin-top:72px}</style></head><body><h1>LENA — فاتورة مبيعات</h1><p><b>رقم الفاتورة:</b> ${escapeHtml(invoice.invoiceNumber)}</p><p><b>التاريخ:</b> ${escapeHtml(invoice.saleDate)}</p><p><b>العميلة:</b> ${escapeHtml(invoice.customerName)}</p><table><thead><tr><th>الكود</th><th>الفستان</th><th>القيمة</th></tr></thead><tbody>${lines}</tbody></table><p class="total">الإجمالي: ${escapeHtml(formatMoneyOMR(invoice.totalAmount))}</p><div class="signatures"><span>توقيع المعرض: ______________</span><span>توقيع العميلة: ______________</span></div></body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}
