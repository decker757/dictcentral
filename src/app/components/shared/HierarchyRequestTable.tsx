// The hierarchical Excel-style approval table — supersedes the old
// "one flat table per record type" layout. Parent entities and their child
// data items render TOGETHER, in one table per entity group, using the exact
// same column set for both (Entity and DataItem share one attribute schema —
// see types.ts / fieldSchema.ts), so a reviewer never loses the parent↔child
// relationship while scanning attributes.
//
// Each entity group gets its OWN "Full view" / "Changes only" toggle — scoped
// to that group's rows, not a global switch — so a reviewer can drill into
// one entity's edits without hiding columns other groups still need.

import { useState } from 'react';
import { Check, ArrowRight, Minus, CheckCircle } from 'lucide-react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { ChangeRequest, Entity, DataItem, SubjectArea } from '../../types';
import { SubjectAreaGroup, EntityBlock } from '../../lib/requestGroups';
import { RECORD_FIELDS } from '../../lib/fieldSchema';
import { formatValue, isEmptyValue, formatSubmittedAt } from '../../lib/format';
import { getRequestDiff } from './DiffGrid';
import { OperationBadge, RecordTypeIcon } from '../../lib/badges';
import { ApproveButton, RejectButton } from '../ui/ActionButton';

// ── Row model — a request row OR a read-only "existing entity" context row,
// normalized to the same shape so one renderer handles both. ──

interface Row {
  id: string;
  recordType: 'entity' | 'dataitem';
  name: string;
  values: Record<string, unknown>;
  original?: Record<string, unknown>;
  changedSet: Set<string>;
  isCreate: boolean;
  /** True for the read-only "unchanged parent entity" header row — no request behind it. */
  isContext: boolean;
  status?: ChangeRequest['status'];
  request?: ChangeRequest;
  entityForModal?: Entity;
}

function rowFromRequest(req: ChangeRequest): Row {
  const diff = getRequestDiff(req);
  return {
    id: req.id,
    recordType: req.recordType,
    name: (req.proposedData as Entity | DataItem).name,
    values: diff.proposed,
    original: diff.original,
    changedSet: diff.changedSet,
    isCreate: diff.isCreate,
    isContext: false,
    status: req.status,
    request: req,
  };
}

function rowFromEntity(entity: Entity): Row {
  return {
    id: `existing-${entity.id}`,
    recordType: 'entity',
    name: entity.name,
    values: entity as unknown as Record<string, unknown>,
    changedSet: new Set(),
    isCreate: false,
    isContext: true,
    entityForModal: entity,
  };
}

function rowFromName(name: string): Row {
  return {
    id: `existing-${name}`,
    recordType: 'entity',
    name,
    values: {},
    changedSet: new Set(),
    isCreate: false,
    isContext: true,
  };
}

const STATUS_BADGE: Record<ChangeRequest['status'], string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
};

function FieldValueCell({
  value, originalValue, isChanged, isCreate,
}: { value: unknown; originalValue?: unknown; isChanged: boolean; isCreate: boolean }) {
  const display = formatValue(value);
  if (!isChanged) return <span className="text-gray-600">{display}</span>;

  const originalDisplay = originalValue !== undefined ? formatValue(originalValue) : null;
  const showTransition = !isCreate && originalDisplay !== null && originalDisplay !== '—' && originalDisplay !== display;

  const newValue = (
    <span className="inline-block text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
      {display}
    </span>
  );
  if (!showTransition) return newValue;

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-gray-400 line-through">{originalDisplay}</span>
      <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
      {newValue}
    </span>
  );
}

const CHECKBOX_W = 36;
const NAME_W = 200;
const TECH_W = 170;
const ACTIONS_W = 168;

