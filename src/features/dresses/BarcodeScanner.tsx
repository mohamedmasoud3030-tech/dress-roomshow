import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

type BarcodeScannerProps = {
  onScan: (barcode: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
        setError(null);
      }
    } catch (err) {
      setError('تعذر الوصول للكاميرا. تأكدي من السماح بصلاحيات الكاميرا.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setScanning(false);
    }
  };

  const handleManualInput = () => {
    const barcode = prompt('أدخلي رقم الباركود يدوياً:');
    if (barcode) {
      onScan(barcode);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">مسح الباركود</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-stone-100">
            <X size={20} />
          </button>
        </div>

        {error ? (
          <div className="text-center">
            <p className="mb-4 text-red-600">{error}</p>
            <button
              onClick={handleManualInput}
              className="rounded-xl bg-slate-950 px-5 py-2 text-sm font-bold text-white"
            >
              إدخال الباركود يدوياً
            </button>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full"
              />
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-40 w-40 border-2 border-amber-500 opacity-70"></div>
                </div>
              )}
            </div>

            <p className="mt-3 text-center text-sm text-slate-600">
              وجهي الكاميرا نحو الباركود...
            </p>

            <button
              onClick={handleManualInput}
              className="mt-4 w-full rounded-xl border border-slate-300 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100"
            >
              إدخال الباركود يدوياً
            </button>
          </>
        )}
      </div>
    </div>
  );
}
