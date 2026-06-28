import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library';
import type { IScannerControls } from '@zxing/browser';
import { X } from 'lucide-react';

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

  const handleManualInput = () => {
    const barcode = prompt('أدخلي رقم الباركود يدوياً:');
    if (barcode) {
      stopCamera();
      onScan(barcode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">مسح الباركود</h3>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-full p-1 hover:bg-stone-100"
          >
            <X size={20} />
          </button>
        </div>

        {error ? (
          <div className="space-y-3 text-center">
            <p className="text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void startCamera()}
              className="w-full rounded-xl border border-slate-300 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100"
            >
              إعادة محاولة تشغيل الكاميرا
            </button>
            <button
              type="button"
              onClick={handleManualInput}
              className="w-full rounded-xl bg-slate-950 px-5 py-2 text-sm font-bold text-white"
            >
              إدخال الباركود يدوياً
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
              <button
                type="button"
                onClick={handleManualInput}
                className="w-full rounded-xl border border-slate-300 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100"
              >
                إدخال الباركود يدوياً
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
