// The catalog + change-request "engine": owns the in-memory state and every
// mutation (board/DGO submissions, DGO/HOD review actions). Extracted from
// App.tsx so the App component is just routing + composition (SRP).
//
// Approval granularity: reviewers act on a whole REQUEST (= every entity and
// data-item change sharing one `batchId`) at once. There is no per-entity /
// per-data-item approve or reject — see lib/submissions.ts for how requests
// are grouped, and ApproverPortal/HODPortal/SubmissionDetailView for the
// review UI.
//
// Two pipelines:
// - Two-stage (board-originated, the default): a DGO reviews first
//   (approveDgo) — this does NOT commit anything, it just advances `stage`
//   from 'dgo' to 'hod'. Only an HOD's approval (approveHod) commits.
// - One-stage (DGO-originated — a DGO can submit their own create/edit/
//   delete requests too): the submitting DGO names a specific peer DGO
//   (`staffApprover`, never themselves) who alone can approve it, and that
//   approval (still via approveDgo — see its branch on `pipeline`) commits
//   straight to the catalog. No HOD involved at all.
// A rejection (reject) can happen at any stage of either pipeline and is
// always terminal until the board member (or DGO) revises and resubmits,
// which restarts the pipeline from the top.
//
// Self-approval prevention: both board members AND DGOs can submit
// create/edit/delete requests (see submitCreate*/submitEdit*/submitDelete*,
// which all take an explicit `submittedBy`). A DGO must never review their
// own request — that filtering happens in ApproverPortal (the DGO's queue
// excludes anything they themselves submitted while it's still pending),
// not here; this hook just stores what it's told.
//
// Reroute to another HOD: a board member can flag any of their PENDING
// requests (at submission time, or later from My Requests) with a specific
// HOD to take over — see `rerouteHod` on the request, and rerouteToHod()
// below. It never changes which stage/status the request is at; it's
// informational (this demo only ever runs one HOD session), but the
// required rationale comment IS always appended to the request's generic
// comment thread, so every reviewer sees it.

