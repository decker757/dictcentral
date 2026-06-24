// The hierarchical Excel-style review table. Parent entities and their child
// data items render TOGETHER, in one table per entity group, using the exact
// same column set for both (Entity and DataItem share one attribute schema —
// see types.ts / fieldSchema.ts), so a reviewer never loses the parent↔child
// relationship while scanning attributes.
//
// Approval is whole-REQUEST only (see useCatalog/SubmissionDetailView) — this
// table has no per-row Approve/Reject. Instead every row gets its own
// Comments cell (an approver note tied to that specific entity/data item),
// and the entity (parent) row is visually distinct from its data-item
// (child) rows: bold + tinted background at the root, indented + connector
// line for children, so the hierarchy reads at a glance.
//
// Each entity group gets its OWN "Full view" / "Changes only" toggle — scoped
// to that group's rows, not a global switch — so a reviewer can drill into
// one entity's edits without hiding columns other groups still need.

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ChangeRequest, Entity, DataItem, SubjectArea, Comment } from '../../types';
import { SubjectAreaGroup, EntityBlock } from '../../lib/requestGroups';
import { RECORD_FIELDS } from '../../lib/fieldSchema';
import { formatValue, isEmptyValue } from '../../lib/format';
import { getRequestDiff } from './DiffGrid';
import { RecordTypeIcon } from '../../lib/badges';
import { CommentThread } from './CommentThread';

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

const NAME_W = 220;
const TECH_W = 170;
const COMMENT_W = 260;

interface GroupTableProps {
  block: EntityBlock;
  subjectAreas: SubjectArea[];
  onRowClick?: (req: ChangeRequest) => void;
  onEntityClick?: (entity: Entity) => void;
  comments: Record<string, Comment[]>;
  drafts: Record<string, string>;
  onDraftChange: (requestId: string, text: string) => void;
  /** Board member view: comments are the approver's notes, shown but not editable. */
  readOnly?: boolean;
}

