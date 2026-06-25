// Field validation for the Create/Edit forms (CreateModal/EditModal) AND for
// the DGO's "Validate Fields" review-time check on an already-submitted
// request (SubmissionDetailView/ValidateFieldsModal). Two distinct tiers:
//
// - HARD errors (`getHardErrors`/`FieldError`): compulsory fields must be
//   filled in, and free-text fields must hold an "appropriate" value (a
//   technical name shaped like an identifier, a record count that's
//   actually a number, etc). These BLOCK submission outright — in
//   CreateModal/EditModal, the submit button stays as "Validate Fields"
//   until every hard error clears; see those files' `validated` state.
// - SOFT warnings (`getSoftWarnings`, pre-existing): advisory only, never
//   block anything — surfaced alongside hard errors in the create/edit
//   forms, and on its own via the DGO's post-submission "Validate Fields"
//   button.

import { ChangeRequest, RecordAttributes } from '../types';
import { isEmptyValue } from './format';
import { REQUIRED_RECORD_FIELDS } from './fieldSchema';

export interface SoftWarning {
  field: string;
  message: string;
}

export interface FieldError {
  field: string;
  message: string;
}

const REQUIRED_FIELD_LABELS: Record<string, string> = {
  name: 'Business Name',
  technicalName: 'Technical Name',
  classification: 'Classification',
};

// Lowercase letters, digits, underscores, starting with a letter — the shape every
// `technicalName` in the seed data already follows (see data/mockData.ts).
const TECHNICAL_NAME_RE = /^[a-z][a-z0-9_]*$/;

/** HARD validation — compulsory fields present, and the fields that have one hold an
 * "appropriate" value. Blocks submission; see CreateModal/EditModal's `validated` state. */
export function getHardErrors(record: Partial<RecordAttributes>, recordType: 'entity' | 'dataitem'): FieldError[] {
  const errors: FieldError[] = [];

  for (const field of REQUIRED_RECORD_FIELDS) {
    if (isEmptyValue(record[field])) {
      errors.push({ field, message: `${REQUIRED_FIELD_LABELS[field] ?? field} is required.` });
    }
  }

  if (!isEmptyValue(record.technicalName) && !TECHNICAL_NAME_RE.test(record.technicalName as string)) {
    errors.push({
      field: 'technicalName',
      message: 'Technical Name must start with a letter and contain only lowercase letters, numbers, and underscores (e.g. customer_id).',
    });
  }
  if (recordType === 'entity' && !isEmptyValue(record.recordCount) && !/^\d+$/.test(String(record.recordCount).replace(/,/g, ''))) {
    errors.push({ field: 'recordCount', message: 'Record Count must be a whole number.' });
  }
  if (recordType === 'dataitem' && !isEmptyValue(record.length) && !/^\d+(,\d+)?$/.test(String(record.length))) {
    errors.push({ field: 'length', message: 'Length / Precision must be numeric (e.g. 50 or 10,2).' });
  }
  if (!isEmptyValue(record.qualityScore) && (Number(record.qualityScore) < 0 || Number(record.qualityScore) > 100)) {
    errors.push({ field: 'qualityScore', message: 'Quality Score must be between 0 and 100.' });
  }

  return errors;
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

export interface FormValidationResult {
  errors: FieldError[];
  warnings: SoftWarning[];
  passed: boolean;
}

/** Combined hard+soft validation for a Create/Edit form's current field values. `passed` is
 * true once there are zero hard errors — soft warnings are shown but never block. */
export function validateRecordForm(record: Partial<RecordAttributes>, recordType: 'entity' | 'dataitem'): FormValidationResult {
  const errors = getHardErrors(record, recordType);
  const warnings = getSoftWarnings(record as RecordAttributes, recordType);
  return { errors, warnings, passed: errors.length === 0 };
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
