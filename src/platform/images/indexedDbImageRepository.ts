const DB_NAME = 'dress-roomshow-images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('تعذر فتح قاعدة بيانات الصور.'));
  });
}

export type StoredImage = {
  id: string;
  dressId: string;
  dataUrl: string;
  createdAt: string;
};

export async function saveImage(dressId: string, dataUrl: string): Promise<string> {
  const db = await openDB();
  const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const record: StoredImage = { id, dressId, dataUrl, createdAt: new Date().toISOString() };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(record);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error ?? new Error('تعذر حفظ الصورة.'));
    tx.oncomplete = () => db.close();
  });
}

export async function saveImages(dressId: string, dataUrls: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const dataUrl of dataUrls) {
    const id = await saveImage(dressId, dataUrl);
    ids.push(id);
  }
  return ids;
}

export async function getImage(id: string): Promise<StoredImage | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as StoredImage | undefined);
    request.onerror = () => reject(request.error ?? new Error('تعذر قراءة الصورة.'));
    tx.oncomplete = () => db.close();
  });
}

export async function getImagesByDressId(dressId: string): Promise<StoredImage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result as StoredImage[];
      resolve(all.filter((img) => img.dressId === dressId));
    };
    request.onerror = () => reject(request.error ?? new Error('تعذر قراءة الصور.'));
    tx.oncomplete = () => db.close();
  });
}

export async function deleteImage(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('تعذر حذف الصورة.'));
    tx.oncomplete = () => db.close();
  });
}

export async function deleteImagesByDressId(dressId: string): Promise<void> {
  const images = await getImagesByDressId(dressId);
  for (const img of images) {
    await deleteImage(img.id);
  }
}

export async function getAllImageDataUrls(dressId: string): Promise<string[]> {
  const images = await getImagesByDressId(dressId);
  return images.map((img) => img.dataUrl);
}

export async function getImageCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('تعذر عد الصور.'));
    tx.oncomplete = () => db.close();
  });
}

export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
