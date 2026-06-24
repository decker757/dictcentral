// The board member's request-list card — deliberately lighter than the
// approver's SubmissionCard. A board member doesn't need entity/data-item
// counts on the card (they wrote the request, they know what's in it); what
// they want to know at a glance is: what kind of change, and — once
// reviewed — who reviewed it and when. Click through to see everything else.

import { Clock, ChevronRight, Layers, UserCheck } from 'lucide-react';
import { Submission } from '../lib/submissions';
import { OperationBadge } from '../lib/badges';
import { formatSubmittedAt } from '../lib/format';

const STATUS_BADGE: Record<Submission['status'], string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
};

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
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize ${STATUS_BADGE[submission.status]}`}>
            {submission.status}
          </span>
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
