// Data catalog type definitions

export interface DataItem {
  id: string;
  name: string;
  technicalName: string;
  dataType: string;
  length?: string;
  nullable: boolean;
  keyIndicator: 'PK' | 'FK' | 'UK' | null;
  classification: 'Public' | 'Internal' | 'Confidential' | 'Restricted';
  sensitivityLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  businessDefinition: string;
  format?: string;
  allowedValues?: string[];
  validationRule?: string;
  defaultValue?: string;
  steward?: string;
  lastModified?: string;
  sourceColumn?: string;
  transformationLogic?: string;
}

export interface Entity {
  id: string;
  name: string;
  physicalTableName: string;
  description?: string;
  owner: string;
  steward?: string;
  sourceSystem: string;
  recordCount: string;
  refreshFrequency: string;
  classification: 'Public' | 'Internal' | 'Confidential' | 'Restricted';
  status: 'Active' | 'Deprecated' | 'Archived';
  tags: string[];
  dataItems: DataItem[];
  qualityScore?: number;
  retentionPolicy?: string;
  lastUpdated?: string;
  lineageSource?: string;
  schemaVersion?: string;
  slaTarget?: string;
  businessGlossaryRef?: string;
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

export interface ChangeRequest {
  id: string;
  type: RequestType;
  recordType: RequestRecordType;
  status: RequestStatus;
  submittedAt: string;   // ISO date-time string
  submittedBy: string;
  rejectionReason?: string;

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
