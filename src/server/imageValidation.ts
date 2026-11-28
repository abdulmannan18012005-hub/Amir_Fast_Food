import { UserFacingError } from './errors';

export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Verifies image file buffer by inspecting actual file signature (magic bytes)
 * and ensuring the declared MIME type matches the binary format.
 */
export function detectImageExtension(
  buffer: Buffer,
  mimeType: string,
  minBytes = 32
): 'jpg' | 'png' | 'webp' {
  if (!Buffer.isBuffer(buffer) || buffer.length < minBytes) {
    throw new UserFacingError('Invalid or empty image file. Please select a valid JPG, PNG, or WebP image.', 'validation');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new UserFacingError('Image is too large. Maximum allowed file size is 5 MB.', 'validation');
  }

  const mime = String(mimeType || '').toLowerCase().trim();
  const isJpegBytes = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPngBytes =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isWebpBytes =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  if ((mime === 'image/jpeg' || mime === 'image/jpg') && isJpegBytes) return 'jpg';
  if (mime === 'image/png' && isPngBytes) return 'png';
  if (mime === 'image/webp' && isWebpBytes) return 'webp';

  throw new UserFacingError(
    'Invalid or corrupted image file. Only genuine JPG, PNG, and WebP images are supported (MIME spoofing and non-raster files are rejected).',
    'validation'
  );
}
