/**
 * Upload handling: size limits, magic-byte type validation and private storage.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const ARTWORK_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/pdf': 'pdf',
};

export const PORTFOLIO_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** Detect a supported type from the file's leading bytes (never the client header). */
export function sniffMime(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 4).toString('latin1') === '%PDF') return 'application/pdf';
  if (
    buffer.length > 12 &&
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function uploadDirs(baseDir) {
  const root = path.resolve(baseDir || './data/uploads');
  return {
    root,
    artwork: path.join(root, 'artwork'),
    delivery: path.join(root, 'delivery'),
    portfolio: path.join(root, 'portfolio'),
  };
}

export function ensureUploadDirs(dirs) {
  for (const dir of Object.values(dirs)) fs.mkdirSync(dir, { recursive: true });
  return dirs;
}

/** Store a buffer under a random, non-guessable filename. */
export function storeBuffer(dir, buffer, ext) {
  fs.mkdirSync(dir, { recursive: true });
  const name = `${crypto.randomBytes(18).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buffer, { mode: 0o600 });
  return name;
}

/**
 * Resolve a stored filename inside its directory, rejecting traversal attempts.
 * Returns the absolute path or null.
 */
export function resolveStored(dir, name) {
  if (typeof name !== 'string' || !/^[a-z0-9]+\.(png|jpg|jpeg|pdf|webp|svg|dst|pes|jef|vp3|emb|zip)$/i.test(name)) {
    return null;
  }
  const full = path.join(dir, name);
  if (!full.startsWith(path.resolve(dir) + path.sep)) return null;
  return fs.existsSync(full) ? full : null;
}

export function safeDownloadName(originalName, fallbackExt = 'bin') {
  const base = String(originalName || 'file')
    .replace(/[/\\]+/g, '-')
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .slice(0, 120);
  return base || `file.${fallbackExt}`;
}

/** Extensions accepted for final digitized delivery files. */
export const DELIVERY_EXTENSIONS = ['dst', 'pes', 'jef', 'vp3', 'emb', 'zip', 'png', 'jpg', 'jpeg', 'pdf'];

export function deliveryExtension(filename) {
  const ext = path.extname(String(filename || '')).slice(1).toLowerCase();
  return DELIVERY_EXTENSIONS.includes(ext) ? ext : null;
}
