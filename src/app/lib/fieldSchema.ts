// The canonical field list shared by Entities and Data Items — both record
// types are populated from the same import template, so they share one flat
// attribute schema. This is the single source of truth consumed by the diff
// views (DiffGrid, used by SubmissionDetailView/RequestDetailModal/FocusModeView),
// the Excel-style HierarchyRequestTable/EditableHierarchyRequestTable, and
// every entity/data-item modal and form.

import { RecordAttributes } from '../types';
import { DATA_TYPES, CLASSIFICATIONS, SENSITIVITY_LEVELS, ENTITY_STATUSES, KEY_INDICATORS } from './constants';

export type FieldKind = 'text' | 'textarea' | 'select' | 'boolean' | 'number' | 'list';

export interface FieldDef<T> {
  key: keyof T;
  label: string;
  /** Editing control type — read by the board member's revise-and-resubmit table
   * (EditableHierarchyRequestTable). Purely-display consumers (DiffGrid, the read-only
   * HierarchyRequestTable) ignore this. */
  kind?: FieldKind;
  /** Allowed values, for kind: 'select'. */
  options?: readonly string[];
}

export const RECORD_FIELDS: FieldDef<RecordAttributes>[] = [
  { key: 'name', label: 'Business Name', kind: 'text' },
  { key: 'technicalName', label: 'Technical Name', kind: 'text' },
  { key: 'description', label: 'Description', kind: 'textarea' },
  { key: 'owner', label: 'Owner', kind: 'text' },
  { key: 'steward', label: 'Data Steward', kind: 'text' },
  { key: 'sourceSystem', label: 'Source System', kind: 'text' },
  { key: 'recordCount', label: 'Record Count', kind: 'text' },
  { key: 'refreshFrequency', label: 'Refresh Frequency', kind: 'text' },
  { key: 'classification', label: 'Classification', kind: 'select', options: CLASSIFICATIONS },
  { key: 'status', label: 'Status', kind: 'select', options: ENTITY_STATUSES },
  { key: 'sensitivityLevel', label: 'Sensitivity Level', kind: 'select', options: SENSITIVITY_LEVELS },
  { key: 'dataType', label: 'Data Type', kind: 'select', options: DATA_TYPES },
  { key: 'length', label: 'Length / Precision', kind: 'text' },
  { key: 'nullable', label: 'Nullable', kind: 'boolean' },
  { key: 'keyIndicator', label: 'Key Indicator', kind: 'select', options: KEY_INDICATORS },
  { key: 'format', label: 'Format / Pattern', kind: 'text' },
  { key: 'defaultValue', label: 'Default Value', kind: 'text' },
  { key: 'validationRule', label: 'Validation Rule', kind: 'textarea' },
  { key: 'allowedValues', label: 'Allowed Values', kind: 'list' },
  { key: 'sourceColumn', label: 'Source Column', kind: 'text' },
  { key: 'transformationLogic', label: 'Transformation Logic', kind: 'textarea' },
  { key: 'qualityScore', label: 'Quality Score', kind: 'number' },
  { key: 'retentionPolicy', label: 'Retention Policy', kind: 'text' },
  { key: 'schemaVersion', label: 'Schema Version', kind: 'text' },
  { key: 'slaTarget', label: 'SLA Target', kind: 'text' },
  { key: 'lineageSource', label: 'Lineage Source', kind: 'text' },
  { key: 'businessGlossaryRef', label: 'Business Glossary Ref', kind: 'text' },
  { key: 'lastUpdated', label: 'Last Updated', kind: 'text' },
  { key: 'tags', label: 'Tags', kind: 'list' },
];

/** Fields that must be non-empty on every row before a create/edit (or a revised, resubmitted)
 * request can go through — mirrors the non-optional keys on RecordAttributes (see types.ts). */
export const REQUIRED_RECORD_FIELDS: (keyof RecordAttributes)[] = ['name', 'technicalName', 'classification'];

// ── Editing helpers — convert between a typed RecordAttributes value and the
// plain string an <input>/<select>/<textarea> needs, and back. Shared by the
// board member's revise-and-resubmit table (EditableHierarchyRequestTable),
// so a list field, a boolean, and a free-text field all round-trip the same
// way there as they do when a request is first created (CreateModal). ──

export function fieldInputValue(kind: FieldKind | undefined, value: unknown): string {
  if (kind === 'boolean') return value === true ? 'Yes' : value === false ? 'No' : '';
  if (kind === 'list') return Array.isArray(value) ? value.join(', ') : '';
  if (value === null || value === undefined) return '';
  return String(value);
}

export function parseFieldInput(key: string, kind: FieldKind | undefined, raw: string): unknown {
  if (kind === 'boolean') {
    if (raw === 'Yes') return true;
    if (raw === 'No') return false;
    return undefined;
  }
  if (kind === 'list') {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (kind === 'number') {
    if (raw.trim() === '') return undefined;
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  }
  // keyIndicator is the one nullable (not just optional) field — RecordAttributes
  // types it as `'PK' | 'FK' | 'UK' | null`, so clearing it means null, not undefined.
  if (raw === '') return key === 'keyIndicator' ? null : undefined;
  return raw;
}

