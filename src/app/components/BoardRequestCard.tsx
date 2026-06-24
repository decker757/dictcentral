// The board member's request-list card — deliberately lighter than the
// approver's SubmissionCard. A board member doesn't need entity/data-item
// counts on the card (they wrote the request, they know what's in it); what
// they want to know at a glance is: what kind of change, and — once
// reviewed — who reviewed it and when. Click through to see everything else.
//
// No Withdraw action here on purpose — withdrawing only happens from inside
// SubmissionDetailView (the request detail view), not from this list card.

import { Clock, ChevronRight, Layers, UserCheck } from 'lucide-react';
import { Submission } from '../lib/submissions';
import { OperationBadge, SubmissionStatusBadge } from '../lib/badges';
import { formatSubmittedAt } from '../lib/format';

export function BoardRequestCard({ submission, onOpen }: { submission: Submission; onOpen: () => void }) {
  const isResolved = submission.status !== 'pending';

  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-4 px-5 py-4 border border-gray-200 rounded-xl bg-white shadow-sm hover:border-blue-300 hover:shadow-md transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
        <Layers className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {submission.operations.map(op => <OperationBadge key={op} operation={op} />)}
          <SubmissionStatusBadge status={submission.status} />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1 flex-wrap">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>Created {formatSubmittedAt(submission.submittedAt)}</span>
          {isResolved && submission.reviewedBy && (
            <>
              <span className="text-gray-300">·</span>
              <UserCheck className="w-3 h-3 flex-shrink-0" />
              <span>
                {submission.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
                <span className="font-medium text-gray-600">{submission.reviewedBy}</span>
              </span>
              {submission.reviewedAt && (
                <>
                  <span className="text-gray-300">·</span>
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span>{formatSubmittedAt(submission.reviewedAt)}</span>
                </>
              )}
            </>
          )}
          {!isResolved && (
            <>
              <span className="text-gray-300">·</span>
              <span>Awaiting approver review</span>
            </>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
    </button>
  );
}
