// Groups individual ChangeRequests into "submissions" — the unit an approver
// actually reviews and acts on. A submission is every entity/data-item
// request sharing one `batchId` (i.e. submitted together as one request),
// and approvers accept or reject the WHOLE submission at once — never an
// individual entity or data item inside it.

import { ChangeRequest, RequestStatus, RequestType } from '../types';

export interface Submission {
  batchId: string;
  submittedBy: string;
  /** Earliest submittedAt among the batch's items — when the request was created. */
  submittedAt: string;
  /** Derived: 'pending' if anything in the batch is still pending, else the shared resolved status. */
  status: RequestStatus;
  /** Distinct operations present in this request (Create / Edit / Delete), in that display order. */
  operations: RequestType[];
  items: ChangeRequest[];
  entityCount: number;
  dataItemCount: number;
  subjectAreaNames: string[];
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

const OPERATION_ORDER: RequestType[] = ['create', 'edit'];

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
    const reviewedBy = items.find(i => i.reviewedBy)?.reviewedBy;
    const reviewedAt = items.find(i => i.reviewedAt)?.reviewedAt;
    return {
      batchId, submittedBy, submittedAt,
      status: deriveStatus(items),
      operations: deriveOperations(items),
      items, entityCount, dataItemCount, subjectAreaNames, rejectionReason, reviewedBy, reviewedAt,
    };
  });

  return submissions.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function findSubmission(requests: ChangeRequest[], batchId: string): Submission | undefined {
  return groupRequestsByBatch(requests.filter(r => r.batchId === batchId))[0];
}
