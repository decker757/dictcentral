// The canonical field lists for Entities and Data Items. This is the single
// source of truth consumed by the diff views (RequestCard, FocusModeView via
// DiffGrid) and the read-only EntityViewCard.

import { Entity, DataItem } from '../types';

export interface FieldDef<T> {
  key: keyof T;
  label: string;
}

export const ENTITY_FIELDS: FieldDef<Entity>[] = [
  { key: 'name', label: 'Name' },
  { key: 'physicalTableName', label: 'Physical Table Name' },
  { key: 'description', label: 'Description' },
  { key: 'owner', label: 'Owner' },
  { key: 'steward', label: 'Data Steward' },
  { key: 'sourceSystem', label: 'Source System' },
  { key: 'recordCount', label: 'Record Count' },
  { key: 'refreshFrequency', label: 'Refresh Frequency' },
  { key: 'classification', label: 'Classification' },
  { key: 'status', label: 'Status' },
  { key: 'qualityScore', label: 'Quality Score' },
  { key: 'retentionPolicy', label: 'Retention Policy' },
  { key: 'schemaVersion', label: 'Schema Version' },
  { key: 'slaTarget', label: 'SLA Target' },
  { key: 'lineageSource', label: 'Lineage Source' },
  { key: 'businessGlossaryRef', label: 'Business Glossary Ref' },
  { key: 'lastUpdated', label: 'Last Updated' },
  { key: 'tags', label: 'Tags' },
];

export const DATAITEM_FIELDS: FieldDef<DataItem>[] = [
  { key: 'name', label: 'Business Name' },
  { key: 'technicalName', label: 'Technical Name' },
  { key: 'dataType', label: 'Data Type' },
  { key: 'length', label: 'Length / Precision' },
  { key: 'nullable', label: 'Nullable' },
  { key: 'keyIndicator', label: 'Key Indicator' },
  { key: 'classification', label: 'Classification' },
  { key: 'sensitivityLevel', label: 'Sensitivity Level' },
  { key: 'businessDefinition', label: 'Business Definition' },
  { key: 'format', label: 'Format / Pattern' },
  { key: 'defaultValue', label: 'Default Value' },
  { key: 'validationRule', label: 'Validation Rule' },
  { key: 'allowedValues', label: 'Allowed Values' },
  { key: 'steward', label: 'Data Steward' },
  { key: 'sourceColumn', label: 'Source Column' },
  { key: 'transformationLogic', label: 'Transformation Logic' },
  { key: 'lastModified', label: 'Last Modified' },
];
