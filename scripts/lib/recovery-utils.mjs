import crypto from 'node:crypto';
import path from 'node:path';

export const CAPTURE_DIRS = ['raw', 'maps', 'reconstructed', 'extracted', 'reports', 'logs'];

export function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function sanitizeSegment(value) {
  return (value || '_')
    .replace(/^[.]+/, '_')
    .replace(/[<>:"|?*\\]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 180);
}

export function safePathPartsFromUrl(inputUrl) {
  const url = new URL(inputUrl);
  const host = sanitizeSegment(url.hostname);
  const parts = url.pathname
    .split('/')
    .filter(Boolean)
    .map((p) => sanitizeSegment(decodeURIComponent(p)));
  if (!parts.length) parts.push('index');
  return { host, parts, search: url.searchParams.toString() };
}

export function extForContentType(contentType = '', fallback = '.bin') {
  const t = contentType.toLowerCase();
  if (t.includes('text/html')) return '.html';
  if (t.includes('javascript') || t.includes('ecmascript')) return '.js';
  if (t.includes('text/css')) return '.css';
  if (t.includes('application/json') || t.includes('+json')) return '.json';
  if (t.includes('application/wasm')) return '.wasm';
  if (t.includes('text/plain')) return '.txt';
  if (t.includes('application/octet-stream')) return fallback;
  return fallback;
}

export function inferAssetType(url, contentType = '') {
  const u = url.toLowerCase();
  const ct = contentType.toLowerCase();
  if (u.endsWith('.map') || ct.includes('source-map')) return 'map';
  if (u.endsWith('.wasm') || ct.includes('application/wasm')) return 'wasm';
  if (u.endsWith('.css') || ct.includes('text/css')) return 'css';
  if (u.endsWith('.js') || ct.includes('javascript') || ct.includes('ecmascript')) return 'js';
  if (ct.includes('text/html')) return 'html';
  if (ct.includes('json') || /manifest|routes/i.test(u)) return 'json';
  if (/\.(vert|frag|glsl|wgsl|shader)$/i.test(u)) return 'shader';
  if (ct.includes('text/plain')) return 'text';
  return 'other';
}

export function shouldSkipUrl(url, resourceType = '', contentType = '') {
  const u = url.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg|ico|avif)$/i.test(u)) return 'image';
  if (/\.(mp4|webm|mov|m3u8)$/i.test(u)) return 'video';
  if (/\.(mp3|wav|ogg|aac|flac)$/i.test(u)) return 'audio';
  const ct = contentType.toLowerCase();
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('video/')) return 'video';
  if (ct.startsWith('audio/')) return 'audio';
  if (ct.includes('font')) return 'font';
  if (/\.(woff2?|ttf|otf|eot)$/i.test(u) || resourceType === 'font') return 'font';
  if (/google-analytics|gtag|segment|mixpanel|hotjar|doubleclick|facebook\.com\/tr/i.test(u)) return 'analytics';
  return null;
}

export function buildStoragePath(rootDir, bucket, url, extOverride) {
  const { host, parts, search } = safePathPartsFromUrl(url);
  const parsed = path.parse(parts[parts.length - 1]);
  let filename = parsed.base;
  if (!parsed.ext && extOverride) filename = `${parsed.name}${extOverride}`;
  if (search) filename = `${filename}__q_${sanitizeSegment(search)}`;
  const baseParts = [...parts.slice(0, -1), filename];
  return path.join(rootDir, bucket, host, ...baseParts);
}
