// The change-request diff view, shared by SubmissionDetailView (via
// HierarchyRequestTable's getRequestDiff usage) and RequestDetailModal, plus
// FocusModeView indirectly (it wraps SubmissionDetailView). All of them
// compute `visibleFields` / `changedSet` and render the field grid + legend
// from this one shared place rather than re-implementing it per view.

import { ChangeRequest } from '../../types';
import { RECORD_FIELDS, FieldDef } from '../../lib/fieldSchema';
import { formatValue, isEmptyValue } from '../../lib/format';

interface FieldRowProps {
  label: string;
  value: unknown;
  isChanged: boolean;
  originalValue?: unknown;
  isCreate: boolean;
}

export function FieldRow({ label, value, isChanged, originalValue, isCreate }: FieldRowProps) {
  const display = formatValue(value);
  const originalDisplay = originalValue !== undefined ? formatValue(originalValue) : null;
  if (display === '—' && !isChanged) return null;

  // The OPERATION (create / edit / delete) belongs to the whole request — it's shown once on
  // the request's badge — so it isn't re-stated on every field. Cards stay a calm neutral and
  // color is spent only where it varies *per field*: the value change. The prior value is muted
  // + struck through, the new value is green, so an edit reads as a real before → after.
  const showTransition = isChanged && !isCreate && originalDisplay !== null && originalDisplay !== '—';

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
      <div className="text-[11px] font-medium text-gray-500 mb-1">{label}</div>
      {showTransition ? (
        <div className="space-y-0.5">
          <div className="text-gray-400 line-through break-words">{originalDisplay}</div>
          <div className="text-emerald-700 font-medium break-words">{display}</div>
        </div>
      ) : (
        <span className={`break-words ${isChanged ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>{display}</span>
      )}
    </div>
  );
}

export interface RequestDiff {
  isCreate: boolean;
  isEntity: boolean;
  fields: FieldDef<Record<string, unknown>>[];
  proposed: Record<string, unknown>;
  original?: Record<string, unknown>;
  changedSet: Set<string>;
  newFieldCount: number;
}

export function getRequestDiff(request: ChangeRequest): RequestDiff {
  const isCreate = request.type === 'create';
  const isEntity = request.recordType === 'entity';
  // Entities and data items share one flat attribute schema (RecordAttributes — see
  // types.ts/fieldSchema.ts), so there's no actual per-record-type field list to pick between.
  const fields = RECORD_FIELDS as unknown as FieldDef<Record<string, unknown>>[];
  const proposed = request.proposedData as unknown as Record<string, unknown>;
  const original = request.originalData as unknown as Record<string, unknown> | undefined;
  const changedSet = new Set(request.changedFields ?? []);
  const newFieldCount = fields.filter(f => !isEmptyValue(proposed[f.key as string])).length;
  return { isCreate, isEntity, fields, proposed, original, changedSet, newFieldCount };
}

/** "All new" for creates; in 'changes' mode for edits, only changed fields. */
export function visibleDiffFields(diff: RequestDiff, mode: 'full' | 'changes'): FieldDef<Record<string, unknown>>[] {
  return mode === 'changes' && !diff.isCreate
    ? diff.fields.filter(f => diff.changedSet.has(f.key as string))
    : diff.fields;
}

export function DiffGrid({ diff, mode, className }: { diff: RequestDiff; mode: 'full' | 'changes'; className?: string }) {
  const visible = visibleDiffFields(diff, mode);
  return (
    <div className={className ?? 'px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-2'}>
      {visible.map(({ key, label }) => {
        const proposedVal = diff.proposed[key as string];
        const originalVal = diff.original ? diff.original[key as string] : undefined;
        const isChanged = diff.isCreate || diff.changedSet.has(key as string);
        if (key === 'dataItems') return null;
        if (!isChanged && isEmptyValue(proposedVal)) return null;
        return (
          <FieldRow
            key={key as string}
            label={label}
            value={proposedVal}
            isChanged={isChanged}
            originalValue={originalVal}
            isCreate={diff.isCreate}
          />
        );
      })}
      {visible.length === 0 && (
        <div className="col-span-2 text-center py-4 text-xs text-gray-400">No changed fields to display.</div>
      )}
    </div>
  );
}

// ── Inline change preview — "at a glance", no expand required ──
//
// Renders directly in a request's collapsed row (RequestCard's compact view)
// so scanning a long list of edits — e.g. dozens of sibling data items under
// one entity — shows what actually changed on EVERY row without clicking
// into any of them. Edits only: creates already read as "all fields new" via
// the operation badge, so restating every new value here would be noise.
//
// Shaped as a left-accented callout STRIP (not a rounded pill) so it reads
// clearly apart from OperationBadge's rounded "Edit" chip right above it in
// the row — same attention color (amber), different silhouette, so the two
// don't blur into "one more status badge." The strip's tint + left border
// give it enough weight to catch the eye while scanning a long list; the
// content inside still uses the established before → after language (muted
// strikethrough old value, bold emerald new value).

const INLINE_PREVIEW_CAP = 3;

export function InlineChangePreview({ diff, cap = INLINE_PREVIEW_CAP }: { diff: RequestDiff; cap?: number }) {
  if (diff.isCreate) return null;
  const changed = visibleDiffFields(diff, 'changes');
  if (changed.length === 0) return null;

  const visible = changed.slice(0, cap);
  const hidden = changed.length - visible.length;

  return (
    <div className="mt-1.5 pl-2.5 pr-2 py-1.5 border-l-[3px] border-amber-400 bg-amber-50/70 rounded-r-md flex items-center gap-x-3 gap-y-1 flex-wrap">
      {visible.map(({ key, label }) => {
        const proposedVal = diff.proposed[key as string];
        const originalVal = diff.original ? diff.original[key as string] : undefined;
        const proposedDisplay = formatValue(proposedVal);
        const originalDisplay = formatValue(originalVal);
        const showTransition = originalDisplay !== '—' && originalDisplay !== proposedDisplay;
        return (
          <span key={key as string} className="inline-flex items-center gap-1 text-xs max-w-[280px]">
            <span className="font-semibold text-gray-600 flex-shrink-0">{label}</span>
            {showTransition && (
              <>
                <span className="text-gray-400 line-through truncate">{originalDisplay}</span>
                <span className="text-amber-500 flex-shrink-0" aria-hidden="true">→</span>
              </>
            )}
            <span className="text-emerald-700 font-bold truncate">{proposedDisplay}</span>
          </span>
        );
      })}
      {hidden > 0 && (
        <span className="text-xs text-amber-700 font-semibold flex-shrink-0">+{hidden} more</span>
      )}
    </div>
  );
}
