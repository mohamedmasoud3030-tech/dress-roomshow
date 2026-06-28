export function generateDressBarcodeValue(): string {
  return `DRESS-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function getBarcodeRuntimeSupportStatus(): { supported: boolean; message: string } {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      message: 'لا يمكن التحقق من دعم الكاميرا في بيئة غير متصفح.',
    };
  }

  if (!window.isSecureContext) {
    return {
      supported: false,
      message: 'تشغيل الكاميرا يتطلب صفحة آمنة HTTPS أو localhost.',
    };
  }

  if (!('mediaDevices' in navigator) || typeof navigator.mediaDevices?.getUserMedia !== 'function') {
    return {
      supported: false,
      message: 'هذا المتصفح أو الجهاز لا يدعم الوصول للكاميرا المطلوبة للباركود.',
    };
  }

  return {
    supported: true,
    message: 'دعم الكاميرا متاح مبدئيًا، لكن ما زال يلزم اختبار فعلي على جهاز حقيقي.',
  };
}

export function getBarcodeEngineEnvironmentNote(): string {
  return 'مكتبة ZXing الحالية أظهرت تحذير توافق مع Node 24+ أثناء التثبيت، لكن البناء والاختبارات ما زالت ناجحة في البيئة الحالية.';
}
