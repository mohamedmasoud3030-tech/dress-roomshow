import { StoragePersistenceError } from './storagePersistenceError';

export type PersistenceFailureContent = {
  title: string;
  message: string;
  guidance: string[];
};

const DEFAULT_PERSISTENCE_FAILURE: PersistenceFailureContent = {
  title: 'تعذر الوصول إلى التخزين المحلي',
  message: 'لم يتمكن التطبيق من قراءة البيانات أو حفظها على هذا الجهاز.',
  guidance: [
    'تأكدي من توفر مساحة تخزين كافية وعدم تشغيل المتصفح في وضع يمنع التخزين.',
    'صدّري نسخة احتياطية من الإعدادات عند توفرها، ثم أعيدي تحميل الصفحة وجربي مرة أخرى.',
    'إذا استمرت المشكلة، استخدمي متصفحاً آخر أو افتحي التطبيق من جهاز آخر قبل إدخال بيانات جديدة.',
  ],
};

export function isStoragePersistenceError(error: unknown): error is StoragePersistenceError {
  return error instanceof StoragePersistenceError;
}

export function getPersistenceFailureContent(error: unknown): PersistenceFailureContent | null {
  if (!isStoragePersistenceError(error)) return null;

  return {
    ...DEFAULT_PERSISTENCE_FAILURE,
    message: error.message,
  };
}

export function getUserFacingErrorMessage(error: unknown, fallback: string): string {
  return getPersistenceFailureContent(error)?.message ?? (error instanceof Error ? error.message : fallback);
}
