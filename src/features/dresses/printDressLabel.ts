import { getAppPreferences } from '../preferences/preferences.service';
import { barcodeModulesToSvg, encodeCode128B, normalizeDressCodeIdentifier } from './barcode';
import type { Dress } from './dress.types';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] ?? character);
}

export function getDressLabelHtml(dress: Dress): string {
  const showroomName = getAppPreferences().showroomName;
  const code = normalizeDressCodeIdentifier(dress.code);
  const barcode = barcodeModulesToSvg(encodeCode128B(code), { height: 70, moduleWidth: 2 });

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" /><title>${escapeHtml(code)}</title><style>@page{size:80mm 45mm;margin:4mm}body{font-family:Tahoma,Arial,sans-serif;margin:0;color:#0f172a}.label{border:1px solid #cbd5e1;border-radius:14px;padding:10px;text-align:center}.brand{font-size:18px;font-weight:900;letter-spacing:.12em;color:#92400e}.code{margin:4px 0;font-size:16px;font-weight:900;direction:ltr}.meta{display:flex;justify-content:center;gap:10px;margin-top:5px;font-size:12px;font-weight:700}.barcode{display:flex;justify-content:center;margin-top:6px}.barcode svg{max-width:100%;height:54px}</style></head><body><section class="label"><div class="brand">${escapeHtml(showroomName)}</div><div class="code">${escapeHtml(code)}</div><div class="barcode">${barcode}</div><div class="meta"><span>المقاس: ${escapeHtml(dress.size)}</span><span>اللون: ${escapeHtml(dress.color)}</span></div></section><script>window.print();</script></body></html>`;
}

export function printDressLabel(dress: Dress): void {
  const printWindow = window.open('', '_blank', 'width=420,height=360');
  if (!printWindow) throw new Error('تعذر فتح نافذة الطباعة.');
  printWindow.document.write(getDressLabelHtml(dress));
  printWindow.document.close();
}
