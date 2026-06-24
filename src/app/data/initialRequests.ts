import { ChangeRequest, DataItem } from '../types';
import { mockSubjectAreas } from './mockData';

// Pull real data for realistic initial requests
const housing = mockSubjectAreas[0];
const propRecords = housing.entities[0];
const propId = propRecords.dataItems[0];       // Property ID
const propAddress = propRecords.dataItems[1];   // Property Address
const rentalAgreements = housing.entities[1];
const tenantName = rentalAgreements.dataItems[2]; // Tenant Name

const healthcare = mockSubjectAreas[2];
const patientDemo = healthcare.entities[0];
const clinicalEncounters = healthcare.entities[1]; // Clinical Encounters
const primaryPhone = patientDemo.dataItems[4];      // Primary Phone
const diagnosisCode = clinicalEncounters.dataItems[4]; // Diagnosis Code

// All seed requests start fresh at the DGO review stage — `stage: 'dgo'` is
// appended uniformly below rather than repeated on every literal.
const rawInitialRequests: Omit<ChangeRequest, 'stage'>[] = [
  // ── 1. EDIT REQUEST: data items under TWO DIFFERENT entities in Housing —
  // Property Address (Property Records) and Tenant Name (Rental Agreements).
  // Demonstrates a single request spanning multiple entity groups in the
  // hierarchy table, not just multiple rows under one parent.
  {
    id: 'req-001',
    batchId: 'batch-001',
    type: 'edit',
    recordType: 'dataitem',
    status: 'pending',
    submittedAt: '2026-06-11T07:45:00Z',
    submittedBy: 'Dr. James Park',
    subjectAreaId: housing.id,
    subjectAreaName: housing.name,
    parentEntityId: propRecords.id,
    parentEntityName: propRecords.name,
    originalData: { ...propAddress },
    proposedData: {
      ...propAddress,
      sensitivityLevel: 'High',
      validationRule: 'Must include street number, name, city, state, ZIP, and be verified via USPS address validation API',
    },
    changedFields: ['sensitivityLevel', 'validationRule'],
  },
  {
    id: 'req-002',
    batchId: 'batch-001',
    type: 'edit',
    recordType: 'dataitem',
    status: 'pending',
    submittedAt: '2026-06-11T07:46:00Z',
    submittedBy: 'Dr. James Park',
    subjectAreaId: housing.id,
    subjectAreaName: housing.name,
    parentEntityId: rentalAgreements.id,
    parentEntityName: rentalAgreements.name,
    originalData: { ...tenantName },
    proposedData: { ...tenantName, classification: 'Restricted', steward: 'Jordan Lee' },
    changedFields: ['classification', 'steward'],
  },

  // ── 2. EDIT REQUEST: data items under TWO DIFFERENT entities in Healthcare —
  // Primary Phone (Patient Demographics) and Diagnosis Code (Clinical Encounters).
  {
    id: 'req-003',
    batchId: 'batch-002',
    type: 'edit',
    recordType: 'dataitem',
    status: 'pending',
    submittedAt: '2026-06-11T09:02:00Z',
    submittedBy: 'Alex Kim',
    subjectAreaId: healthcare.id,
    subjectAreaName: healthcare.name,
    parentEntityId: patientDemo.id,
    parentEntityName: patientDemo.name,
    originalData: { ...primaryPhone },
    proposedData: {
      ...primaryPhone,
      sensitivityLevel: 'Critical',
      validationRule: 'Must be valid E.164 format when present; verified via carrier lookup',
    },
    changedFields: ['sensitivityLevel', 'validationRule'],
  },
  {
    id: 'req-003b',
    batchId: 'batch-002',
    type: 'edit',
    recordType: 'dataitem',
    status: 'pending',
    submittedAt: '2026-06-11T09:03:00Z',
    submittedBy: 'Alex Kim',
    subjectAreaId: healthcare.id,
    subjectAreaName: healthcare.name,
    parentEntityId: clinicalEncounters.id,
    parentEntityName: clinicalEncounters.name,
    originalData: { ...diagnosisCode },
    proposedData: {
      ...diagnosisCode,
      validationRule: 'Must be valid ICD-10-CM code per CMS code table; auto-validated against current fiscal year code set',
      lastUpdated: '2026-06-11',
    },
    changedFields: ['validationRule', 'lastUpdated'],
  },

  // ── 4. Create request: new Data Item ─────────────────────────
  {
    id: 'req-004',
    batchId: 'batch-003',
    type: 'create',
    recordType: 'dataitem',
    status: 'pending',
    submittedAt: '2026-06-11T09:30:00Z',
    submittedBy: 'Alex Kim',
    subjectAreaId: housing.id,
    subjectAreaName: housing.name,
    parentEntityId: propRecords.id,
    parentEntityName: propRecords.name,
    proposedData: {
      id: 'di-new-001',
      name: 'Zoning Classification',
      technicalName: 'zoning_classification',
      dataType: 'VARCHAR',
      length: '50',
      nullable: true,
      keyIndicator: null,
      classification: 'Public',
      sensitivityLevel: 'Low',
      description: 'Official zoning designation assigned to the property by the local municipality (e.g., R1, C2, M1).',
      format: 'Alphanumeric code as defined by municipal zoning ordinance',
      allowedValues: [],
      validationRule: 'Must match a known zoning code from the municipality reference table when present',
      defaultValue: undefined,
      steward: 'Alex Kim',
      lastUpdated: '2026-06-11',
      sourceColumn: 'property_master.zoning_cd',
      transformationLogic: 'Direct map from source after municipality code lookup',
    },
  },

  // ── 5. NEW DEMO DATA: Entity with pending children ────────────
  {
    id: 'req-005',
    batchId: 'batch-004',
    type: 'create',
    recordType: 'entity',
    status: 'pending',
    submittedAt: '2026-06-11T10:00:00Z',
    submittedBy: 'Sarah Chen',
    subjectAreaId: healthcare.id,
    subjectAreaName: healthcare.name,
    proposedData: {
      id: 'e-new-002',
      name: 'Insurance Claims',
      technicalName: 'healthcare.insurance_claims',
      description: 'Medical and dental insurance claims processed for patient encounters.',
      owner: 'Dr. James Park',
      steward: 'Carla Nguyen',
      sourceSystem: 'Claims Processing System',
      recordCount: '0',
      refreshFrequency: 'Daily',
      classification: 'Restricted',
      status: 'Active',
      tags: ['PHI', 'HIPAA', 'Claims'],
      dataItems: [],
      qualityScore: 95,
      retentionPolicy: '7 years',
      schemaVersion: 'v1.1.0',
      slaTarget: '99% availability',
      lineageSource: 'CPS → Data Lake',
      businessGlossaryRef: 'BG-CLAIMS-001',
      lastUpdated: '2026-06-11 10:00:00',
    },
  },

  {
    id: 'req-006',
    batchId: 'batch-004',
    type: 'create',
    recordType: 'dataitem',
    status: 'pending',
    submittedAt: '2026-06-11T10:05:00Z',
    submittedBy: 'Sarah Chen',
    subjectAreaId: healthcare.id,
    subjectAreaName: healthcare.name,
    parentEntityId: 'e-new-002',
    parentEntityName: 'Insurance Claims',
    proposedData: {
      id: 'di-new-002',
      name: 'Claim ID',
      technicalName: 'claim_id',
      dataType: 'VARCHAR',
      length: '36',
      nullable: false,
      keyIndicator: 'PK',
      classification: 'Internal',
      sensitivityLevel: 'Low',
      description: 'Unique identifier for the insurance claim.',
      steward: 'Carla Nguyen',
      lastUpdated: '2026-06-11',
    },
  },

  {
    id: 'req-007',
    batchId: 'batch-004',
    type: 'create',
    recordType: 'dataitem',
    status: 'pending',
    submittedAt: '2026-06-11T10:06:00Z',
    submittedBy: 'Sarah Chen',
    subjectAreaId: healthcare.id,
    subjectAreaName: healthcare.name,
    parentEntityId: 'e-new-002',
    parentEntityName: 'Insurance Claims',
    proposedData: {
      id: 'di-new-003',
      name: 'Claim Amount',
      technicalName: 'claim_amount',
      dataType: 'DECIMAL',
      length: '10,2',
      nullable: false,
      keyIndicator: null,
      classification: 'Confidential',
      sensitivityLevel: 'Medium',
      description: 'Total billed amount for the insurance claim.',
      steward: 'Carla Nguyen',
      lastUpdated: '2026-06-11',
    },
  },

  // ── 8. BULK EDIT DEMO: the same 2 columns edited on 5 data items, all
  // under one parent entity (Property Records) that itself stays UNCHANGED —
  // it has no entity-level request of its own, so it renders as a read-only
  // "existing entity" context header with these 5 edits nested underneath.
  // Every one of the 5 moves Classification → Restricted and Sensitivity
  // Level → Critical, regardless of what each item's current value was —
  // the common-edit scenario the inline change preview is meant to surface.
  ...propRecords.dataItems.slice(0, 5).map((item): Omit<ChangeRequest, 'stage'> => ({
    id: `req-bulk-${item.id}`,
    batchId: 'batch-005',
    type: 'edit',
    recordType: 'dataitem',
    status: 'pending',
    submittedAt: '2026-06-12T09:00:00Z',
    submittedBy: 'Data Governance Bot',
    subjectAreaId: housing.id,
    subjectAreaName: housing.name,
    parentEntityId: propRecords.id,
    parentEntityName: propRecords.name,
    originalData: { ...item },
    proposedData: { ...item, classification: 'Restricted', sensitivityLevel: 'Critical' },
    changedFields: ['classification', 'sensitivityLevel'],
  })),

  // ── 9. SECOND ENTITY DEMO: 10 data-item edits under Clinical Encounters
  // (Healthcare) — also UNCHANGED, no entity-level request of its own.
  // Unlike the Property Records group above (one identical 2-column edit on
  // every item), this group is intentionally uneven: each item changes a
  // different pair of fields, but the columns themselves recur across
  // several items rather than all 10 sharing the same pair — Classification
  // + Steward on 4 items, Sensitivity Level + Last Modified on 3, Validation
  // Rule + Business Definition on 2, and one item overlapping into
  // Classification + Sensitivity Level. A more realistic "several small
  // edits landed around the same time" queue than a single uniform sweep.
  ...([
    {
      original: { id: 'di-ce-1', name: 'Referring Physician', technicalName: 'referring_physician', dataType: 'VARCHAR', length: '100', nullable: true, keyIndicator: null, classification: 'Internal', sensitivityLevel: 'Medium', description: 'Physician who referred the patient for this encounter.', steward: 'Carla Nguyen', lastUpdated: '2025-09-10' } as DataItem,
      proposed: { classification: 'Confidential', steward: 'Dana Cole' } as Partial<DataItem>,
      changedFields: ['classification', 'steward'],
    },
    {
      original: { id: 'di-ce-2', name: 'Discharge Disposition', technicalName: 'discharge_disposition', dataType: 'VARCHAR', length: '50', nullable: true, keyIndicator: null, classification: 'Internal', sensitivityLevel: 'Low', description: 'Status of patient at discharge (e.g., Home, Transferred, Deceased).', steward: 'Carla Nguyen', lastUpdated: '2025-09-12' } as DataItem,
      proposed: { classification: 'Confidential', steward: 'Dana Cole' } as Partial<DataItem>,
      changedFields: ['classification', 'steward'],
    },
    {
      original: { id: 'di-ce-3', name: 'Admission Source', technicalName: 'admission_source', dataType: 'VARCHAR', length: '50', nullable: true, keyIndicator: null, classification: 'Public', sensitivityLevel: 'Low', description: 'Source of patient admission (e.g., ER, Direct, Transfer).', steward: 'Dr. James Park', lastUpdated: '2025-08-20' } as DataItem,
      proposed: { classification: 'Confidential', steward: 'Marcus Lee' } as Partial<DataItem>,
      changedFields: ['classification', 'steward'],
    },
    {
      original: { id: 'di-ce-4', name: 'Bed Number', technicalName: 'bed_number', dataType: 'VARCHAR', length: '20', nullable: true, keyIndicator: null, classification: 'Internal', sensitivityLevel: 'Low', description: 'Bed assignment during inpatient stay.', steward: 'Carla Nguyen', lastUpdated: '2025-07-05' } as DataItem,
      proposed: { classification: 'Restricted', steward: 'Dana Cole' } as Partial<DataItem>,
      changedFields: ['classification', 'steward'],
    },
    {
      original: { id: 'di-ce-5', name: 'Insurance Authorization Code', technicalName: 'insurance_auth_code', dataType: 'VARCHAR', length: '30', nullable: true, keyIndicator: null, classification: 'Confidential', sensitivityLevel: 'Medium', description: 'Authorization code issued by insurer for the encounter.', steward: 'Carla Nguyen', lastUpdated: '2025-02-01' } as DataItem,
      proposed: { sensitivityLevel: 'High', lastUpdated: '2026-06-12' } as Partial<DataItem>,
      changedFields: ['sensitivityLevel', 'lastUpdated'],
    },
    {
      original: { id: 'di-ce-6', name: 'Treatment Outcome', technicalName: 'treatment_outcome', dataType: 'VARCHAR', length: '50', nullable: true, keyIndicator: null, classification: 'Internal', sensitivityLevel: 'Low', description: 'Clinical outcome recorded at end of treatment.', steward: 'Dr. James Park', lastUpdated: '2025-03-01' } as DataItem,
      proposed: { sensitivityLevel: 'Medium', lastUpdated: '2026-06-12' } as Partial<DataItem>,
      changedFields: ['sensitivityLevel', 'lastUpdated'],
    },
    {
      original: { id: 'di-ce-7', name: 'Follow-up Required', technicalName: 'followup_required', dataType: 'BOOLEAN', nullable: false, keyIndicator: null, classification: 'Internal', sensitivityLevel: 'Medium', description: 'Whether a follow-up visit is required after this encounter.', steward: 'Carla Nguyen', lastUpdated: '2025-01-15' } as DataItem,
      proposed: { sensitivityLevel: 'Critical', lastUpdated: '2026-06-12' } as Partial<DataItem>,
      changedFields: ['sensitivityLevel', 'lastUpdated'],
    },
    {
      original: { id: 'di-ce-8', name: 'Attending Physician', technicalName: 'attending_physician', dataType: 'VARCHAR', length: '100', nullable: false, keyIndicator: null, classification: 'Internal', sensitivityLevel: 'Medium', description: 'Physician of record overseeing the encounter.', validationRule: 'Must reference a valid provider in the provider registry', steward: 'Carla Nguyen', lastUpdated: '2025-06-01' } as DataItem,
      proposed: { validationRule: 'Must reference a valid, currently-credentialed provider in the provider registry', description: 'Credentialed physician of record overseeing and accountable for the encounter.' } as Partial<DataItem>,
      changedFields: ['validationRule', 'description'],
    },
    {
      original: { id: 'di-ce-9', name: 'Procedure Code', technicalName: 'procedure_code', dataType: 'VARCHAR', length: '20', nullable: true, keyIndicator: null, classification: 'Internal', sensitivityLevel: 'Medium', description: 'Procedure performed during the encounter.', validationRule: 'Must be a valid CPT code', steward: 'Dr. James Park', lastUpdated: '2025-05-15' } as DataItem,
      proposed: { validationRule: 'Must be a valid CPT or HCPCS Level II code', description: 'Primary procedure performed during the encounter, coded per CPT/HCPCS standards.' } as Partial<DataItem>,
      changedFields: ['validationRule', 'description'],
    },
    {
      original: { id: 'di-ce-10', name: 'Visit Notes', technicalName: 'visit_notes', dataType: 'TEXT', nullable: true, keyIndicator: null, classification: 'Internal', sensitivityLevel: 'Medium', description: 'Free-text clinical notes recorded during the visit.', steward: 'Carla Nguyen', lastUpdated: '2025-04-20' } as DataItem,
      proposed: { classification: 'Confidential', sensitivityLevel: 'High' } as Partial<DataItem>,
      changedFields: ['classification', 'sensitivityLevel'],
    },
  ] satisfies Array<{ original: DataItem; proposed: Partial<DataItem>; changedFields: string[] }>).map(({ original, proposed, changedFields }, i): Omit<ChangeRequest, 'stage'> => ({
    id: `req-ce-${i + 1}`,
    batchId: 'batch-006',
    type: 'edit',
    recordType: 'dataitem',
    status: 'pending',
    submittedAt: '2026-06-13T09:00:00Z',
    submittedBy: 'Carla Nguyen',
    subjectAreaId: healthcare.id,
    subjectAreaName: healthcare.name,
    parentEntityId: clinicalEncounters.id,
    parentEntityName: clinicalEncounters.name,
    originalData: original,
    proposedData: { ...original, ...proposed },
    changedFields,
  })),
];

export const initialRequests: ChangeRequest[] = rawInitialRequests.map(r => ({ ...r, stage: 'dgo' as const }));
