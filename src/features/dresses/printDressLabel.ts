import { createCode128Svg } from './barcode';
import type { Dress } from './dress.types';
import { escapeHtml } from './printSaleInvoice';

export function printDressLabel(dress: Dress): void {
  const html = `<!doctype html>
  <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>Label ${escapeHtml(dress.code)}</title>
      <style>
        @page { size: 58mm 35mm; margin: 3mm; }
        body { margin: 0; font-family: Tahoma, Arial, sans-serif; color: #111; }
        .label { width: 52mm; height: 29mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2mm; }
        .name { font-size: 10px; font-weight: 700; text-align: center; }
        svg { max-width: 48mm; height: auto; }
      </style>
    </head>
    <body>
      <section class="label">
        <div class="name">${escapeHtml(dress.name)}</div>
        ${createCode128Svg(dress.code, { height: 54, moduleWidth: 1 })}
      </section>
      <script>window.print();</script>
    </body>
  </html>`;

  const printWindow = window.open('', '_blank', 'width=420,height=320');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
