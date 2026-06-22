// The grouped change-request list — subject-area cards → entity blocks → nested
// data-item rails. Shared so the approver queue and the board member's
// "My Requests" render identically; the only difference is read-only vs actionable.

import { ChevronDown, CheckCircle, Minus } from 'lucide-react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { ChangeRequest, Entity, SubjectArea } from '../../types';
import { RequestCard, EntityViewCard } from '../RequestCard';
import { RecordTypeIcon } from '../../lib/badges';
import { SubjectAreaGroup, EntityBlock } from '../../lib/requestGroups';

interface RequestGroupListProps {
  groups: SubjectAreaGroup[];
  subjectAreas: SubjectArea[];
  collapsedGroups: Set<string>;
  onToggleGroup: (name: string) => void;
  /** Submitter's view: read-only cards (status only — no approve/reject/select). */
  readOnly?: boolean;
  // ── Actionable (approver) wiring — ignored when readOnly ──
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  /** Select/deselect a whole batch of ids at once (e.g. "select all" under one unchanged entity). */
  onSelectMany?: (ids: string[]) => void;
  isParentPendingNew?: (req: ChangeRequest) => boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

const noop = () => {};

/** Shared select-all checkbox (tri-state) for a batch of pending request ids. */
function SelectAllCheckbox({
  checked, onToggle, label,
}: {
  checked: boolean | 'indeterminate';
  onToggle: () => void;
  label: string;
}) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={onToggle}
      aria-label={label}
      className="w-4 h-4 rounded border border-gray-300 bg-white flex items-center justify-center flex-shrink-0 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=indeterminate]:bg-blue-600 data-[state=indeterminate]:border-blue-600"
    >
      <CheckboxPrimitive.Indicator>
        {checked === 'indeterminate'
          ? <Minus className="w-3 h-3 text-white" strokeWidth={3} />
          : <CheckCircle className="w-3 h-3 text-white" strokeWidth={3} />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function RequestGroupList({
  groups, subjectAreas, collapsedGroups, onToggleGroup, readOnly,
  selectedIds, onToggleSelect, onSelectMany, isParentPendingNew, onApprove, onReject,
}: RequestGroupListProps) {
  const renderRequestCard = (request: ChangeRequest, isNested: boolean) => {
    if (readOnly) {
      return <RequestCard request={request} isNested={isNested} readOnly onApprove={noop} onReject={noop} />;
    }
    const disableApprove = isParentPendingNew?.(request) ?? false;
    const disableTooltip = disableApprove
      ? `Approve the parent entity '${request.parentEntityName}' first.`
      : undefined;
    return (
      <RequestCard
        request={request}
        isNested={isNested}
        selected={selectedIds?.has(request.id)}
        onToggleSelect={onToggleSelect}
        disableApprove={disableApprove}
        disableApproveTooltip={disableTooltip}
        onApprove={() => onApprove?.(request.id)}
        onReject={() => onReject?.(request.id)}
      />
    );
  };

  const renderChildRail = (children: ChangeRequest[], caption?: string) => (
    <div className="ml-5 mt-1.5 pl-5 border-l-2 border-gray-200 flex flex-col gap-1.5">
      {caption && <div className="text-[11px] text-gray-400 pl-0.5 -mb-0.5">{caption}</div>}
      {children.map(child => (
        <div key={child.id} className="relative">
          <span className="absolute -left-5 top-[1.65rem] w-4 h-px bg-gray-200" aria-hidden="true" />
          {renderRequestCard(child, true)}
        </div>
      ))}
    </div>
  );

  const renderBlock = (block: EntityBlock) => {
    if (block.kind === 'entityRequest') {
      if (block.children.length === 0) {
        return <div key={block.request.id}>{renderRequestCard(block.request, false)}</div>;
      }
      const n = block.children.length;
      const caption = block.request.type === 'create'
        ? `${n} data item${n !== 1 ? 's' : ''} in this new entity${readOnly ? '' : ' · approve the entity first'}`
        : `${n} data item${n !== 1 ? 's' : ''} in this entity`;
      return (
        <div key={block.request.id} className="flex flex-col">
          {renderRequestCard(block.request, false)}
          {renderChildRail(block.children, caption)}
        </div>
      );
    }

    // Existing (unchanged) entity — read-only context card so data items never
    // float at the top level.
    const n = block.children.length;
    const parentId = block.children[0]?.parentEntityId;
    let entity: Entity | undefined;
    if (parentId) {
      for (const s of subjectAreas) {
        const e = s.entities.find(e => e.id === parentId);
        if (e) { entity = e; break; }
      }
    }

    // "Select all" for every pending data item nested under this unchanged
    // entity — hidden entirely in read-only views or when nothing's pending.
    const pendingChildIds = !readOnly ? block.children.filter(c => c.status === 'pending').map(c => c.id) : [];
    const selectedChildCount = pendingChildIds.filter(id => selectedIds?.has(id)).length;
    const selectAllChecked: boolean | 'indeterminate' | undefined = pendingChildIds.length === 0
      ? undefined
      : selectedChildCount === 0 ? false
      : selectedChildCount === pendingChildIds.length ? true
      : 'indeterminate';
    const handleToggleSelectAll = pendingChildIds.length > 0 && onSelectMany
      ? () => onSelectMany(pendingChildIds)
      : undefined;

    return (
      <div key={`ee-${block.entityName}`} className="flex flex-col">
        {entity ? (
          <EntityViewCard
            entity={entity}
            childCount={n}
            selectAllChecked={selectAllChecked}
            onToggleSelectAll={handleToggleSelectAll}
          />
        ) : (
          <div className="border border-gray-200 rounded-xl bg-gray-50/60 px-5 py-2.5 flex items-center gap-3">
            {handleToggleSelectAll && selectAllChecked !== undefined && (
              <SelectAllCheckbox
                checked={selectAllChecked}
                onToggle={handleToggleSelectAll}
                label={`Select all ${n} data item changes under ${block.entityName}`}
              />
            )}
            <RecordTypeIcon type="entity" size="md" muted />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-700">{block.entityName}</span>
                <span className="text-xs font-medium text-gray-400">Entity · unchanged</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {n} data item change{n !== 1 ? 's' : ''} below
              </div>
            </div>
          </div>
        )}
        {renderChildRail(block.children)}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {groups.map(group => {
        const collapsed = collapsedGroups.has(group.name);
        return (
          <div key={group.name} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => onToggleGroup(group.name)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors text-left group"
            >
              {/* Subject area = blue (matches the Data Hierarchy tree) */}
              <RecordTypeIcon type="subjectArea" size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{group.name}</span>
                  {group.pendingCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-amber-50 text-amber-700 border-amber-200">
                      {group.pendingCount} pending
                    </span>
                  )}
                </div>
                {/* Second line only when it adds info beyond the pending badge */}
                {group.total - group.pendingCount > 0 && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {group.total - group.pendingCount} resolved
                  </div>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${collapsed ? '-rotate-90' : ''}`} />
            </button>

            {!collapsed && (
              <div className="border-t border-gray-100 p-4 bg-gray-50/40 flex flex-col gap-3">
                {group.blocks.map(block => renderBlock(block))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
