// The catalog + change-request "engine": owns the in-memory state and every
// mutation (board submissions, approver approve/reject, and undo). Extracted
// from App.tsx so the App component is just routing + composition (SRP).
//
// Approval granularity: approvers act on a whole REQUEST (= every entity and
// data-item change sharing one `batchId`) at once. There is no per-entity /
// per-data-item approve or reject — see lib/submissions.ts for how requests
// are grouped, and ApproverPortal/SubmissionDetailView for the review UI.

import { useState, Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import { SubjectArea, Entity, DataItem, ChangeRequest, Comment, RecordAttributes } from '../types';
import { mockSubjectAreas } from '../data/mockData';
import { initialRequests } from '../data/initialRequests';
import { computeChangedFields, findEntityById, findDataItemById } from '../lib/catalog';
import { CURRENT_BOARD_MEMBER, CURRENT_APPROVER } from '../lib/constants';

let reqCounter = 100;
const nextReqId = () => `req-${++reqCounter}`;
let batchCounter = 100;
const nextBatchId = () => `batch-${++batchCounter}`;
let commentCounter = 100;
const nextCommentId = () => `cmt-${++commentCounter}`;

export function useCatalog() {
  const [subjectAreas, setSubjectAreas] = useState<SubjectArea[]>(mockSubjectAreas);
  const [requests, setRequests] = useState<ChangeRequest[]>(initialRequests);

  // Review comment THREADS — accumulate across reject → revise → resubmit
  // rounds rather than overwrite, so both sides can see the full history.
  // Never affect the catalog data itself. Per data-item/entity thread, keyed
  // by the individual ChangeRequest id:
  const [itemComments, setItemComments] = useState<Record<string, Comment[]>>({});
  // One generic thread for the whole request, keyed by batchId:
  const [batchComments, setBatchComments] = useState<Record<string, Comment[]>>({});

  const appendComment = (
    setter: Dispatch<SetStateAction<Record<string, Comment[]>>>,
    key: string,
    text: string,
    author: string = CURRENT_APPROVER,
  ) => {
    if (!text.trim()) return;
    const entry: Comment = { id: nextCommentId(), author, text: text.trim(), timestamp: new Date().toISOString() };
    setter(prev => ({ ...prev, [key]: [...(prev[key] ?? []), entry] }));
  };

  const addItemComment = (requestId: string, text: string) => appendComment(setItemComments, requestId, text);
  const addBatchComment = (batchId: string, text: string) => appendComment(setBatchComments, batchId, text);

  // ── Committed data mutations (applied on approval) ──────────────
  const commitAddEntity = (subjectAreaId: string, entity: Entity) =>
    setSubjectAreas(prev => prev.map(sa =>
      sa.id === subjectAreaId
        ? { ...sa, entities: [...sa.entities, entity], entityCount: sa.entityCount + 1 }
        : sa
    ));

  const commitAddDataItem = (entityId: string, dataItem: DataItem) =>
    setSubjectAreas(prev => prev.map(sa => ({
      ...sa,
      entities: sa.entities.map(e =>
        e.id === entityId ? { ...e, dataItems: [...e.dataItems, dataItem] } : e
      ),
    })));

  const commitUpdateEntity = (entityId: string, updates: Partial<Entity>) =>
    setSubjectAreas(prev => prev.map(sa => ({
      ...sa,
      entities: sa.entities.map(e => e.id === entityId ? { ...e, ...updates } : e),
    })));

  const commitUpdateDataItem = (dataItemId: string, updates: Partial<DataItem>) =>
    setSubjectAreas(prev => prev.map(sa => ({
      ...sa,
      entities: sa.entities.map(e => ({
        ...e,
        dataItems: e.dataItems.map(di => di.id === dataItemId ? { ...di, ...updates } : di),
      })),
    })));

  // ── Board member submissions (queue a request, never write directly) ──
  // Each call here is its own one-item request/batch (one entity or one data
  // item submitted on its own).
  const queueRequest = (req: Omit<ChangeRequest, 'id' | 'batchId' | 'status' | 'submittedAt' | 'submittedBy'>) =>
    setRequests(prev => [...prev, {
      ...req,
      id: nextReqId(),
      batchId: nextBatchId(),
      status: 'pending',
      submittedAt: new Date().toISOString(),
      submittedBy: CURRENT_BOARD_MEMBER,
    }]);

  const submitCreateEntity = (subjectAreaId: string, entity: Entity) => {
    const sa = subjectAreas.find(s => s.id === subjectAreaId);
    if (!sa) return;
    queueRequest({
      type: 'create', recordType: 'entity',
      subjectAreaId, subjectAreaName: sa.name,
      proposedData: entity,
    });
    toast.success('Create request submitted for approval');
  };

  const submitCreateDataItem = (entityId: string, dataItem: DataItem) => {
    const found = findEntityById(subjectAreas, entityId);
    if (!found) return;
    queueRequest({
      type: 'create', recordType: 'dataitem',
      subjectAreaId: found.subjectArea.id, subjectAreaName: found.subjectArea.name,
      parentEntityId: entityId, parentEntityName: found.entity.name,
      proposedData: dataItem,
    });
    toast.success('Create request submitted for approval');
  };

  const submitEditEntity = (entityId: string, updates: Partial<Entity>) => {
    const found = findEntityById(subjectAreas, entityId);
    if (!found) return;
    const original = found.entity;
    const proposed = { ...original, ...updates };
    const changedFields = computeChangedFields(
      original as unknown as Record<string, unknown>,
      proposed as unknown as Record<string, unknown>,
    );
    queueRequest({
      type: 'edit', recordType: 'entity',
      subjectAreaId: found.subjectArea.id, subjectAreaName: found.subjectArea.name,
      originalData: { ...original, dataItems: [] } as Entity,
      proposedData: { ...proposed, dataItems: [] } as Entity,
      changedFields,
    });
    toast.success('Edit request submitted for approval');
  };

  const submitEditDataItem = (dataItemId: string, updates: Partial<DataItem>) => {
    const found = findDataItemById(subjectAreas, dataItemId);
    if (!found) return;
    const original = found.dataItem;
    const proposed = { ...original, ...updates };
    const changedFields = computeChangedFields(
      original as unknown as Record<string, unknown>,
      proposed as unknown as Record<string, unknown>,
    );
    queueRequest({
      type: 'edit', recordType: 'dataitem',
      subjectAreaId: found.subjectArea.id, subjectAreaName: found.subjectArea.name,
      parentEntityId: found.entity.id, parentEntityName: found.entity.name,
      originalData: original,
      proposedData: proposed,
      changedFields,
    });
    toast.success('Edit request submitted for approval');
  };

  // ── Approver actions — whole request (batch) at a time ──────────

  const commitOne = (req: ChangeRequest) => {
    if (req.type === 'create' && req.recordType === 'entity') {
      commitAddEntity(req.subjectAreaId, req.proposedData as Entity);
    } else if (req.type === 'create' && req.recordType === 'dataitem') {
      commitAddDataItem(req.parentEntityId!, req.proposedData as DataItem);
    } else if (req.type === 'edit' && req.recordType === 'entity') {
      // Preserve existing dataItems — proposedData carries an empty dataItems array.
      const { dataItems, id, ...rest } = req.proposedData as Entity;
      void dataItems;
      commitUpdateEntity(id, rest);
    } else if (req.type === 'edit' && req.recordType === 'dataitem') {
      const proposed = req.proposedData as DataItem;
      commitUpdateDataItem(proposed.id, proposed);
    }
  };

  const uncommitOne = (req: ChangeRequest) => {
    if (req.type === 'create' && req.recordType === 'entity') {
      setSubjectAreas(prev => prev.map(sa =>
        sa.id === req.subjectAreaId
          ? { ...sa, entities: sa.entities.filter(e => e.id !== req.proposedData.id), entityCount: Math.max(0, sa.entityCount - 1) }
          : sa
      ));
    } else if (req.type === 'create' && req.recordType === 'dataitem') {
      setSubjectAreas(prev => prev.map(sa => ({
        ...sa,
        entities: sa.entities.map(e =>
          e.id === req.parentEntityId
            ? { ...e, dataItems: e.dataItems.filter(di => di.id !== req.proposedData.id) }
            : e
        ),
      })));
    } else if (req.type === 'edit' && req.originalData) {
      if (req.recordType === 'entity') {
        const { dataItems, id, ...rest } = req.originalData as Entity;
        void dataItems;
        commitUpdateEntity(id, rest);
      } else {
        const { id, ...rest } = req.originalData as DataItem;
        commitUpdateDataItem(id, rest);
      }
    }
  };

  const undoApproveBatch = (items: ChangeRequest[]) => {
    items.forEach(uncommitOne);
    const ids = items.map(i => i.id);
    setRequests(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: 'pending' as const, rejectionReason: undefined, reviewedBy: undefined, reviewedAt: undefined } : r));
  };

  /** Approve every pending item in this request (batchId) — there is no partial approval. */
  const approve = (batchId: string) => {
    const items = requests.filter(r => r.batchId === batchId && r.status === 'pending');
    if (items.length === 0) return;

    // Entities before their data items, so a new entity exists before its
    // new columns try to attach to it.
    const ordered = [...items].sort((a, b) => {
      if (a.recordType === 'entity' && b.recordType !== 'entity') return -1;
      if (b.recordType === 'entity' && a.recordType !== 'entity') return 1;
      return 0;
    });
    ordered.forEach(commitOne);

    const ids = items.map(i => i.id);
    const reviewedAt = new Date().toISOString();
    setRequests(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: 'approved' as const, reviewedBy: CURRENT_APPROVER, reviewedAt } : r));

    toast.success(`Approved request (${items.length} item${items.length !== 1 ? 's' : ''})`, {
      action: { label: 'Undo', onClick: () => undoApproveBatch(items) },
    });
  };

  const undoRejectBatch = (ids: string[]) =>
    setRequests(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: 'pending' as const, rejectionReason: undefined, reviewedBy: undefined, reviewedAt: undefined } : r));

  /** Reject every pending item in this request (batchId) — there is no partial rejection. The
   * reason is stored on the request itself (rejectionReason, shown as its own banner in the UI)
   * and is NOT appended to the generic comment thread — that thread only ever shows comments
   * someone explicitly typed into it (across every reject → revise → resubmit round), not a
   * duplicate of the rejection-reason banner. */
  const reject = (batchId: string, reason: string) => {
    const ids = requests.filter(r => r.batchId === batchId && r.status === 'pending').map(r => r.id);
    if (ids.length === 0) return;

    const reviewedAt = new Date().toISOString();
    setRequests(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: 'rejected' as const, rejectionReason: reason, reviewedBy: CURRENT_APPROVER, reviewedAt } : r));

    toast.error(`Rejected request (${ids.length} item${ids.length !== 1 ? 's' : ''})`, {
      action: { label: 'Undo', onClick: () => undoRejectBatch(ids) },
    });
  };

  /**
   * Board member revises a REJECTED request and resubmits it — same batchId/request ids (so the
   * itemComments/batchComments threads carry straight over, per the reject → revise → resubmit
   * model), just with updated proposedData and status flipped back to 'pending'. Validation (are
   * the required fields filled in) happens in the UI before this is ever called — this function
   * just commits whatever draft values it's given.
   */
  const reviseAndResubmit = (batchId: string, drafts: Record<string, Partial<RecordAttributes>>) => {
    const items = requests.filter(r => r.batchId === batchId);
    if (items.length === 0) return;

    const resubmittedAt = new Date().toISOString();
    setRequests(prev => prev.map(r => {
      if (r.batchId !== batchId) return r;
      const draft = drafts[r.id];
      if (!draft) return r;
      const proposedData = { ...r.proposedData, ...draft } as Entity | DataItem;
      const changedFields = r.type === 'edit' && r.originalData
        ? computeChangedFields(
            r.originalData as unknown as Record<string, unknown>,
            proposedData as unknown as Record<string, unknown>,
          )
        : r.changedFields;
      return {
        ...r,
        proposedData,
        changedFields,
        status: 'pending' as const,
        rejectionReason: undefined,
        reviewedBy: undefined,
        reviewedAt: undefined,
        submittedAt: resubmittedAt,
      };
    }));

    toast.success('Request updated and resubmitted for approval');
  };

  return {
    subjectAreas,
    requests,
    submitCreateEntity,
    submitCreateDataItem,
    submitEditEntity,
    submitEditDataItem,
    approve,
    reject,
    reviseAndResubmit,
    itemComments,
    addItemComment,
    batchComments,
    addBatchComment,
  };
}
