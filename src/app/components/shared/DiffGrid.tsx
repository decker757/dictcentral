// The change-request diff view, shared by RequestCard and FocusModeView.
// Both previously computed `visibleFields` / `newFieldCount` / `changedSet`
// and re-implemented the field grid + legend independently.

import { ChangeRequest } from '../../types';
import { ENTITY_FIELDS, DATAITEM_FIELDS, FieldDef } from '../../lib/fieldSchema';
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
  const fields = (isEntity ? ENTITY_FIELDS : DATAITEM_FIELDS) as unknown as FieldDef<Record<string, unknown>>[];
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
