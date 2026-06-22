import { useState } from 'react';
import { CheckCircle, Clock, Layers2, ChevronDown, ChevronRight, Minus } from 'lucide-react';
import { ChangeRequest, Entity, DataItem } from '../types';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { ENTITY_FIELDS } from '../lib/fieldSchema';
import { formatValue, isEmptyValue, formatSubmittedAt } from '../lib/format';
import { FieldRow, DiffGrid, getRequestDiff, InlineChangePreview } from './shared/DiffGrid';
import { RecordTypeIcon, OperationBadge } from '../lib/badges';
import { ApproveButton, RejectButton } from './ui/ActionButton';

// Re-exported for the documented public API (consumed by FocusModeView etc.).
export { FieldRow } from './shared/DiffGrid';
export { formatValue } from '../lib/format';
export { ENTITY_FIELDS, DATAITEM_FIELDS } from '../lib/fieldSchema';

interface RequestCardProps {
  request: ChangeRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  disableApprove?: boolean;
  disableApproveTooltip?: string;
  isNested?: boolean;
  /** Submitter's view of their own request: show status, hide approve/reject + checkbox. */
  readOnly?: boolean;
}

export function RequestCard({
  request, onApprove, onReject, selected, onToggleSelect,
  disableApprove, disableApproveTooltip, isNested, readOnly,
}: RequestCardProps) {
  const diff = getRequestDiff(request);
  const { isCreate, isEntity, changedSet } = diff;
  const [viewMode, setViewMode] = useState<'full' | 'changes'>(isCreate ? 'full' : 'changes');
  const [expanded, setExpanded] = useState(false); // calm list — collapsed by default

  const isPending = request.status === 'pending';

  // Semantic color system: green=approve/new, red=reject/removed, amber=changed/attention,
  // gray=structure. Data sensitivity is shown as a labeled field in the diff, not a colored
  // border (so color isn't overloaded across unrelated meanings).
  const outerClass = isNested
    ? `border rounded-lg overflow-hidden bg-gray-50/70 ${isPending ? 'border-gray-200' : 'border-gray-100 opacity-75'}`
    : `border rounded-xl overflow-hidden bg-white ${isPending ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-75'}`;

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-600 border-red-200',
  };

  return (
    <div className={outerClass}>
      {/* Compact row */}
      <div className={`flex items-start gap-3 ${isNested ? 'px-4 py-2.5' : 'px-5 py-3'}`}>
        {isPending && onToggleSelect && (
          <div className="pt-1.5">
            <CheckboxPrimitive.Root
              checked={selected}
              onCheckedChange={() => onToggleSelect(request.id)}
              className="w-4 h-4 rounded border border-gray-300 bg-white flex items-center justify-center data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            >
              <CheckboxPrimitive.Indicator>
                <CheckCircle className="w-3 h-3 text-white" strokeWidth={3} />
              </CheckboxPrimitive.Indicator>
            </CheckboxPrimitive.Root>
          </div>
        )}

        {/* Type icon — purple Database = Entity, green FileText = Data item (matches the Data Hierarchy tree) */}
        <RecordTypeIcon type={isEntity ? 'entity' : 'dataitem'} size={isNested ? 'sm' : 'md'} className="mt-0.5" />

        {/* Info — name + type + action chip, then context */}
        <button onClick={() => setExpanded(v => !v)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {(request.proposedData as Entity | DataItem).name}
            </span>
            <span className="text-xs font-medium text-gray-400 flex-shrink-0">
              {isEntity ? 'Entity' : 'Data item'}
            </span>
            <OperationBadge operation={isCreate ? 'create' : 'edit'} className="flex-shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1 flex-wrap">
            {/* Entity context only when not visually nested (the rail/header already shows it) */}
            {!isNested && request.recordType === 'dataitem' && request.parentEntityName && (
              <>
                <span>in <span className="font-medium text-gray-600">{request.parentEntityName}</span></span>
                <span className="text-gray-300">·</span>
              </>
            )}
            <span>by <span className="font-medium text-gray-600">{request.submittedBy || 'Unknown'}</span></span>
            <span className="text-gray-300">·</span>
            <Clock className="w-3 h-3" />
            <span>{formatSubmittedAt(request.submittedAt)}</span>
          </div>

          {/* At-a-glance changes — visible on every row, no expand needed */}
          <InlineChangePreview diff={diff} />
        </button>

        {/* Status + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {(readOnly || !isPending) && (
            <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${statusColors[request.status]} capitalize`}>
              {request.status}
            </span>
          )}

          {isPending && !readOnly && (
            <>
              <TooltipPrimitive.Provider>
                <TooltipPrimitive.Root delayDuration={200}>
                  <TooltipPrimitive.Trigger asChild>
                    <span className="inline-block">
                      <ApproveButton onClick={() => onApprove(request.id)} locked={disableApprove} />
                    </span>
                  </TooltipPrimitive.Trigger>
                  {disableApprove && disableApproveTooltip && (
                    <TooltipPrimitive.Portal>
                      <TooltipPrimitive.Content
                        className="z-50 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md shadow-md"
                        sideOffset={5}
                      >
                        {disableApproveTooltip}
                        <TooltipPrimitive.Arrow className="fill-gray-900" />
                      </TooltipPrimitive.Content>
                    </TooltipPrimitive.Portal>
                  )}
                </TooltipPrimitive.Root>
              </TooltipPrimitive.Provider>

              <RejectButton onClick={() => onReject(request.id)} />
            </>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {request.rejectionReason && (
        <div className="px-5 py-2.5 bg-red-50 border-t border-red-100 text-xs text-red-700">
          <span className="font-semibold">Rejection Reason:</span> {request.rejectionReason}
        </div>
      )}

      {/* Expanded diff body */}
      {expanded && (
        <>
          {/* View toggle + summary */}
          <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isCreate && (
                <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white text-xs">
                  <button
                    onClick={() => setViewMode('full')}
                    className={`px-3 py-1.5 font-medium transition-colors ${viewMode === 'full' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Full View
                  </button>
                  <button
                    onClick={() => setViewMode('changes')}
                    className={`px-3 py-1.5 font-medium transition-colors ${viewMode === 'changes' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Changes Only
                  </button>
                </div>
              )}

              {!isCreate && changedSet.size > 0 && (
                <span className="text-xs text-gray-500">
                  <span className="font-semibold text-amber-600">{changedSet.size}</span> field{changedSet.size !== 1 ? 's' : ''} changed
                </span>
              )}
              {isCreate && (
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Layers2 className="w-3.5 h-3.5 text-emerald-500" />
                  All fields are new
                </span>
              )}
            </div>
          </div>

          <DiffGrid diff={diff} mode={viewMode} />
        </>
      )}
    </div>
  );
}

// ── Read-only entity card — current properties in the same field-grid format ──

export function EntityViewCard({
  entity, childCount, selectAllChecked, onToggleSelectAll,
}: {
  entity: Entity;
  childCount: number;
  /** Tri-state summary of this entity's pending child requests' selection. Omit (with onToggleSelectAll) to hide the control entirely — e.g. read-only views. */
  selectAllChecked?: boolean | 'indeterminate';
  onToggleSelectAll?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const values = entity as unknown as Record<string, unknown>;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/60">
      <div className="flex items-center gap-3 px-5 py-2.5">
        {onToggleSelectAll && (
          <CheckboxPrimitive.Root
            checked={selectAllChecked}
            onCheckedChange={onToggleSelectAll}
            aria-label={`Select all ${childCount} data item changes under ${entity.name}`}
            className="w-4 h-4 rounded border border-gray-300 bg-white flex items-center justify-center flex-shrink-0 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=indeterminate]:bg-blue-600 data-[state=indeterminate]:border-blue-600"
          >
            <CheckboxPrimitive.Indicator>
              {selectAllChecked === 'indeterminate'
                ? <Minus className="w-3 h-3 text-white" strokeWidth={3} />
                : <CheckCircle className="w-3 h-3 text-white" strokeWidth={3} />}
            </CheckboxPrimitive.Indicator>
          </CheckboxPrimitive.Root>
        )}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex-1 min-w-0 text-left flex items-center gap-3 hover:bg-gray-100/70 transition-colors rounded-lg -m-1 p-1"
        >
          <RecordTypeIcon type="entity" size="md" muted />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-700">{entity.name}</span>
              <span className="text-xs font-medium text-gray-400">Entity · unchanged</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {childCount} data item change{childCount !== 1 ? 's' : ''} below · {expanded ? 'hide' : 'view'} current properties
            </div>
          </div>
          {expanded
            ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </button>
      </div>

      {expanded && (
        <>
          <div className="px-5 py-2 border-t border-gray-100 bg-white text-[10px] font-medium text-gray-400 uppercase tracking-wider">
            Current entity properties · read-only
          </div>
          <div className="px-5 py-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-2">
            {ENTITY_FIELDS.map(({ key, label }) => {
              if (key === 'dataItems') return null;
              const val = values[key as string];
              if (isEmptyValue(val)) return null;
              return <FieldRow key={key as string} label={label} value={val} isChanged={false} isCreate={false} />;
            })}
          </div>
        </>
      )}
    </div>
  );
}
