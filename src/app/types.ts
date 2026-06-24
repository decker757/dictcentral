// Data catalog type definitions
//
// Entities and Data Items are populated from the SAME import template, so
// they share one flat attribute schema (RecordAttributes) — every column is
// available to both record types, values just differ (and some columns are
// naturally blank for a given record type, e.g. an Entity's "Nullable").
// Only `id` and the parent/child relationship (`dataItems`) are structural,
// not template columns, so they live outside RecordAttributes.

export interface RecordAttributes {
  name: string;
  technicalName: string;
  description?: string;
  owner?: string;
  steward?: string;
  sourceSystem?: string;
  recordCount?: string;
  refreshFrequency?: string;
  classification: 'Public' | 'Internal' | 'Confidential' | 'Restricted';
  status?: 'Active' | 'Deprecated' | 'Archived';
  tags?: string[];
  qualityScore?: number;
  retentionPolicy?: string;
  lastUpdated?: string;
  lineageSource?: string;
  schemaVersion?: string;
  slaTarget?: string;
  businessGlossaryRef?: string;
  dataType?: string;
  length?: string;
  nullable?: boolean;
  keyIndicator?: 'PK' | 'FK' | 'UK' | null;
  sensitivityLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
  format?: string;
  defaultValue?: string;
  validationRule?: string;
  allowedValues?: string[];
  sourceColumn?: string;
  transformationLogic?: string;
}

export interface DataItem extends RecordAttributes {
  id: string;
}

export interface Entity extends RecordAttributes {
  id: string;
  dataItems: DataItem[];
}

export interface SubjectArea {
  id: string;
  name: string;
  description: string;
  owner: string;
  status: 'Active' | 'In Development' | 'Deprecated';
  entityCount: number;
  dataItemCount: number;
  entities: Entity[];
}

// ── Approval workflow ──────────────────────────────────────────

export type RequestRecordType = 'entity' | 'dataitem';
export type RequestType = 'create' | 'edit';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * One entry in a review comment thread. Threads accumulate across multiple
 * reject → revise → resubmit rounds, so an approver (and the board member,
 * read-only) can see the full back-and-forth, not just the latest note.
 * Used both for the per-request generic thread and per-entity/data-item
 * threads — see useCatalog's itemComments/batchComments.
 */
export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string; // ISO date-time string
}

export interface ChangeRequest {
  id: string;
  /**
   * Groups every entity/data-item change submitted together into ONE
   * reviewable request. Approvers act on the whole batchId at once (accept
   * or reject everything in it) — they can no longer approve/reject
   * individual entities or data items within it. See lib/submissions.ts.
   */
  batchId: string;
  type: RequestType;
  recordType: RequestRecordType;
  status: RequestStatus;
  submittedAt: string;   // ISO date-time string
  submittedBy: string;
  rejectionReason?: string;
  /** Who actioned this request (approved/rejected it), and when — set together with status. */
  reviewedBy?: string;
  reviewedAt?: string;

  // Hierarchy context
  subjectAreaId: string;
  subjectAreaName: string;
  parentEntityId?: string;  // for dataitem requests
  parentEntityName?: string;

  // The proposed (new) state — full object
  proposedData: Entity | DataItem;

  // For edit requests: the original state before the change
  originalData?: Entity | DataItem;

  // Keys of fields that differ between originalData and proposedData
  changedFields?: string[];
}
