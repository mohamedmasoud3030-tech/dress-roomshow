import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Button } from '../../components/shared/Button';
import { printAccessoryLabel } from './printAccessoryLabel';
import type { Accessory } from './accessory.types';

/**
 * Renders and prints the accessory barcode.
 *
 * The rendered value is always the persisted, code-derived barcode, so a label
 * reprinted months later scans identically to the original.
 */
export function AccessoryBarcodeCard({ accessory }: { accessory: Accessory }) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  useEffect(() => {
    if (!barcodeRef.current || !accessory.barcode) {
      setGenerationError('لا يمكن توليد الباركود بدون كود مخزون صالح.');
      return;
    }

    try {
      JsBarcode(barcodeRef.current, accessory.barcode, {
        format: 'CODE128',
        width: 2,
        height: 70,
        displayValue: true,
        fontSize: 14,
        background: '#ffffff',
        lineColor: '#000000',
        margin: 8,
      });
      setGenerationError(null);
    } catch {
      setGenerationError('تعذر توليد الباركود لهذه القيمة.');
    }
  }, [accessory.barcode]);

  const handlePrint = () => {
    if (!barcodeRef.current) return;
    try {
      printAccessoryLabel({ accessory, svgMarkup: new XMLSerializer().serializeToString(barcodeRef.current) });
      setPrintError(null);
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : 'تعذر تجهيز بطاقة الملحق للطباعة.');
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-slate-700">باركود الملحق</p>

      {generationError ? (
        <p role="alert" className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-medium text-rose-700">
          {generationError}
        </p>
      ) : (
        <svg ref={barcodeRef} className="w-full max-w-xs" role="img" aria-label={`باركود الملحق ${accessory.code}`} />
      )}

      {printError ? (
        <p role="alert" className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-medium text-rose-700">
          {printError}
        </p>
      ) : null}

      <Button type="button" variant="secondary" onClick={handlePrint} disabled={generationError !== null}>
        طباعة بطاقة الملحق
      </Button>
    </div>
  );
}
