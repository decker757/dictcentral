// The board member's "Revise & Resubmit" screen for a REJECTED request.
// Same shape as SubmissionDetailView (header identity, rejection-reason
// banner, generic comment thread, Excel-style hierarchy table) but every
// editable field is a live input rather than a static value — the per-item
// approver comments stay visible alongside so the board member can see
// exactly what to fix while they fix it.
//
// Validation happens here, client-side, before resubmitting: every row's
// required fields (Business Name, Technical Name, Classification — see
// REQUIRED_RECORD_FIELDS) must be non-empty. Errors only render once the
// board member has tried to resubmit at least once, same "don't yell before
// they've acted" pattern as RejectDialog's disabled-until-filled button.
//
// On a valid submit, the SAME request ids/batchId go back to the approver
// queue as 'pending' — see useCatalog's reviseAndResubmit — so the existing
// comment threads (itemComments/batchComments) carry straight over rather
// than starting fresh.

import { useState } from 'react';
import { ChevronLeft, AlertTriangle, Send } from 'lucide-react';
import { ChangeRequest, Comment, RecordAttributes, SubjectArea } from '../types';
import { Submission } from '../lib/submissions';
import { groupRequestsBySubjectArea } from '../lib/requestGroups';
import { EditableHierarchyRequestTable, DraftMap } from './shared/EditableHierarchyRequestTable';
import { CommentThread } from './shared/CommentThread';
import { formatSubmittedAt, isEmptyValue } from '../lib/format';
import { OperationBadge } from '../lib/badges';
import { REQUIRED_RECORD_FIELDS } from '../lib/fieldSchema';

interface ReviseSubmissionViewProps {
  submission: Submission;
  subjectAreas: SubjectArea[];
  itemComments: Record<string, Comment[]>;
  genericComments: Comment[];
  onBack: () => void;
  /** Drafts are keyed by ChangeRequest id, each a full RecordAttributes-shaped object. */
  onResubmit: (drafts: DraftMap) => void;
}

function computeInvalidFields(drafts: DraftMap, items: ChangeRequest[]): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {};
  items.forEach(item => {
    const draft = drafts[item.id];
    if (!draft) return;
    const bad = new Set<string>();
    REQUIRED_RECORD_FIELDS.forEach(key => {
      if (isEmptyValue(draft[key])) bad.add(key as string);
    });
    if (bad.size > 0) result[item.id] = bad;
  });
  return result;
}

export function ReviseSubmissionView({
  submission, subjectAreas, itemComments, genericComments, onBack, onResubmit,
}: ReviseSubmissionViewProps) {
  // Seed one full draft per item from its current proposedData — the board
  // member is revising what they last proposed, not starting from scratch.
  const [drafts, setDrafts] = useState<DraftMap>(() => {
    const seed: DraftMap = {};
    submission.items.forEach(r => { seed[r.id] = { ...(r.proposedData as RecordAttributes) }; });
    return seed;
  });
  // Only show red/invalid styling after the board member has tried to
  // resubmit at least once — editing shouldn't open with a wall of red.
  const [attempted, setAttempted] = useState(false);

  const groups = groupRequestsBySubjectArea(submission.items);
  const invalid = computeInvalidFields(drafts, submission.items);
  const invalidCount = Object.keys(invalid).length;

  const handleFieldChange = (requestId: string, key: string, value: unknown) => {
    setDrafts(prev => ({ ...prev, [requestId]: { ...prev[requestId], [key]: value } as RecordAttributes }));
  };

  const handleSubmit = () => {
    if (invalidCount > 0) {
      setAttempted(true);
      return;
    }
    onResubmit(drafts);
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors self-start"
      >
        <ChevronLeft className="w-4 h-4" /> Back to request
      </button>

      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-gray-900">Revise &amp; Resubmit</span>
              {submission.operations.map(op => <OperationBadge key={op} operation={op} />)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1.5 flex-wrap">
              <span>Originally submitted {formatSubmittedAt(submission.submittedAt)}</span>
              <span className="text-gray-300">·</span>
              <span>{submission.subjectAreaNames.join(', ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onBack}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" /> Validate &amp; Resubmit
            </button>
          </div>
        </div>

        {submission.rejectionReason && (
          <div className="px-6 py-2.5 bg-red-50 border-b border-red-100 text-xs text-red-700">
            <span className="font-semibold">Rejection Reason:</span> {submission.rejectionReason}
          </div>
        )}

        {attempted && invalidCount > 0 && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {invalidCount} row{invalidCount !== 1 ? 's' : ''} {invalidCount !== 1 ? 'are' : 'is'} missing a required field (marked in red below) — fix these before resubmitting.
          </div>
        )}

        {/* Generic thread, read-only here — the board member is reading the
            approver's notes, not adding to them (this isn't a new commit
            point for that thread; see CLAUDE.md's comments architecture). */}
        <div className="px-6 py-4 bg-gray-50/60 border-b border-gray-100">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Comments on this request
          </label>
          <CommentThread comments={genericComments} readOnly />
        </div>
      </div>

      <EditableHierarchyRequestTable
        groups={groups}
        subjectAreas={subjectAreas}
        drafts={drafts}
        onFieldChange={handleFieldChange}
        comments={itemComments}
        invalidFields={attempted ? invalid : {}}
      />
    </div>
  );
}
