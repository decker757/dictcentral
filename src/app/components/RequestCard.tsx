import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Layers2, ChevronDown, ChevronRight, Lock, Database, FileText } from 'lucide-react';
import { ChangeRequest, Entity, DataItem } from '../types';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { ENTITY_FIELDS } from '../lib/fieldSchema';
import { formatValue, isEmptyValue, formatSubmittedAt } from '../lib/format';
import { FieldRow, DiffGrid, DiffLegend, getRequestDiff } from './shared/DiffGrid';

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
}

export function RequestCard({
  request, onApprove, onReject, selected, onToggleSelect,
  disableApprove, disableApproveTooltip, isNested,
}: RequestCardProps) {
  const diff = getRequestDiff(request);
  const { isCreate, isEntity, changedSet, newFieldCount } = diff;
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

        {/* Type icon — Database = Entity, FileText = Data item (matches Tree/Table views) */}
        <div className={`flex-shrink-0 mt-0.5 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center ${isNested ? 'w-7 h-7' : 'w-8 h-8'}`}>
          {isEntity ? <Database className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
        </div>

        {/* Info — name + type + action chip, then context */}
        <button onClick={() => setExpanded(v => !v)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {(request.proposedData as Entity | DataItem).name}
            </span>
            <span className="text-xs font-medium text-gray-400 flex-shrink-0">
              {isEntity ? 'Entity' : 'Data item'}
            </span>
            {isCreate ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                Create · {newFieldCount} new
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                Edit{changedSet.size > 0 ? ` · ${changedSet.size} changed` : ''}
              </span>
            )}
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
        </button>

        {/* Status + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isPending && (
            <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${statusColors[request.status]} capitalize`}>
              {request.status}
            </span>
          )}

          {isPending && (
            <>
              <TooltipPrimitive.Provider>
                <TooltipPrimitive.Root delayDuration={200}>
                  <TooltipPrimitive.Trigger asChild>
                    <span className="inline-block">
                      <button
                        onClick={() => onApprove(request.id)}
                        disabled={disableApprove}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          disableApprove
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {disableApprove ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />} Approve
                      </button>
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

              <button
                onClick={() => onReject(request.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
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

            <DiffLegend />
          </div>

          <DiffGrid diff={diff} mode={viewMode} />
        </>
      )}
    </div>
  );
}

// ── Read-only entity card — current properties in the same field-grid format ──

export function EntityViewCard({ entity, childCount }: { entity: Entity; childCount: number }) {
  const [expanded, setExpanded] = useState(false);
  const values = entity as unknown as Record<string, unknown>;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/60">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-5 py-2.5 flex items-center gap-3 hover:bg-gray-100/70 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center flex-shrink-0">
          <Database className="w-4 h-4" />
        </div>
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
