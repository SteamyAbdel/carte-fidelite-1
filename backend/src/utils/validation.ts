export function positiveInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

export function optionalHexColor(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return null;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

export function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function pngDataUrl(value: unknown): string | null {
  if (value === null || value === '') return '';
  if (typeof value !== 'string') return null;
  if (!value.startsWith('data:image/png;base64,')) return null;

  const base64 = value.slice('data:image/png;base64,'.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;

  const maxBytes = 500 * 1024;
  const size = Math.floor((base64.length * 3) / 4);
  return size <= maxBytes ? value : null;
}
