import { DEFAULT_BRAND_NAME } from '../../../features/preferences/useBrandName';

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
  priority?: boolean;
  brand?: string;
}) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative flex items-center justify-center overflow-hidden bg-[#F5F1EB] ${className}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_20%,rgba(201,168,106,0.15),transparent_60%)]" />
        <div className="relative text-center">
          <p className="text-[11px] font-medium tracking-[0.2em] text-[#8B8680]">{brand}</p>
          {fallbackLabel ? <p className="mt-2 text-[12px] font-[400] tracking-[-0.01em] text-[#0A0A0A]/60">{fallbackLabel}</p> : null}
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
