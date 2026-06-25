// The EDITABLE counterpart to HierarchyRequestTable — same Excel-style
// parent-entity + child-data-item layout, same column set (RECORD_FIELDS),
// but every cell for an actual request row (not a read-only "unchanged
// entity" context row) is a live input/select/textarea instead of a static
// value. Used only by the board member's "Revise & Resubmit" flow for a
// rejected request: they see their previous values pre-filled, the
// approver's comments alongside (read-only — comments still have one commit
// point, the original Approve/Reject, so this view never adds new drafts to
// that thread), and can edit anything before validating and resubmitting.
//
// Field editing controls are driven entirely by RECORD_FIELDS' `kind` /
// `options` metadata (lib/fieldSchema.ts) — one source of truth shared with
// the read-only diff views, so adding a field there is enough for it to show
// up here with the right control automatically.

import { ChangeRequest, Entity, RecordAttributes, SubjectArea, Comment } from '../../types';
import { SubjectAreaGroup, EntityBlock } from '../../lib/requestGroups';
import { RECORD_FIELDS, REQUIRED_RECORD_FIELDS, FieldKind, fieldInputValue, parseFieldInput } from '../../lib/fieldSchema';
import { formatValue } from '../../lib/format';
import { findEntityById } from '../../lib/catalog';
import { ENTITY_NAME_COL_WIDTH, TECHNICAL_NAME_COL_WIDTH, TECHNICAL_NAME_COL_LEFT } from '../../lib/tableLayout';
import { RecordTypeIcon } from '../../lib/badges';
import { CommentThread } from './CommentThread';
import { EntityGroupHeader } from './EntityGroupHeader';
import { TreeConnector } from './TreeConnector';

/** One row's in-progress edits, keyed by ChangeRequest id. Always a full RecordAttributes-shaped
 * draft (seeded from proposedData) so every field — touched or not — has a current value. */
export type DraftMap = Record<string, RecordAttributes>;

const COMMENT_W = 240;

const OTHER_FIELDS = RECORD_FIELDS.filter(f => f.key !== 'name' && f.key !== 'technicalName');

function isRequired(key: string): boolean {
  return REQUIRED_RECORD_FIELDS.includes(key as keyof RecordAttributes);
}

