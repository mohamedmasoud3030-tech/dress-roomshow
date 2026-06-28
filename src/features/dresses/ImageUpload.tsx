import { useCallback, useState } from 'react';
import { X, ImagePlus } from 'lucide-react';

type ImageUploadProps = {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('تعذر قراءة الصورة المرفوعة.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('تعذر قراءة الصورة المرفوعة.'));
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({ images, onChange, maxImages = 5 }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) return;

    const filesToProcess = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remainingSlots);

    if (filesToProcess.length === 0) return;

    try {
      const uploadedImages = await Promise.all(filesToProcess.map(readFileAsDataUrl));
      onChange([...images, ...uploadedImages]);
    } catch (error) {
      console.error('Image upload error:', error);
    }
  }, [images, onChange, maxImages]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-bold text-slate-700">
        صور الفستان (حتى {maxImages} صور)
      </label>

      {/* Image Preview */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
          {images.map((img, index) => (
            <div key={index} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200">
              <img 
                src={img} 
                alt={`صورة ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
            dragActive 
              ? 'border-amber-500 bg-amber-50' 
              : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <ImagePlus size={40} className="mb-2 text-slate-400" />
            <p className="text-sm text-slate-600">
              اضغطي هنا أو اسحبي الصور لرفعها
            </p>
            <p className="mt-1 text-xs text-slate-400">
              (JPG, PNG - حتى 5 ميجابايت لكل صورة)
            </p>
          </label>
        </div>
      )}
    </div>
  );
}
