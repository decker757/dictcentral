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

  const bgClass = isChanged
    ? isCreate ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
    : 'bg-gray-50';

  const textClass = isChanged
    ? isCreate ? 'text-emerald-700' : 'text-emerald-700 font-medium' // new value in green for edits
    : 'text-gray-700';

  return (
    <div className={`flex gap-3 px-3 py-2 rounded-lg text-xs ${bgClass}`}>
      <span className="text-gray-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">
        {isChanged && !isCreate && originalDisplay && (
          <div className="text-red-600 line-through mb-0.5 break-words">
            {originalDisplay} <span className="text-gray-400 no-underline mx-1">→</span>
          </div>
        )}
        <span className={`break-words ${textClass}`}>{display}</span>
      </div>
      {isChanged && (
        <span className={`text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 pt-0.5 ${
          isCreate ? 'text-emerald-600' : 'text-amber-600'
        }`}>
          {isCreate ? 'new' : 'changed'}
        </span>
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

export function DiffLegend() {
  return (
    <div className="flex items-center gap-3 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> New</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Changed</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Removed</span>
    </div>
  );
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
