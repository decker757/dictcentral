// Presentational value formatting shared by the diff views.

export function formatValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return val.length ? val.join(', ') : '—';
  return String(val);
}

/** Treats undefined / null / '' / [] as "no value" (used to skip empty diff rows). */
export function isEmptyValue(val: unknown): boolean {
  return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
}

export function formatSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}
