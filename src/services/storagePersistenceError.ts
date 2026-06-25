type StoragePersistenceErrorOptions = {
  operation: string;
  collection?: string;
  cause?: unknown;
};

export class StoragePersistenceError extends Error {
  readonly operation: string;
  readonly collection?: string;

  constructor(message: string, options: StoragePersistenceErrorOptions) {
    super(message, { cause: options.cause });
    this.name = 'StoragePersistenceError';
    this.operation = options.operation;
    this.collection = options.collection;
  }
}

export function createStoragePersistenceError(
  operation: string,
  collection?: string,
  cause?: unknown,
): StoragePersistenceError {
  const collectionMessage = collection ? ` لمجموعة ${collection}` : '';
  return new StoragePersistenceError(
    `تعذر حفظ البيانات محلياً${collectionMessage}. تحققي من مساحة التخزين أو إعدادات المتصفح ثم أعيدي المحاولة.`,
    { operation, collection, cause },
  );
}
