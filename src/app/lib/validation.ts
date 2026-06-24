// Soft-warning validation — distinct from the HARD required-field validation
// in fieldSchema.ts (REQUIRED_RECORD_FIELDS), which BLOCKS a board member's
// submission/resubmission if Business Name / Technical Name / Classification
// are empty. Soft warnings never block anything — they're advisory notes a
// DGO can check via the "Validate Fields" button in SubmissionDetailView,
// surfacing rows that passed hard validation but may still need a closer
// look before being forwarded to an HOD.

import { ChangeRequest, RecordAttributes } from '../types';
import { isEmptyValue } from './format';

export interface SoftWarning {
  field: string;
  message: string;
}

/** Soft-warning rules for one record's fields — advisory only, never blocking. */
export function getSoftWarnings(record: RecordAttributes, recordType: 'entity' | 'dataitem'): SoftWarning[] {
  const warnings: SoftWarning[] = [];

  if (isEmptyValue(record.description)) {
    warnings.push({ field: 'description', message: 'Description is empty — consider adding a business definition.' });
  }
  if (recordType === 'entity' && isEmptyValue(record.owner)) {
    warnings.push({ field: 'owner', message: 'Owner is not specified.' });
  }
  if (isEmptyValue(record.steward)) {
    warnings.push({ field: 'steward', message: 'Data Steward is not specified.' });
  }
  const highSensitivity = record.classification === 'Restricted' || record.sensitivityLevel === 'Critical';
  if (highSensitivity && isEmptyValue(record.validationRule)) {
    warnings.push({ field: 'validationRule', message: 'High classification/sensitivity but no validation rule is defined.' });
  }
  if (recordType === 'entity' && (!record.tags || record.tags.length === 0)) {
    warnings.push({ field: 'tags', message: 'No tags assigned.' });
  }
  if (isEmptyValue(record.lastUpdated)) {
    warnings.push({ field: 'lastUpdated', message: '"Last Updated" is not set.' });
  }
  if (recordType === 'dataitem' && isEmptyValue(record.dataType)) {
    warnings.push({ field: 'dataType', message: 'Data Type is not specified.' });
  }

  return warnings;
}

export interface RequestWarnings {
  request: ChangeRequest;
  warnings: SoftWarning[];
}

/** Soft warnings for one request — skipped entirely for delete requests (nothing to validate
 * about a record on its way out). */
export function getRequestWarnings(request: ChangeRequest): SoftWarning[] {
  if (request.type === 'delete') return [];
  return getSoftWarnings(request.proposedData as unknown as RecordAttributes, request.recordType);
}

/** Soft warnings across every item in a submission, skipping items with none. */
export function getSubmissionWarnings(items: ChangeRequest[]): RequestWarnings[] {
  return items
    .map(request => ({ request, warnings: getRequestWarnings(request) }))
    .filter(rw => rw.warnings.length > 0);
}
