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

/**
 * Decides whether a field's old → new transition should be shown (struck-through old value
 * next to the new one) and pre-formats both sides. A transition only makes sense for an EDIT
 * (never a create, which has no "old" value) where the original value was both present
 * (`isEmptyValue`/`formatValue` would otherwise read as "—") and actually different from the
 * new one — otherwise there's nothing to contrast.
 *
 * This is the ONE place that rule lives. Before this helper, the same three conditions
 * (`!isCreate`, original is non-empty, original !== new) were independently re-derived in
 * DiffGrid's `FieldRow` and `InlineChangePreview`, and in HierarchyRequestTable's
 * `FieldValueCell` — three call sites that had to be kept in sync by hand whenever the rule
 * changed. Now they all just call this.
 */
export interface ValueTransition {
  /** True if there's a real old→new change worth contrasting. */
  showTransition: boolean;
  /** Formatted current/new value — always available. */
  newDisplay: string;
  /** Formatted original value, only meaningful when `showTransition` is true. */
  originalDisplay: string;
}

export function getValueTransition(value: unknown, originalValue: unknown, isCreate: boolean): ValueTransition {
  const newDisplay = formatValue(value);
  const originalDisplay = originalValue !== undefined ? formatValue(originalValue) : '—';
  const showTransition = !isCreate && originalDisplay !== '—' && originalDisplay !== newDisplay;
  return { showTransition, newDisplay, originalDisplay };
}
