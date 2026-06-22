// The canonical field list shared by Entities and Data Items — both record
// types are populated from the same import template, so they share one flat
// attribute schema. This is the single source of truth consumed by the diff
// views (RequestCard, FocusModeView via DiffGrid), the Excel-style
// RequestTable, and the read-only EntityViewCard.

import { Entity, DataItem, RecordAttributes } from '../types';

export interface FieldDef<T> {
  key: keyof T;
  label: string;
}

export const RECORD_FIELDS: FieldDef<RecordAttributes>[] = [
  { key: 'name', label: 'Business Name' },
  { key: 'technicalName', label: 'Technical Name' },
  { key: 'description', label: 'Description' },
  { key: 'owner', label: 'Owner' },
  { key: 'steward', label: 'Data Steward' },
  { key: 'sourceSystem', label: 'Source System' },
  { key: 'recordCount', label: 'Record Count' },
  { key: 'refreshFrequency', label: 'Refresh Frequency' },
  { key: 'classification', label: 'Classification' },
  { key: 'status', label: 'Status' },
  { key: 'sensitivityLevel', label: 'Sensitivity Level' },
  { key: 'dataType', label: 'Data Type' },
  { key: 'length', label: 'Length / Precision' },
  { key: 'nullable', label: 'Nullable' },
  { key: 'keyIndicator', label: 'Key Indicator' },
  { key: 'format', label: 'Format / Pattern' },
  { key: 'defaultValue', label: 'Default Value' },
  { key: 'validationRule', label: 'Validation Rule' },
  { key: 'allowedValues', label: 'Allowed Values' },
  { key: 'sourceColumn', label: 'Source Column' },
  { key: 'transformationLogic', label: 'Transformation Logic' },
  { key: 'qualityScore', label: 'Quality Score' },
  { key: 'retentionPolicy', label: 'Retention Policy' },
  { key: 'schemaVersion', label: 'Schema Version' },
  { key: 'slaTarget', label: 'SLA Target' },
  { key: 'lineageSource', label: 'Lineage Source' },
  { key: 'businessGlossaryRef', label: 'Business Glossary Ref' },
  { key: 'lastUpdated', label: 'Last Updated' },
  { key: 'tags', label: 'Tags' },
];

// Kept as two names for backward compatibility with call sites that branch
// on record type — both now point at the exact same shared field list.
export const ENTITY_FIELDS = RECORD_FIELDS as unknown as FieldDef<Entity>[];
export const DATAITEM_FIELDS = RECORD_FIELDS as unknown as FieldDef<DataItem>[];