import { useState, Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import { SubjectArea, Entity, DataItem, ChangeRequest, Comment, RecordAttributes } from '../types';
import { mockSubjectAreas } from '../data/mockData';
import { initialRequests } from '../data/initialRequests';
import { computeChangedFields, findEntityById, findDataItemById } from '../lib/catalog';

let reqCounter = 100;
const nextReqId = () => `req-${++reqCounter}`;
let batchCounter = 100;
const nextBatchId = () => `batch-${++batchCounter}`;
let commentCounter = 100;
const nextCommentId = () => `cmt-${++commentCounter}`;

/** Optional extras a create/edit/delete submission can carry. `staffApprover` switches the
 * request onto the one-stage DGO pipeline (see file header); `rerouteHod` + `rerouteComment`
 * pre-assign a reroute right at submission time, same as calling rerouteToHod() later would
 * (and the same required-comment rule applies — see CreateModal/EditModal/DeleteConfirmDialog). */
export interface RequestOpts {
  staffApprover?: string;
  rerouteHod?: string;
  rerouteComment?: string;
}

export function useCatalog() {
  const [subjectAreas, setSubjectAreas] = useState<SubjectArea[]>(mockSubjectAreas);
  const [requests, setRequests] = useState<ChangeRequest[]>(initialRequests);

  // Review comment THREADS — accumulate across reject → revise → resubmit
  // rounds rather than overwrite, so both sides (and both review stages) can
  // see the full history. Never affect the catalog data itself. Per
  // data-item/entity thread, keyed by the individual ChangeRequest id:
  const [itemComments, setItemComments] = useState<Record<string, Comment[]>>({});
  // One generic thread for the whole request, keyed by batchId. Both DGO and
  // HOD post into the SAME thread, so an HOD automatically sees whatever a
  // DGO noted while reviewing — no separate "DGO comments" store needed.
  // Reroute rationale (required) also lands here — see rerouteToHod.
  const [batchComments, setBatchComments] = useState<Record<string, Comment[]>>({});

  const appendComment = (
    setter: Dispatch<SetStateAction<Record<string, Comment[]>>>,
    key: string,
    text: string,
    author: string,
  ) => {
    if (!text.trim()) return;
    const entry: Comment = { id: nextCommentId(), author, text: text.trim(), timestamp: new Date().toISOString() };
    setter(prev => ({ ...prev, [key]: [...(prev[key] ?? []), entry] }));
  };

  const addItemComment = (requestId: string, text: string, author: string) => appendComment(setItemComments, requestId, text, author);
  const addBatchComment = (batchId: string, text: string, author: string) => appendComment(setBatchComments, batchId, text, author);

  // ── Committed data mutations (applied on HOD/peer-DGO approval) ──
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

  const commitRemoveEntity = (entityId: string) =>
    setSubjectAreas(prev => prev.map(sa => {
      const had = sa.entities.some(e => e.id === entityId);
      return {
        ...sa,
        entities: sa.entities.filter(e => e.id !== entityId),
        entityCount: had ? Math.max(0, sa.entityCount - 1) : sa.entityCount,
      };
    }));

  const commitRemoveDataItem = (dataItemId: string) =>
    setSubjectAreas(prev => prev.map(sa => ({
      ...sa,
      entities: sa.entities.map(e => ({
        ...e,
        dataItems: e.dataItems.filter(di => di.id !== dataItemId),
      })),
    })));

  // ── Submissions (queue a request, never write directly) ─────────
  // Both board members AND DGOs can submit create/edit/delete requests — the
  // caller (BoardPortal / ApproverPortal) passes WHO via `submittedBy`, plus
  // optional `opts` (RequestOpts) for the one-stage DGO pipeline / reroute.
  // Every call here is its own one-item request/batch (one entity or one
  // data item submitted on its own); the request always starts at the DGO
  // stage (even one-stage ones — they just never leave it, see approveDgo).
  const queueRequest = (
    req: Omit<ChangeRequest, 'id' | 'batchId' | 'status' | 'submittedAt' | 'stage'>,
    opts?: RequestOpts,
  ) => {
    const batchId = nextBatchId();
    setRequests(prev => [...prev, {
      ...req,
      id: nextReqId(),
      batchId,
      status: 'pending',
      stage: 'dgo',
      submittedAt: new Date().toISOString(),
    }]);
    // The reroute rationale is compulsory whenever a reroute target is set (enforced in the
    // UI before this is ever called) and always lands in the generic thread, so every
    // reviewer sees WHY without a separate display surface.
    if (opts?.rerouteHod && opts?.rerouteComment) {
      appendComment(setBatchComments, batchId, `Rerouted to ${opts.rerouteHod}: ${opts.rerouteComment}`, req.submittedBy);
    }
  };

  const submitCreateEntity = (subjectAreaId: string, entity: Entity, submittedBy: string, opts?: RequestOpts) => {
    const sa = subjectAreas.find(s => s.id === subjectAreaId);
    if (!sa) return;
    queueRequest({
      type: 'create', recordType: 'entity', submittedBy,
      subjectAreaId, subjectAreaName: sa.name,
      proposedData: entity,
      pipeline: opts?.staffApprover ? 'one-stage' : undefined,
      staffApprover: opts?.staffApprover,
      rerouteHod: opts?.rerouteHod,
    }, opts);
    toast.success(opts?.staffApprover ? `Create request submitted to ${opts.staffApprover} for approval` : 'Create request submitted for DGO review');
  };

  const submitCreateDataItem = (entityId: string, dataItem: DataItem, submittedBy: string, opts?: RequestOpts) => {
    const found = findEntityById(subjectAreas, entityId);
    if (!found) return;
    queueRequest({
      type: 'create', recordType: 'dataitem', submittedBy,
      subjectAreaId: found.subjectArea.id, subjectAreaName: found.subjectArea.name,
      parentEntityId: entityId, parentEntityName: found.entity.name,
      proposedData: dataItem,
      pipeline: opts?.staffApprover ? 'one-stage' : undefined,
      staffApprover: opts?.staffApprover,
      rerouteHod: opts?.rerouteHod,
    }, opts);
    toast.success(opts?.staffApprover ? `Create request submitted to ${opts.staffApprover} for approval` : 'Create request submitted for DGO review');
  };

  const submitEditEntity = (entityId: string, updates: Partial<Entity>, submittedBy: string, opts?: RequestOpts) => {
    const found = findEntityById(subjectAreas, entityId);
    if (!found) return;
    const original = found.entity;
    const proposed = { ...original, ...updates };
    const changedFields = computeChangedFields(
      original as unknown as Record<string, unknown>,
      proposed as unknown as Record<string, unknown>,
    );
    queueRequest({
      type: 'edit', recordType: 'entity', submittedBy,
      subjectAreaId: found.subjectArea.id, subjectAreaName: found.subjectArea.name,
      originalData: { ...original, dataItems: [] } as Entity,
      proposedData: { ...proposed, dataItems: [] } as Entity,
      changedFields,
      pipeline: opts?.staffApprover ? 'one-stage' : undefined,
      staffApprover: opts?.staffApprover,
      rerouteHod: opts?.rerouteHod,
    }, opts);
    toast.success(opts?.staffApprover ? `Edit request submitted to ${opts.staffApprover} for approval` : 'Edit request submitted for DGO review');
  };

  const submitEditDataItem = (dataItemId: string, updates: Partial<DataItem>, submittedBy: string, opts?: RequestOpts) => {
    const found = findDataItemById(subjectAreas, dataItemId);
    if (!found) return;
    const original = found.dataItem;
    const proposed = { ...original, ...updates };
    const changedFields = computeChangedFields(
      original as unknown as Record<string, unknown>,
      proposed as unknown as Record<string, unknown>,
    );
    queueRequest({
      type: 'edit', recordType: 'dataitem', submittedBy,
      subjectAreaId: found.subjectArea.id, subjectAreaName: found.subjectArea.name,
      parentEntityId: found.entity.id, parentEntityName: found.entity.name,
      originalData: original,
      proposedData: proposed,
      changedFields,
      pipeline: opts?.staffApprover ? 'one-stage' : undefined,
      staffApprover: opts?.staffApprover,
      rerouteHod: opts?.rerouteHod,
    }, opts);
    toast.success(opts?.staffApprover ? `Edit request submitted to ${opts.staffApprover} for approval` : 'Edit request submitted for DGO review');
  };

  /** Request to delete an existing entity (and, implicitly, its data items). proposedData /
   * originalData both hold the current full snapshot — there's no "new" value, just a record
   * marked for removal; the diff/table views already render this fine (empty changedFields
   * means nothing gets highlighted, the row just shows the current data as-is). */
  const submitDeleteEntity = (entityId: string, submittedBy: string, opts?: RequestOpts) => {
    const found = findEntityById(subjectAreas, entityId);
    if (!found) return;
    const snapshot = { ...found.entity };
    queueRequest({
      type: 'delete', recordType: 'entity', submittedBy,
      subjectAreaId: found.subjectArea.id, subjectAreaName: found.subjectArea.name,
      originalData: snapshot,
      proposedData: snapshot,
      changedFields: [],
      pipeline: opts?.staffApprover ? 'one-stage' : undefined,
      staffApprover: opts?.staffApprover,
      rerouteHod: opts?.rerouteHod,
    }, opts);
    toast.success(opts?.staffApprover ? `Delete request submitted to ${opts.staffApprover} for approval` : 'Delete request submitted for DGO review');
  };

  const submitDeleteDataItem = (dataItemId: string, submittedBy: string, opts?: RequestOpts) => {
    const found = findDataItemById(subjectAreas, dataItemId);
    if (!found) return;
    const snapshot = { ...found.dataItem };
    queueRequest({
      type: 'delete', recordType: 'dataitem', submittedBy,
      subjectAreaId: found.subjectArea.id, subjectAreaName: found.subjectArea.name,
      parentEntityId: found.entity.id, parentEntityName: found.entity.name,
      originalData: snapshot,
      proposedData: snapshot,
      changedFields: [],
      pipeline: opts?.staffApprover ? 'one-stage' : undefined,
      staffApprover: opts?.staffApprover,
      rerouteHod: opts?.rerouteHod,
    }, opts);
    toast.success(opts?.staffApprover ? `Delete request submitted to ${opts.staffApprover} for approval` : 'Delete request submitted for DGO review');
  };

  // ── Review actions — whole request (batch) at a time ────────────

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
    } else if (req.type === 'delete' && req.recordType === 'entity') {
      commitRemoveEntity((req.proposedData as Entity).id);
    } else if (req.type === 'delete' && req.recordType === 'dataitem') {
      commitRemoveDataItem((req.proposedData as DataItem).id);
    }
  };

  /** Commits every item in a resolved batch to the catalog, entities before their data items
   * (so a new entity exists before its new columns try to attach), deletes last. Shared by
   * the HOD's approveHod and a peer DGO's one-stage approveDgo. */
  const commitBatch = (items: ChangeRequest[]) => {
    const ordered = [...items].sort((a, b) => {
      const rank = (r: ChangeRequest) => r.type === 'delete' ? 2 : r.recordType === 'entity' ? 0 : 1;
      return rank(a) - rank(b);
    });
    ordered.forEach(commitOne);
  };

  /**
   * A DGO approves a request. Branches on the request's pipeline:
   * - One-stage (DGO-originated, peer-approved): commits straight to the catalog — this IS
   *   the final approval, there's no HOD stage to forward to.
   * - Two-stage (board-originated, the default): does NOT touch the catalog — just advances
   *   `stage` to 'hod' and records who/when. Only an HOD's approval (approveHod) commits.
   * Only pending items currently at the 'dgo' stage are affected either way.
   */
  const approveDgo = (batchId: string, dgoName: string) => {
    const items = requests.filter(r => r.batchId === batchId && r.status === 'pending' && r.stage === 'dgo');
    if (items.length === 0) return;
    const ids = items.map(i => i.id);

    if (items[0].pipeline === 'one-stage') {
      commitBatch(items);
      const reviewedAt = new Date().toISOString();
      setRequests(prev => prev.map(r =>
        ids.includes(r.id) ? { ...r, status: 'approved' as const, reviewedBy: dgoName, reviewedAt, dgoReviewedBy: dgoName, dgoReviewedAt: reviewedAt } : r
      ));
      toast.success(`Approved and applied to the catalog (${items.length} item${items.length !== 1 ? 's' : ''})`);
      return;
    }

    const dgoReviewedAt = new Date().toISOString();
    setRequests(prev => prev.map(r =>
      ids.includes(r.id) ? { ...r, stage: 'hod' as const, dgoReviewedBy: dgoName, dgoReviewedAt } : r
    ));
    toast.success(`Approved — forwarded to HOD for final review (${items.length} item${items.length !== 1 ? 's' : ''})`);
  };

  /** An HOD approves a request: this is what actually commits everything in the batch to the
   * catalog, for the two-stage (board-originated) pipeline. Only pending items currently at
   * the 'hod' stage are affected — one-stage requests never reach this stage at all. */
  const approveHod = (batchId: string, hodName: string) => {
    const items = requests.filter(r => r.batchId === batchId && r.status === 'pending' && r.stage === 'hod');
    if (items.length === 0) return;

    commitBatch(items);

    const ids = items.map(i => i.id);
    const reviewedAt = new Date().toISOString();
    setRequests(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: 'approved' as const, reviewedBy: hodName, reviewedAt } : r));

    toast.success(`Approved request (${items.length} item${items.length !== 1 ? 's' : ''})`);
  };

  /** Reject every pending item in this request (batchId) — works at EITHER review stage of
   * either pipeline. The reason is stored on the request itself (rejectionReason, shown as
   * its own banner in the UI) and is NOT appended to the generic comment thread, so that
   * thread only ever shows comments someone explicitly typed into it. */
  const reject = (batchId: string, reason: string, reviewerName: string) => {
    const ids = requests.filter(r => r.batchId === batchId && r.status === 'pending').map(r => r.id);
    if (ids.length === 0) return;

    const reviewedAt = new Date().toISOString();
    setRequests(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: 'rejected' as const, rejectionReason: reason, reviewedBy: reviewerName, reviewedAt } : r));

    toast.error(`Rejected request (${ids.length} item${ids.length !== 1 ? 's' : ''})`);
  };

  /**
   * Board member (or DGO) revises a REJECTED request and resubmits it — same batchId/request
   * ids (so the itemComments/batchComments threads carry straight over), just with updated
   * proposedData, status flipped back to 'pending', and the WHOLE pipeline restarted from the
   * DGO stage (any prior DGO approval is cleared — a revised request needs a fresh DGO/peer-DGO
   * look, not a free pass straight through). `pipeline`/`staffApprover`/`rerouteHod` are left
   * untouched — those don't need re-deciding just because the field VALUES changed. Validation
   * (are the required fields filled in) happens in the UI before this is ever called — this
   * function just commits whatever draft values it's given.
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
        stage: 'dgo' as const,
        rejectionReason: undefined,
        dgoReviewedBy: undefined,
        dgoReviewedAt: undefined,
        reviewedBy: undefined,
        reviewedAt: undefined,
        submittedAt: resubmittedAt,
      };
    }));

    toast.success('Request updated and resubmitted for review');
  };

  /**
   * Board member (or DGO) withdraws a PENDING request before it's been fully resolved. Unlike
   * approve/reject, there is no "withdrawn" status to track on the request — every item in
   * the batch is removed from `requests` outright, so it disappears from every queue at once.
   * Only pending items are eligible, regardless of which stage currently owns it.
   */
  const withdraw = (batchId: string) => {
    const items = requests.filter(r => r.batchId === batchId && r.status === 'pending');
    if (items.length === 0) return;

    setRequests(prev => prev.filter(r => r.batchId !== batchId));

    toast.success('Request withdrawn');
  };

  /**
   * Board member reroutes one of their PENDING requests to a specific HOD — available at any
   * stage (pending DGO review, or pending HOD review; see SubmissionDetailView's `onReroute`).
   * Sets `rerouteHod` on every item in the batch (purely informational in this single-HOD-
   * session demo — see file header) and ALWAYS appends the required rationale to the
   * request's generic comment thread, so it's visible the moment any reviewer opens it.
   */
  const rerouteToHod = (batchId: string, hodName: string, comment: string, author: string) => {
    const ids = requests.filter(r => r.batchId === batchId && r.status === 'pending').map(r => r.id);
    if (ids.length === 0) return;

    setRequests(prev => prev.map(r => ids.includes(r.id) ? { ...r, rerouteHod: hodName } : r));
    appendComment(setBatchComments, batchId, `Rerouted to ${hodName}: ${comment}`, author);

    toast.success(`Request rerouted to ${hodName}`);
  };

  return {
    subjectAreas,
    requests,
    submitCreateEntity,
    submitCreateDataItem,
    submitEditEntity,
    submitEditDataItem,
    submitDeleteEntity,
    submitDeleteDataItem,
    approveDgo,
    approveHod,
    reject,
    reviseAndResubmit,
    withdraw,
    rerouteToHod,
    itemComments,
    addItemComment,
    batchComments,
    addBatchComment,
  };
}
