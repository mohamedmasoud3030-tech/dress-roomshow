import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';

type BarcodeGeneratorProps = {
  value: string;
  onClick?: () => void;
  itemName?: string;
  itemCode?: string;
};

export function BarcodeGenerator({ value, onClick, itemName, itemCode }: BarcodeGeneratorProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    if (!barcodeRef.current || !value) {
      setGenerationError('لا يمكن توليد الباركود بدون قيمة صالحة.');
      return;
    }

    try {
      JsBarcode(barcodeRef.current, value, {
        format: 'CODE128',
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 16,
        background: '#ffffff',
        lineColor: '#000000',
        margin: 12,
      });
      setGenerationError(null);
    } catch (error) {
      console.error('Error generating barcode:', error);
      setGenerationError('تعذر توليد الباركود لهذه القيمة.');
    }
  }, [value]);

  const handlePrint = async () => {
    if (!barcodeRef.current) return;

    const svgMarkup = new XMLSerializer().serializeToString(barcodeRef.current);
    const nameLabel = itemName ? `    <p class="item-name">${itemName}</p>\n` : '';
    const codeLabel = itemCode ? `    <p class="item-code">${itemCode}</p>\n` : '';
    const printMarkup = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <title>طباعة الباركود</title>
    <style>
      body {
        margin: 0;
        padding: 24px;
        font-family: Arial, sans-serif;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .label {
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 20px;
        text-align: center;
      }
      .title {
        margin: 0 0 12px;
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
      }
      .item-name {
        margin: 8px 0 0;
        font-size: 14px;
        font-weight: 700;
        color: #334155;
      }
      .item-code {
        margin: 4px 0 12px;
        font-size: 12px;
        color: #64748b;
        direction: ltr;
      }
      svg {
        max-width: 100%;
        height: auto;
      }
      .value {
        margin-top: 12px;
        font-size: 14px;
        color: #475569;
        direction: ltr;
      }
      @media print {
        body {
          padding: 0;
        }
        .label {
          border: none;
        }
      }
    </style>
  </head>
  <body>
    <section class="label">
      <p class="title">ملصق الباركود</p>
${nameLabel}${codeLabel}      ${svgMarkup}
      <p class="value">${value}</p>
    </section>
    <script>
      window.addEventListener('load', function () {
        window.print();
      });
    </script>
  </body>
</html>`;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      window.alert('تعذر فتح نافذة الطباعة. تأكدي من السماح بالنوافذ المنبثقة.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printMarkup);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-slate-700">الباركود</p>

      {generationError ? (
        <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
          {generationError}
        </div>
      ) : (
        <svg ref={barcodeRef} className="w-full max-w-xs" role="img" aria-label={`Barcode for ${value}`}></svg>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => void handlePrint()}
          disabled={generationError !== null}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          طباعة الباركود
        </button>

        {onClick && (
          <button
            type="button"
            onClick={onClick}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            توليد باركود جديد
          </button>
        )}
      </div>
    </div>
  );
}