interface GroupTableProps {
  block: EntityBlock;
  subjectAreas: SubjectArea[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectMany: (ids: string[]) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRowClick: (req: ChangeRequest) => void;
  onEntityClick?: (entity: Entity) => void;
  isParentPendingNew: (req: ChangeRequest) => boolean;
}

function EntityGroupTable({
  block, subjectAreas, selectedIds, onToggleSelect, onSelectMany,
  onApprove, onReject, onRowClick, onEntityClick, isParentPendingNew,
}: GroupTableProps) {
  // Per-group toggle — scoped to this entity's table only.
  const [changesOnly, setChangesOnly] = useState(true);

  let parentRow: Row;
  if (block.kind === 'entityRequest') {
    parentRow = rowFromRequest(block.request);
  } else {
    let entity: Entity | undefined;
    const parentId = block.children[0]?.parentEntityId;
    if (parentId) {
      for (const sa of subjectAreas) {
        const e = sa.entities.find(e => e.id === parentId);
        if (e) { entity = e; break; }
      }
    }
    parentRow = entity ? rowFromEntity(entity) : rowFromName(block.entityName);
  }

  const childRows = block.children.map(rowFromRequest);

  const otherFields = RECORD_FIELDS.filter(f => f.key !== 'name' && f.key !== 'technicalName');
  // "Changes only" still narrows down to what's relevant, but the parent
  // entity's own filled-in attributes are always shown regardless of the
  // toggle — only the children's columns actually get filtered down.
  const visibleFields = changesOnly
    ? otherFields.filter(f => {
        const key = f.key as string;
        if (!isEmptyValue(parentRow.values[key])) return true;
        return childRows.some(r => (r.isCreate ? !isEmptyValue(r.values[key]) : r.changedSet.has(key)));
      })
    : otherFields;

  const pendingChildIds = childRows.filter(r => r.status === 'pending').map(r => r.id);
  const selectedChildCount = pendingChildIds.filter(id => selectedIds.has(id)).length;
  const childSelectAllChecked: boolean | 'indeterminate' = selectedChildCount === 0
    ? false
    : selectedChildCount === pendingChildIds.length ? true : 'indeterminate';

  const nameLeft = CHECKBOX_W;
  const techLeft = nameLeft + NAME_W;

  const handleParentClick = () => {
    if (parentRow.isContext) {
      if (parentRow.entityForModal && onEntityClick) onEntityClick(parentRow.entityForModal);
    } else if (parentRow.request) {
      onRowClick(parentRow.request);
    }
  };

  const renderRow = (row: Row) => {
    const isPending = row.status === 'pending';
    const isSelected = selectedIds.has(row.id);
    const rowBg = row.isContext
      ? 'bg-gray-50/70'
      : isSelected ? 'bg-blue-50' : row.status && row.status !== 'pending' ? 'bg-gray-50/50' : 'bg-white';
    const disableApprove = row.request ? isParentPendingNew(row.request) : false;
    const techValue = row.values['technicalName'];
    const clickable = row.isContext ? !!parentRow.entityForModal : true;

    return (
      <tr
        key={row.id}
        className={`${rowBg} ${clickable ? 'hover:bg-blue-50/30 cursor-pointer' : ''} transition-colors group`}
        onClick={() => {
          if (row.isContext) handleParentClick();
          else if (row.request) onRowClick(row.request);
        }}
      >
        <td
          className={`sticky z-10 ${rowBg} border-b border-r border-gray-100 px-2 py-2`}
          style={{ left: 0, width: CHECKBOX_W }}
          onClick={e => e.stopPropagation()}
        >
          {!row.isContext && isPending && (
            <CheckboxPrimitive.Root
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(row.id)}
              className="w-4 h-4 rounded border border-gray-300 bg-white flex items-center justify-center data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            >
              <CheckboxPrimitive.Indicator>
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </CheckboxPrimitive.Indicator>
            </CheckboxPrimitive.Root>
          )}
        </td>
        <td
          className={`sticky z-10 ${rowBg} border-b border-r border-gray-100 px-3 py-2 font-medium text-gray-800`}
          style={{ left: nameLeft, width: NAME_W }}
        >
          <div className="flex items-center gap-1.5 min-w-0" style={{ paddingLeft: row.isContext ? 0 : 14 }}>
            <RecordTypeIcon type={row.recordType} size="xs" boxless muted={row.isContext} />
            <span className={`truncate ${clickable ? 'group-hover:text-blue-700 group-hover:underline' : ''} ${row.isContext ? 'text-gray-600' : ''}`}>
              {row.name}
            </span>
          </div>
        </td>
        <td
          className={`sticky z-10 ${rowBg} border-b border-gray-100 px-3 py-2 font-mono text-[11px] text-gray-500 shadow-[3px_0_5px_-3px_rgba(0,0,0,0.08)]`}
          style={{ left: techLeft, width: TECH_W }}
        >
          {formatValue(techValue)}
        </td>
        <td className="border-b border-gray-100 px-3 py-2 whitespace-nowrap">
          {row.isContext
            ? <span className="text-[11px] text-gray-400 font-medium">Unchanged</span>
            : <OperationBadge operation={row.request!.type} />}
        </td>
        <td className="border-b border-gray-100 px-3 py-2 whitespace-nowrap">
          {row.status && (
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize ${STATUS_BADGE[row.status]}`}>
              {row.status}
            </span>
          )}
        </td>
        <td className="border-b border-gray-100 px-3 py-2 whitespace-nowrap text-gray-500">
          {row.request ? (row.request.submittedBy || 'Unknown') : '—'}
        </td>
        <td className="border-b border-gray-100 px-3 py-2 whitespace-nowrap text-gray-500">
          {row.request ? formatSubmittedAt(row.request.submittedAt) : '—'}
        </td>
        {visibleFields.map(f => {
          const key = f.key as string;
          const proposedVal = row.values[key];
          const originalVal = row.original ? row.original[key] : undefined;
          const isChanged = !row.isContext && (row.isCreate || row.changedSet.has(key));
          return (
            <td key={key} className="border-b border-gray-100 px-3 py-2 align-top" style={{ minWidth: 160, maxWidth: 280 }}>
              <div className="break-words">
                <FieldValueCell value={proposedVal} originalValue={originalVal} isChanged={isChanged} isCreate={row.isCreate} />
              </div>
            </td>
          );
        })}
        <td
          className={`sticky right-0 z-10 ${rowBg} border-b border-gray-100 px-2 py-2 shadow-[-3px_0_5px_-3px_rgba(0,0,0,0.08)]`}
          style={{ width: ACTIONS_W }}
          onClick={e => e.stopPropagation()}
        >
          {!row.isContext && isPending ? (
            <div className="flex items-center gap-1.5">
              <ApproveButton size="sm" onClick={() => onApprove(row.id)} locked={disableApprove} className="px-2.5" />
              <RejectButton size="sm" onClick={() => onReject(row.id)} className="px-2.5" />
            </div>
          ) : !row.isContext ? (
            <span className="text-[11px] text-gray-400">No actions</span>
          ) : null}
        </td>
      </tr>
    );
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Group header: identity + per-group toggle */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          {pendingChildIds.length > 0 && (
            <CheckboxPrimitive.Root
              checked={childSelectAllChecked}
              onCheckedChange={() => onSelectMany(pendingChildIds)}
              aria-label={`Select all ${pendingChildIds.length} pending data item changes under ${parentRow.name}`}
              className="w-4 h-4 rounded border border-gray-300 bg-white flex items-center justify-center flex-shrink-0 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=indeterminate]:bg-blue-600 data-[state=indeterminate]:border-blue-600"
            >
              <CheckboxPrimitive.Indicator>
                {childSelectAllChecked === 'indeterminate'
                  ? <Minus className="w-3 h-3 text-white" strokeWidth={3} />
                  : <CheckCircle className="w-3 h-3 text-white" strokeWidth={3} />}
              </CheckboxPrimitive.Indicator>
            </CheckboxPrimitive.Root>
          )}
          <RecordTypeIcon type="entity" size="sm" muted={parentRow.isContext} />
          <span className="text-sm font-semibold text-gray-800 truncate">{parentRow.name}</span>
          {parentRow.isContext && <span className="text-xs font-medium text-gray-400 flex-shrink-0">unchanged</span>}
          <span className="text-xs text-gray-400 flex-shrink-0">
            {childRows.length} data item{childRows.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setChangesOnly(v => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors flex-shrink-0 ${
            changesOnly ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
          title="Toggle between all attribute columns and only the ones changed in this entity's group"
        >
          {changesOnly ? 'Changes only' : 'Full view'}
        </button>
      </div>

      <div className="overflow-auto max-h-[60vh]">
        <table className="border-separate text-xs w-full" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="sticky top-0 z-30 bg-gray-50 border-b border-r border-gray-200 px-2 py-2 text-left" style={{ left: 0, width: CHECKBOX_W, minWidth: CHECKBOX_W }} />
              <th className="sticky top-0 z-30 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap" style={{ left: nameLeft, width: NAME_W, minWidth: NAME_W }}>
                Business Name
              </th>
              <th className="sticky top-0 z-30 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap shadow-[3px_0_5px_-3px_rgba(0,0,0,0.12)]" style={{ left: techLeft, width: TECH_W, minWidth: TECH_W }}>
                Technical Name
              </th>
              <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">Operation</th>
              <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">Status</th>
              <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">Submitted By</th>
              <th className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">Submitted At</th>
              {visibleFields.map(f => (
                <th key={f.key as string} className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap" style={{ minWidth: 160, maxWidth: 280 }}>
                  {f.label}
                </th>
              ))}
              <th className="sticky top-0 right-0 z-30 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap shadow-[-3px_0_5px_-3px_rgba(0,0,0,0.12)]" style={{ width: ACTIONS_W, minWidth: ACTIONS_W }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {renderRow(parentRow)}
            {childRows.map(renderRow)}
          </tbody>
        </table>
      </div>
      {changesOnly && visibleFields.length === 0 && (
        <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100">
          No changed attributes in this entity's group — every row here is either unchanged or a new record.
        </div>
      )}
    </div>
  );
}

interface HierarchyRequestTableProps {
  groups: SubjectAreaGroup[];
  subjectAreas: SubjectArea[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectMany: (ids: string[]) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRowClick: (req: ChangeRequest) => void;
  onEntityClick?: (entity: Entity) => void;
  isParentPendingNew: (req: ChangeRequest) => boolean;
}

export function HierarchyRequestTable({
  groups, subjectAreas,
  selectedIds, onToggleSelect, onSelectMany, onApprove, onReject,
  onRowClick, onEntityClick, isParentPendingNew,
}: HierarchyRequestTableProps) {
  // Flattened — no subject-area grouping/header; just one entity group after
  // another, each its own self-contained parent+children table.
  const allBlocks = groups.flatMap(g => g.blocks);

  return (
    <div className="flex flex-col gap-4">
      {allBlocks.map(block => (
        <EntityGroupTable
          key={block.kind === 'entityRequest' ? block.request.id : `ee-${block.entityName}`}
          block={block}
          subjectAreas={subjectAreas}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onSelectMany={onSelectMany}
          onApprove={onApprove}
          onReject={onReject}
          onRowClick={onRowClick}
          onEntityClick={onEntityClick}
          isParentPendingNew={isParentPendingNew}
        />
      ))}
    </div>
  );
}