function EntityGroupTable({
  block, subjectAreas, onRowClick, onEntityClick, comments, drafts, onDraftChange, readOnly,
}: GroupTableProps) {
  // Per-group toggle — scoped to this entity's table only. Defaults to the
  // full attribute view; "Changes Only" is an explicit, named choice.
  const [viewMode, setViewMode] = useState<'full' | 'changes'>('full');
  const changesOnly = viewMode === 'changes';

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

  // The subject area this entity group lives in — shown on the group header
  // so a reviewer scanning a request that spans multiple subject areas
  // always knows which one a given entity belongs to.
  const subjectAreaName = block.kind === 'entityRequest'
    ? block.request.subjectAreaName
    : block.children[0]?.subjectAreaName;

  const otherFields = RECORD_FIELDS.filter(f => f.key !== 'name' && f.key !== 'technicalName');
  // "Changes only" shows ONLY columns that actually changed (or, for a new
  // record, columns that actually have a value) — applied evenly to the
  // parent row too, so an unchanged-but-filled-in parent attribute no longer
  // gets a free pass into view.
  const visibleFields = changesOnly
    ? otherFields.filter(f => {
        const key = f.key as string;
        const parentChanged = !parentRow.isContext && (parentRow.isCreate ? !isEmptyValue(parentRow.values[key]) : parentRow.changedSet.has(key));
        const childChanged = childRows.some(r => (r.isCreate ? !isEmptyValue(r.values[key]) : r.changedSet.has(key)));
        return parentChanged || childChanged;
      })
    : otherFields;

  const nameLeft = 0;
  const techLeft = nameLeft + NAME_W;

  const handleParentClick = () => {
    if (parentRow.isContext) {
      if (parentRow.entityForModal && onEntityClick) onEntityClick(parentRow.entityForModal);
    } else if (parentRow.request && onRowClick) {
      onRowClick(parentRow.request);
    }
  };

  // depth 0 = the entity (parent) row itself; depth 1 = a nested data-item row.
  // This is the actual parent↔child signal — NOT `isContext` (which only
  // distinguishes "unchanged entity header" from "entity is itself a
  // request") so an entity-create/edit row never gets mistaken for a child.
  const renderRow = (row: Row, depth: 0 | 1) => {
    const isChild = depth === 1;
    // Fully opaque backgrounds — these cells are STICKY (Name/Tech/Comments
    // columns stay pinned while the row scrolls horizontally underneath
    // them), so any transparency here lets the scrolled-away columns show
    // through the frozen ones. Solid color only.
    const rowBg = row.isContext
      ? 'bg-gray-50'
      : !isChild
        ? 'bg-purple-50'
        : row.status && row.status !== 'pending' ? 'bg-gray-50' : 'bg-white';
    const techValue = row.values['technicalName'];
    const clickable = row.isContext ? !!parentRow.entityForModal : !!onRowClick;

    return (
      <tr
        key={row.id}
        className={`${rowBg} ${clickable ? 'hover:bg-blue-50 cursor-pointer' : ''} transition-colors group`}
        onClick={() => {
          if (row.isContext) handleParentClick();
          else if (row.request && onRowClick) onRowClick(row.request);
        }}
      >
        <td
          className={`sticky z-10 ${rowBg} border-b border-r border-gray-100 px-3 py-2 ${!isChild ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}
          style={{ left: nameLeft, width: NAME_W }}
        >
          <div className="flex items-center min-w-0">
            {/* Tree connector for child rows — a vertical rail + corner tick,
                so the entity→data-item relationship reads as a literal tree,
                not just extra whitespace. */}
            {isChild && (
              <span className="relative flex-shrink-0" style={{ width: 28, height: 20 }} aria-hidden="true">
                <span className="absolute left-3 top-0 bottom-0 w-px bg-gray-300" />
                <span className="absolute left-3 top-1/2 w-3 h-px bg-gray-300" />
              </span>
            )}
            <RecordTypeIcon type={row.recordType} size="xs" boxless muted={row.isContext} className="flex-shrink-0" />
            <span className={`truncate ml-1.5 ${clickable ? 'group-hover:text-blue-700 group-hover:underline' : ''} ${row.isContext ? 'text-gray-600' : ''}`}>
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
          className={`sticky right-0 z-10 ${rowBg} border-b border-gray-100 px-2 py-1.5 align-top shadow-[-3px_0_5px_-3px_rgba(0,0,0,0.08)]`}
          style={{ width: COMMENT_W }}
          onClick={e => e.stopPropagation()}
        >
          {!row.isContext ? (
            <CommentThread
              comments={comments[row.id] ?? []}
              readOnly={readOnly}
              draft={drafts[row.id] ?? ''}
              onDraftChange={readOnly ? undefined : text => onDraftChange(row.id, text)}
              placeholder="Add a comment…"
              compact
            />
          ) : (
            <span className="text-[11px] text-gray-400">—</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Group header: identity only — no select-all (whole request is the
          unit of approval, so per-entity bulk-select no longer applies). */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <RecordTypeIcon type="entity" size="sm" muted={parentRow.isContext} />
          <span className="text-sm font-semibold text-gray-800 truncate">{parentRow.name}</span>
          {subjectAreaName && (
            <span className="text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex-shrink-0">
              {subjectAreaName}
            </span>
          )}
          {parentRow.isContext && <span className="text-xs font-medium text-gray-400 flex-shrink-0">unchanged</span>}
          <span className="text-xs text-gray-400 flex-shrink-0">
            {childRows.length} data item{childRows.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex rounded-md border border-gray-200 overflow-hidden bg-white text-xs flex-shrink-0">
          <button
            onClick={() => setViewMode('full')}
            className={`px-2.5 py-1 font-medium transition-colors ${viewMode === 'full' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Full View
          </button>
          <button
            onClick={() => setViewMode('changes')}
            className={`px-2.5 py-1 font-medium transition-colors ${viewMode === 'changes' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            title="Show only the columns that actually changed, with the old value crossed out and the new value highlighted"
          >
            Changes Only
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-[60vh]">
        <table className="border-separate text-xs w-full" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="sticky top-0 z-30 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap" style={{ left: nameLeft, width: NAME_W, minWidth: NAME_W }}>
                Business Name
              </th>
              <th className="sticky top-0 z-30 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap shadow-[3px_0_5px_-3px_rgba(0,0,0,0.12)]" style={{ left: techLeft, width: TECH_W, minWidth: TECH_W }}>
                Technical Name
              </th>
              {visibleFields.map(f => (
                <th key={f.key as string} className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap" style={{ minWidth: 160, maxWidth: 280 }}>
                  {f.label}
                </th>
              ))}
              <th className="sticky top-0 right-0 z-30 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap shadow-[-3px_0_5px_-3px_rgba(0,0,0,0.12)]" style={{ width: COMMENT_W, minWidth: COMMENT_W }}>
                Comments
              </th>
            </tr>
          </thead>
          <tbody>
            {renderRow(parentRow, 0)}
            {childRows.map(row => renderRow(row, 1))}
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
  onRowClick?: (req: ChangeRequest) => void;
  onEntityClick?: (entity: Entity) => void;
  comments: Record<string, Comment[]>;
  drafts: Record<string, string>;
  onDraftChange: (requestId: string, text: string) => void;
  readOnly?: boolean;
}

export function HierarchyRequestTable({
  groups, subjectAreas, onRowClick, onEntityClick, comments, drafts, onDraftChange, readOnly,
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
          onRowClick={onRowClick}
          onEntityClick={onEntityClick}
          comments={comments}
          drafts={drafts}
          onDraftChange={onDraftChange}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}
