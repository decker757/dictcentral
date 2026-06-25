// Groups individual ChangeRequests into "submissions" — the unit a reviewer
// actually reviews and acts on. A submission is every entity/data-item
// request sharing one `batchId` (i.e. submitted together as one request),
// and reviewers accept or reject the WHOLE submission at once — never an
// individual entity or data item inside it.

import { ChangeRequest, RequestStatus, RequestType, RequestStage } from '../types';

export interface Submission {
  batchId: string;
  submittedBy: string;
  /** Earliest submittedAt among the batch's items — when the request was created. */
  submittedAt: string;
  /** Derived: 'pending' if anything in the batch is still pending, else the shared resolved status. */
  status: RequestStatus;
  /** Which review stage currently owns this submission while it's pending — see RequestStage. */
  stage: RequestStage;
  /** Distinct operations present in this request (Create / Edit / Delete), in that display order. */
  operations: RequestType[];
  items: ChangeRequest[];
  entityCount: number;
  dataItemCount: number;
  subjectAreaNames: string[];
  rejectionReason?: string;
  /** See ChangeRequest — 'one-stage' means a DGO-originated request approved by a single
   * named peer DGO (`staffApprover`), with no HOD stage at all. */
  pipeline?: 'two-stage' | 'one-stage';
  /** One-stage pipeline only: the peer DGO who must approve this request. */
  staffApprover?: string;
  /** The board member's chosen reroute-to HOD, if any — see useCatalog.rerouteToHod. */
  rerouteHod?: string;
  /** The DGO who approved (forwarded) this submission, and when — set once a DGO has acted on it. */
  dgoReviewedBy?: string;
  dgoReviewedAt?: string;
  /** Whoever FINALLY resolved this submission (HOD/peer-DGO approval, or a rejection at either stage). */
  reviewedBy?: string;
  reviewedAt?: string;
}

const OPERATION_ORDER: RequestType[] = ['create', 'edit', 'delete'];

function deriveOperations(items: ChangeRequest[]): RequestType[] {
  return OPERATION_ORDER.filter(op => items.some(i => i.type === op));
}

function deriveStatus(items: ChangeRequest[]): RequestStatus {
  if (items.some(i => i.status === 'pending')) return 'pending';
  if (items.every(i => i.status === 'rejected')) return 'rejected';
  if (items.every(i => i.status === 'approved')) return 'approved';
  // Mixed resolved state shouldn't normally happen (the whole batch is acted
  // on together) — fall back to rejected as the more conservative read.
  return items.some(i => i.status === 'rejected') ? 'rejected' : 'approved';
}

/** Group requests by batchId into submissions, newest first. */
export function groupRequestsByBatch(requests: ChangeRequest[]): Submission[] {
  const order: string[] = [];
  const map = new Map<string, ChangeRequest[]>();
  for (const r of requests) {
    if (!map.has(r.batchId)) { map.set(r.batchId, []); order.push(r.batchId); }
    map.get(r.batchId)!.push(r);
  }

  const submissions = order.map((batchId): Submission => {
    const items = map.get(batchId)!;
    const sorted = [...items].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    const submittedAt = sorted[0].submittedAt;
    const submittedBy = sorted[0].submittedBy;
    const entityCount = items.filter(i => i.recordType === 'entity').length;
    const dataItemCount = items.filter(i => i.recordType === 'dataitem').length;
    const subjectAreaNames = Array.from(new Set(items.map(i => i.subjectAreaName)));
    const rejectionReason = items.find(i => i.rejectionReason)?.rejectionReason;
    const pipeline = items.find(i => i.pipeline)?.pipeline;
    const staffApprover = items.find(i => i.staffApprover)?.staffApprover;
    const rerouteHod = items.find(i => i.rerouteHod)?.rerouteHod;
    const dgoReviewedBy = items.find(i => i.dgoReviewedBy)?.dgoReviewedBy;
    const dgoReviewedAt = items.find(i => i.dgoReviewedAt)?.dgoReviewedAt;
    const reviewedBy = items.find(i => i.reviewedBy)?.reviewedBy;
    const reviewedAt = items.find(i => i.reviewedAt)?.reviewedAt;
    return {
      batchId, submittedBy, submittedAt,
      status: deriveStatus(items),
      stage: sorted[0].stage,
      operations: deriveOperations(items),
      items, entityCount, dataItemCount, subjectAreaNames, rejectionReason,
      pipeline, staffApprover, rerouteHod,
      dgoReviewedBy, dgoReviewedAt, reviewedBy, reviewedAt,
    };
  });

  return submissions.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
