import { Sparkles } from 'lucide-react';
import { DEFAULT_BRAND_NAME } from '../../../features/preferences/useBrandName';

/**
 * A catalogue photo with a graceful fallback: a piece without an uploaded
 * picture still reads as a boutique placeholder rather than a broken image.
 */
export function DressPhoto({
  src,
  alt,
  className = '',
  imgClassName = '',
  fallbackLabel,
  priority = false,
  brand = DEFAULT_BRAND_NAME,
}: {
  src?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallbackLabel?: string;
  /** The hero's lead photo is the largest contentful paint: load it eagerly. */
  priority?: boolean;
  /** Showroom name shown on the placeholder for a piece without a photo. */
  brand?: string;
}) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-amber-200/70 via-stone-100 to-amber-100 ${className}`}
      >
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/50" />
        <div aria-hidden="true" className="absolute -bottom-14 -left-8 h-44 w-44 rounded-full bg-amber-300/30" />
        <div className="relative text-center text-amber-950">
          <Sparkles aria-hidden="true" className="mx-auto h-8 w-8" />
          <p className="mt-2 truncate text-sm font-black tracking-[0.2em]">{brand}</p>
          {fallbackLabel ? <p className="mt-1 text-xs font-bold text-amber-800">{fallbackLabel}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={`object-cover ${className} ${imgClassName}`}
    />
  );
}
