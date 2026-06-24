// Client-side export of a request's Excel-style table (no backend — this is
// a UI-only "Export" action for the board member's read-only request view).
// Produces a CSV with every item's attributes plus the approver's per-item
// comment column, so the board member gets the same information they saw
// on screen as a file they can keep.

import { ChangeRequest, Comment, Entity, DataItem } from '../types';
import { RECORD_FIELDS } from './fieldSchema';
import { formatValue, formatSubmittedAt } from './format';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Renders a comment thread as one flattened cell value: each entry on its own line. */
function formatThread(comments: Comment[]): string {
  return comments.map(c => `[${formatSubmittedAt(c.timestamp)}] ${c.author}: ${c.text}`).join('\n');
}

const EXPORT_FIELDS = RECORD_FIELDS.filter(f => f.key !== 'name' && f.key !== 'technicalName');

/** Builds a CSV string for one request's items, including the full approver comment threads. */
export function buildSubmissionCsv(items: ChangeRequest[], itemComments: Record<string, Comment[]>, genericComments: Comment[]): string {
  const headers = [
    'Record Type', 'Operation', 'Business Name', 'Technical Name',
    ...EXPORT_FIELDS.map(f => f.label),
    'Approver Comments',
  ];

  const rows = items.map(req => {
    const data = req.proposedData as Entity | DataItem;
    const values = data as unknown as Record<string, unknown>;
    return [
      req.recordType === 'entity' ? 'Entity' : 'Data Item',
      req.type === 'create' ? 'Create' : 'Edit',
      data.name,
      data.technicalName,
      ...EXPORT_FIELDS.map(f => formatValue(values[f.key as string])),
      formatThread(itemComments[req.id] ?? []),
    ];
  });

  const lines = [headers, ...rows].map(row => row.map(v => csvEscape(String(v))).join(','));
  if (genericComments.length > 0) {
    lines.push('');
    lines.push(csvEscape('General comments on this request:'));
    for (const c of genericComments) {
      lines.push(csvEscape(`[${formatSubmittedAt(c.timestamp)}] ${c.author}: ${c.text}`));
    }
  }
  return lines.join('\n');
}

/** Triggers a browser download of the given text as a file — no server round-trip. */
export function downloadTextFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
