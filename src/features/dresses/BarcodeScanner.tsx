import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library';
import type { IScannerControls } from '@zxing/browser';
import { Modal } from '../../components/shared/Modal';

type BarcodeScannerProps = {
  onScan: (barcode: string) => void;
  onClose: () => void;
};

const barcodeHints = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8]],
]);

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const scannedRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualInputError, setManualInputError] = useState<string | null>(null);

  useEffect(() => {
    void startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;
    scannedRef.current = false;

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setScanning(false);
  };

  const startCamera = async () => {
    try {
      stopCamera();
      setError(null);
      setManualInputError(null);

      const reader = new BrowserMultiFormatReader(barcodeHints);
      readerRef.current = reader;

      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result, scanError) => {
        if (result && !scannedRef.current) {
          scannedRef.current = true;
          const barcode = result.getText().trim();
          stopCamera();
          onScan(barcode);
          return;
        }

        if (scanError && !(scanError instanceof NotFoundException)) {
          console.error('Barcode scan error:', scanError);
        }
      });

      controlsRef.current = controls;
      setScanning(true);
    } catch (cameraError) {
      setError('تعذر تشغيل الماسح. تأكدي من السماح للكاميرا أو استخدمي الإدخال اليدوي.');
      console.error('Camera error:', cameraError);
    }
  };

  const handleManualSubmit = () => {
    const normalizedBarcode = manualBarcode.trim();

    if (!normalizedBarcode) {
      setManualInputError('من فضلك أدخلي رقم الباركود أولاً.');
      return;
    }

    setManualInputError(null);
    stopCamera();
    onScan(normalizedBarcode);
  };

  return (
    <Modal open onClose={() => {
      stopCamera();
      onClose();
    }} title="مسح الباركود" className="max-w-md">
      {error ? (
        <div className="space-y-3 text-center">
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void startCamera()}
            className="w-full rounded-xl border border-slate-300 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100"
          >
            إعادة محاولة تشغيل الكاميرا
          </button>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full" />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 border-2 border-amber-500 opacity-70" />
              </div>
            )}
          </div>

          <p className="mt-3 text-center text-sm text-slate-600">
            وجهي الكاميرا نحو الباركود وسيتم التقاطه تلقائياً.
          </p>

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => void startCamera()}
              className="w-full rounded-xl border border-slate-300 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100"
            >
              إعادة المسح
            </button>
          </div>
        </>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <label className="block text-sm font-semibold text-slate-800" htmlFor="manual-barcode-input">
          إدخال الباركود يدوياً
        </label>
        <input
          id="manual-barcode-input"
          type="text"
          value={manualBarcode}
          onChange={(event) => {
            setManualBarcode(event.target.value);
            if (manualInputError) {
              setManualInputError(null);
            }
          }}
          placeholder="مثال: 1234567890123"
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-stone-50 px-3 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30"
        />
        {manualInputError && (
          <p className="mt-2 text-sm font-medium text-red-600">{manualInputError}</p>
        )}
        <button
          type="button"
          onClick={handleManualSubmit}
          className="mt-3 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          تأكيد الباركود اليدوي
        </button>
      </div>
    </Modal>
  );
}
