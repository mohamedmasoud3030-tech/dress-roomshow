import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

type BarcodeGeneratorProps = {
  value: string;
  onClick?: () => void;
};

export function BarcodeGenerator({ value, onClick }: BarcodeGeneratorProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: 'CODE128',
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 16,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [value]);

  const handlePrint = () => {
    if (!barcodeRef.current) return;

    const svgData = new XMLSerializer().serializeToString(barcodeRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const printWindow = window.open(svgUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-slate-700">الباركود</p>
      
      <svg ref={barcodeRef} className="w-full max-w-xs"></svg>

      <div className="flex gap-2">
        <button
          onClick={handlePrint}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100"
        >
          طباعة الباركود
        </button>
        
        {onClick && (
          <button
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