function FieldControl({
  fieldKey, kind, options, value, onChange, invalid,
}: {
  fieldKey: string;
  kind?: FieldKind;
  options?: readonly string[];
  value: unknown;
  onChange: (v: unknown) => void;
  invalid?: boolean;
}) {
  const display = fieldInputValue(kind, value);
  const cls = `w-full text-xs border rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-blue-400 bg-white ${
    invalid ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-200'
  }`;

  if (kind === 'select') {
    const required = isRequired(fieldKey);
    return (
      <select className={cls} value={display} onChange={e => onChange(parseFieldInput(fieldKey, kind, e.target.value))}>
        {!required && <option value="">{fieldKey === 'keyIndicator' ? '— None —' : '— Select —'}</option>}
        {(options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (kind === 'boolean') {
    return (
      <select className={cls} value={display} onChange={e => onChange(parseFieldInput(fieldKey, kind, e.target.value))}>
        <option value="">—</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    );
  }
  if (kind === 'textarea') {
    return (
      <textarea
        className={`${cls} resize-none`}
        rows={2}
        value={display}
        onChange={e => onChange(parseFieldInput(fieldKey, kind, e.target.value))}
      />
    );
  }
  return (
    <input
      type={kind === 'number' ? 'number' : 'text'}
      className={cls}
      value={display}
      onChange={e => onChange(parseFieldInput(fieldKey, kind, e.target.value))}
    />
  );
}

interface GroupTableProps {
  block: EntityBlock;
  subjectAreas: SubjectArea[];
  drafts: DraftMap;
  onFieldChange: (requestId: string, key: string, value: unknown) => void;
  comments: Record<string, Comment[]>;
  invalidFields: Record<string, Set<string>>;
}

function EditableEntityGroupTable({
  block, subjectAreas, drafts, onFieldChange, comments, invalidFields,
}: GroupTableProps) {
  // Narrow on `block.kind` directly (not a derived boolean) so TypeScript
  // actually knows which arm of the union we're in at each access below.
  let parentRequest: ChangeRequest | undefined;
  let contextEntity: Entity | undefined;
  let contextName = '';
  let subjectAreaName: string | undefined;

  if (block.kind === 'entityRequest') {
    parentRequest = block.request;
    subjectAreaName = block.request.subjectAreaName;
  } else {
    contextName = block.entityName;
    subjectAreaName = block.children[0]?.subjectAreaName;
    // The "existing entity" context row (this entity itself wasn't part of
    // the rejected request — only some of its data items were) — resolve
    // the real entity purely for display, same as the read-only table does.
    const parentId = block.children[0]?.parentEntityId;
    contextEntity = parentId ? findEntityById(subjectAreas, parentId)?.entity : undefined;
  }

  const isParentRequest = !!parentRequest;
  const parentName = parentRequest
    ? (drafts[parentRequest.id]?.name ?? (parentRequest.proposedData as RecordAttributes).name)
    : (contextEntity?.name ?? contextName);

  const nameLeft = 0;
  const techLeft = TECHNICAL_NAME_COL_LEFT;

  const renderEditableRow = (req: ChangeRequest, isChild: boolean) => {
    const draft = drafts[req.id] ?? (req.proposedData as RecordAttributes);
    const invalid = invalidFields[req.id] ?? new Set<string>();
    const rowBg = !isChild ? 'bg-purple-50' : 'bg-white';

    return (
      <tr key={req.id} className={rowBg}>
        <td
          className={`sticky z-10 ${rowBg} border-b border-r border-gray-100 px-2 py-1.5`}
          style={{ left: nameLeft, width: ENTITY_NAME_COL_WIDTH }}
        >
          <div className="flex items-center min-w-0 gap-1">
            {isChild && <TreeConnector size="compact" />}
            <RecordTypeIcon type={req.recordType} size="xs" boxless className="flex-shrink-0" />
            <input
              className={`flex-1 min-w-0 text-xs font-medium border rounded-md px-1.5 py-1 outline-none focus:ring-2 focus:ring-blue-400 bg-white ${
                invalid.has('name') ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-200'
              }`}
              value={draft.name ?? ''}
              onChange={e => onFieldChange(req.id, 'name', e.target.value || undefined)}
            />
          </div>
        </td>
        <td
          className={`sticky z-10 ${rowBg} border-b border-gray-100 px-2 py-1.5 shadow-[3px_0_5px_-3px_rgba(0,0,0,0.08)]`}
          style={{ left: techLeft, width: TECHNICAL_NAME_COL_WIDTH }}
        >
          <input
            className={`w-full text-[11px] font-mono border rounded-md px-1.5 py-1 outline-none focus:ring-2 focus:ring-blue-400 bg-white ${
              invalid.has('technicalName') ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-200'
            }`}
            value={draft.technicalName ?? ''}
            onChange={e => onFieldChange(req.id, 'technicalName', e.target.value || undefined)}
          />
        </td>
        {OTHER_FIELDS.map(f => {
          const key = f.key as string;
          return (
            <td key={key} className="border-b border-gray-100 px-2 py-1.5 align-top" style={{ minWidth: 170, maxWidth: 280 }}>
              <FieldControl
                fieldKey={key}
                kind={f.kind}
                options={f.options}
                value={draft[f.key as keyof RecordAttributes]}
                onChange={v => onFieldChange(req.id, key, v)}
                invalid={invalid.has(key)}
              />
            </td>
          );
        })}
        <td
          className={`sticky right-0 z-10 ${rowBg} border-b border-gray-100 px-2 py-1.5 align-top shadow-[-3px_0_5px_-3px_rgba(0,0,0,0.08)]`}
          style={{ width: COMMENT_W }}
        >
          <CommentThread comments={comments[req.id] ?? []} readOnly compact />
        </td>
      </tr>
    );
  };

  const renderContextRow = () => {
    const rowBg = 'bg-gray-50';
    const values = (contextEntity ?? {}) as unknown as Record<string, unknown>;
    return (
      <tr className={rowBg}>
        <td
          className={`sticky z-10 ${rowBg} border-b border-r border-gray-100 px-3 py-2 font-semibold text-gray-600`}
          style={{ left: nameLeft, width: ENTITY_NAME_COL_WIDTH }}
        >
          <div className="flex items-center min-w-0 gap-1.5">
            <RecordTypeIcon type="entity" size="xs" boxless muted className="flex-shrink-0" />
            <span className="truncate">{parentName}</span>
          </div>
        </td>
        <td
          className={`sticky z-10 ${rowBg} border-b border-gray-100 px-3 py-2 font-mono text-[11px] text-gray-500 shadow-[3px_0_5px_-3px_rgba(0,0,0,0.08)]`}
          style={{ left: techLeft, width: TECHNICAL_NAME_COL_WIDTH }}
        >
          {formatValue(values['technicalName'])}
        </td>
        {OTHER_FIELDS.map(f => (
          <td key={f.key as string} className="border-b border-gray-100 px-3 py-2 text-gray-500" style={{ minWidth: 170, maxWidth: 280 }}>
            {formatValue(values[f.key as string])}
          </td>
        ))}
        <td className={`sticky right-0 z-10 ${rowBg} border-b border-gray-100 px-2 py-1.5 shadow-[-3px_0_5px_-3px_rgba(0,0,0,0.08)]`} style={{ width: COMMENT_W }}>
          <span className="text-[11px] text-gray-400">—</span>
        </td>
      </tr>
    );
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <EntityGroupHeader
        name={parentName}
        isContext={!isParentRequest}
        subjectAreaName={subjectAreaName}
        childCount={block.children.length}
      />

      <div className="overflow-auto max-h-[60vh]">
        <table className="border-separate text-xs w-full" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="sticky top-0 z-30 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap" style={{ left: nameLeft, width: ENTITY_NAME_COL_WIDTH, minWidth: ENTITY_NAME_COL_WIDTH }}>
                Business Name<span className="text-red-500"> *</span>
              </th>
              <th className="sticky top-0 z-30 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap shadow-[3px_0_5px_-3px_rgba(0,0,0,0.12)]" style={{ left: techLeft, width: TECHNICAL_NAME_COL_WIDTH, minWidth: TECHNICAL_NAME_COL_WIDTH }}>
                Technical Name<span className="text-red-500"> *</span>
              </th>
              {OTHER_FIELDS.map(f => (
                <th key={f.key as string} className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap" style={{ minWidth: 170, maxWidth: 280 }}>
                  {f.label}{isRequired(f.key as string) && <span className="text-red-500"> *</span>}
                </th>
              ))}
              <th className="sticky top-0 right-0 z-30 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap shadow-[-3px_0_5px_-3px_rgba(0,0,0,0.12)]" style={{ width: COMMENT_W, minWidth: COMMENT_W }}>
                Approver Comments
              </th>
            </tr>
          </thead>
          <tbody>
            {parentRequest ? renderEditableRow(parentRequest, false) : renderContextRow()}
            {block.children.map(c => renderEditableRow(c, true))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface EditableHierarchyRequestTableProps {
  groups: SubjectAreaGroup[];
  subjectAreas: SubjectArea[];
  drafts: DraftMap;
  onFieldChange: (requestId: string, key: string, value: unknown) => void;
  comments: Record<string, Comment[]>;
  /** Per-request set of currently-invalid (empty required) field keys. Pass {} to suppress the
   * red styling entirely (e.g. before the board member's first resubmit attempt). */
  invalidFields: Record<string, Set<string>>;
}

export function EditableHierarchyRequestTable({
  groups, subjectAreas, drafts, onFieldChange, comments, invalidFields,
}: EditableHierarchyRequestTableProps) {
  const allBlocks = groups.flatMap(g => g.blocks);

  return (
    <div className="flex flex-col gap-4">
      {allBlocks.map(block => (
        <EditableEntityGroupTable
          key={block.kind === 'entityRequest' ? block.request.id : `ee-${block.entityName}`}
          block={block}
          subjectAreas={subjectAreas}
          drafts={drafts}
          onFieldChange={onFieldChange}
          comments={comments}
          invalidFields={invalidFields}
        />
      ))}
    </div>
  );
}
