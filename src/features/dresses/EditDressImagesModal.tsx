import { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { Modal } from '../../components/shared/Modal';
import { ImageUpload } from './ImageUpload';
import { saveDressImages } from './dress.service';
import type { Dress } from './dress.types';

type Props = {
  open: boolean;
  dress: Dress;
  onClose: () => void;
  onSaved: (dress: Dress) => void;
};

/**
 * Attaches or replaces the photographs of a piece that already exists.
 *
 * The uploader used to live only inside the "add item" dialog, so a piece added
 * in a hurry — or imported from a backup — could never be given a picture.
 * This keeps the same uploader and the same upload path, just reachable later.
 */
export function EditDressImagesModal({ open, dress, onClose, onSaved }: Props) {
  const [images, setImages] = useState<string[]>(dress.images);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setImages(dress.images);
      setError(null);
    }
  }, [open, dress.images]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await saveDressImages(dress.code, images);
      if (!updated) {
        setError('تعذر حفظ صور هذا العنصر.');
        return;
      }
      onSaved(updated);
      onClose();
    } catch {
      setError('تعذر حفظ صور هذا العنصر.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="صور العنصر">
      <p className="mb-4 text-sm text-slate-500">
        {dress.code} — {dress.name}. تظهر هذه الصور للعميلات في صفحة المعرض.
      </p>

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          {error}
        </p>
      )}

      <ImageUpload images={images} onChange={setImages} />

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button type="button" onClick={save} disabled={saving} loading={saving} loadingLabel="جارٍ الحفظ…">
          <ImageIcon aria-hidden="true" className="h-4 w-4" />
          حفظ الصور ({images.length})
        </Button>
      </div>
    </Modal>
  );
}
