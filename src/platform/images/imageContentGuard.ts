/**
 * Content verification for operator-selected images.
 *
 * `file.type` and the `accept` attribute are browser-reported hints, not
 * evidence: any file can be renamed to look like a photo (including active
 * content such as SVG, or an executable). The compression pipeline rasterises
 * whatever it accepts into WebP/JPEG, and the hardened-WebView fallback path
 * stores the original bytes — so the bytes themselves are verified here, once,
 * before any decode or storage decision.
 *
 * Only raster formats the bucket allowlist and the product actually use are
 * accepted: JPEG, PNG, WebP. Notably rejected: SVG (active content), GIF,
 * HEIC/AVIF (not universally decodable on the showroom's devices), and
 * anything without an image signature.
 */

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type VerifiedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const UNSUPPORTED_IMAGE_CONTENT_MESSAGE = 'صيغة الملف غير مدعومة. الصور المقبولة: JPG أو PNG أو WebP.';

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
// WebP: 'RIFF' + 4 size bytes + 'WEBP'.
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46] as const;
const WEBP_BRAND = [0x57, 0x45, 0x42, 0x50] as const;

const HEADER_BYTES_TO_READ = 16;

function matches(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * Reads the file's leading bytes and returns the verified raster type, or null
 * when the content carries no recognised image signature.
 */
export async function sniffImageMimeType(file: Blob): Promise<VerifiedImageMimeType | null> {
  if (!file || typeof file.size !== 'number' || file.size === 0) return null;
  let header: Uint8Array;
  try {
    header = new Uint8Array(await file.slice(0, HEADER_BYTES_TO_READ).arrayBuffer());
  } catch {
    return null;
  }
  if (matches(header, JPEG_SIGNATURE)) return 'image/jpeg';
  if (matches(header, PNG_SIGNATURE)) return 'image/png';
  if (matches(header, RIFF_SIGNATURE) && matches(header, WEBP_BRAND, 8)) return 'image/webp';
  return null;
}

/**
 * Resolves with the verified type or throws an operator-readable error.
 * Called by the compression entry point, so every image workflow (catalogue,
 * condition evidence, future ones) inherits the same content floor.
 */
export async function verifyImageFileContent(file: Blob): Promise<VerifiedImageMimeType> {
  const mimeType = await sniffImageMimeType(file);
  if (mimeType === null) throw new Error(UNSUPPORTED_IMAGE_CONTENT_MESSAGE);
  return mimeType;
}
