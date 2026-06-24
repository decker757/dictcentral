// The top-level card for the Requests tab — one per REQUEST (i.e. one per
// batchId), not one per entity/data item. This is what an approver sees
// first: who submitted it, when, and how many entities/data items it
// contains. Clicking it opens the full Excel-style table (SubmissionDetailView)
// where the whole request is accepted or rejected as one unit.

import { Clock, Database, FileText, ChevronRight, Layers, ShieldCheck } from 'lucide-react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { Submission } from '../lib/submissions';
import { OperationBadge, SubmissionStatusBadge } from '../lib/badges';
import { formatSubmittedAt } from '../lib/format';

export function SubmissionCard({
  submission, onOpen, selected, onToggleSelect, showDgoReviewer,
}: {
  submission: Submission;
  onOpen: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  /** HOD queue only — shows which DGO approved (forwarded) this request, alongside the requester. */
  showDgoReviewer?: boolean;
}) {
  const total = submission.entityCount + submission.dataItemCount;
  const isPending = submission.status === 'pending';

  return (
    <div
      className={`flex items-center gap-3 border rounded-xl bg-white transition-colors ${
        isPending ? 'border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md' : 'border-gray-100 opacity-80'
      }`}
    >
      {isPending && onToggleSelect && (
        <div className="pl-4">
          <CheckboxPrimitive.Root
            checked={selected}
            onCheckedChange={onToggleSelect}
            className="w-4 h-4 rounded border border-gray-300 bg-white flex items-center justify-center data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          >
            <CheckboxPrimitive.Indicator>
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </CheckboxPrimitive.Indicator>
          </CheckboxPrimitive.Root>
        </div>
      )}

      <button
        onClick={onOpen}
        className={`flex-1 min-w-0 flex items-center gap-4 px-5 py-4 text-left ${isPending && onToggleSelect ? 'pl-3' : ''}`}
      >
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
          <Layers className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{submission.submittedBy}</span>
            {submission.operations.map(op => <OperationBadge key={op} operation={op} />)}
            <SubmissionStatusBadge status={submission.status} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1 flex-wrap">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>{formatSubmittedAt(submission.submittedAt)}</span>
            <span className="text-gray-300">·</span>
            <span className="truncate">{submission.subjectAreaNames.join(', ')}</span>
            {showDgoReviewer && submission.dgoReviewedBy && (
              <>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1 flex-shrink-0">
                  <ShieldCheck className="w-3 h-3 text-purple-500" />
                  DGO: <span className="font-medium text-gray-600">{submission.dgoReviewedBy}</span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
          {submission.entityCount > 0 && (
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-purple-500" />
              {submission.entityCount} entit{submission.entityCount !== 1 ? 'ies' : 'y'}
            </span>
          )}
          {submission.dataItemCount > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-green-500" />
              {submission.dataItemCount} data item{submission.dataItemCount !== 1 ? 's' : ''}
            </span>
          )}
          <span className="px-2 py-0.5 bg-gray-100 rounded-full font-semibold text-gray-600 whitespace-nowrap">
            {total} total
          </span>
        </div>

        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </button>
    </div>
  );
}
