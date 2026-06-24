// Full detail view for ONE request (= one batchId, every entity/data-item
// change submitted together). Opened by clicking a SubmissionCard. Shows the
// Excel-style hierarchy table for just this request's items, a thread for
// comments on the request as a whole, and the single Approve/Reject action
// pair that accepts or rejects EVERYTHING in the request — there is no
// per-row approve/reject; see CLAUDE.md "Approval workflow".
//
// Comments have ONE commit point: there is no per-comment "submit" button.
// Drafts (generic + per-row) are controlled from the PARENT (ApproverPortal
// or FocusModeView) so that both clicking Approve/Reject here AND using
// Focus Mode's keyboard shortcuts flush the same drafts the same way — see
// each parent's flushDrafts. Threads themselves carry every round of
// reject → revise → resubmit, not just the latest note — see CommentThread.
//
// Also reused, read-only, by the Board Member's "My Requests" (readOnly):
// no Approve/Reject (so no drafts either), the threads — including the
// generic one — are shown exactly as the approver left them.

import { ChevronLeft, Clock, Lock, Download, Pencil } from 'lucide-react';
import { ChangeRequest, Comment, Entity, SubjectArea } from '../types';
import { Submission } from '../lib/submissions';
import { groupRequestsBySubjectArea } from '../lib/requestGroups';
import { HierarchyRequestTable } from './shared/HierarchyRequestTable';
import { CommentThread } from './shared/CommentThread';
import { formatSubmittedAt } from '../lib/format';
import { OperationBadge } from '../lib/badges';
import { ApproveButton, RejectButton } from './ui/ActionButton';

const STATUS_BADGE: Record<Submission['status'], string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
};

interface SubmissionDetailViewProps {
  submission: Submission;
  subjectAreas: SubjectArea[];
  onBack: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onEntityClick?: (entity: Entity) => void;
  onRowClick?: (req: ChangeRequest) => void;
  itemComments: Record<string, Comment[]>;
  genericComments: Comment[];
  /** Unsent per-row drafts, controlled by the parent (one commit point: Approve/Reject). */
  itemDrafts?: Record<string, string>;
  onItemDraftChange?: (requestId: string, text: string) => void;
  /** Unsent generic-comment draft, controlled by the parent. */
  genericDraft?: string;
  onGenericDraftChange?: (text: string) => void;
  /** True if this request can't be approved yet (a dependency is pending elsewhere). */
  blocked?: boolean;
  blockedReason?: string;
  /** Board member view: no Approve/Reject (so no drafts either), Export instead of actions. */
  readOnly?: boolean;
  onExport?: () => void;
  /** Board member view, rejected request only: switches to the Revise & Resubmit screen. */
  onEdit?: () => void;
}

export function SubmissionDetailView({
  submission, subjectAreas, onBack, onApprove, onReject, onEntityClick, onRowClick,
  itemComments, genericComments, itemDrafts, onItemDraftChange, genericDraft, onGenericDraftChange,
  blocked, blockedReason, readOnly, onExport, onEdit,
}: SubmissionDetailViewProps) {
  const groups = groupRequestsBySubjectArea(submission.items);
  const isPending = submission.status === 'pending';
  const total = submission.entityCount + submission.dataItemCount;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to requests
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-gray-900">{submission.submittedBy}</span>
              {submission.operations.map(op => <OperationBadge key={op} operation={op} />)}
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${STATUS_BADGE[submission.status]}`}>
                {submission.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1.5 flex-wrap">
              <Clock className="w-3 h-3" />
              <span>{formatSubmittedAt(submission.submittedAt)}</span>
              <span className="text-gray-300">·</span>
              <span>{submission.subjectAreaNames.join(', ')}</span>
              <span className="text-gray-300">·</span>
              <span>
                <span className="font-semibold text-gray-600">{total}</span> item{total !== 1 ? 's' : ''}
                {' '}({submission.entityCount} entit{submission.entityCount !== 1 ? 'ies' : 'y'}, {submission.dataItemCount} data item{submission.dataItemCount !== 1 ? 's' : ''})
              </span>
              {readOnly && submission.reviewedBy && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>
                    {submission.status === 'approved' ? 'Approved' : 'Reviewed'} by{' '}
                    <span className="font-medium text-gray-600">{submission.reviewedBy}</span>
                    {submission.reviewedAt && <> on {formatSubmittedAt(submission.reviewedAt)}</>}
                  </span>
                </>
              )}
            </div>
          </div>

          {!readOnly && isPending && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <RejectButton size="md" variant="solid" onClick={onReject} />
              <ApproveButton size="md" onClick={onApprove} locked={blocked} />
            </div>
          )}

          {readOnly && (onExport || onEdit) && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
                >
                  <Pencil className="w-4 h-4" /> Edit &amp; Resubmit
                </button>
              )}
              {onExport && (
                <button
                  onClick={onExport}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4 text-blue-500" /> Export
                </button>
              )}
            </div>
          )}
        </div>

        {!readOnly && blocked && isPending && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 flex-shrink-0" />
            {blockedReason ?? 'This request depends on another pending request — resolve that one first.'}
          </div>
        )}

        {submission.rejectionReason && (
          <div className="px-6 py-2.5 bg-red-50 border-b border-red-100 text-xs text-red-700">
            <span className="font-semibold">Rejection Reason:</span> {submission.rejectionReason}
          </div>
        )}

        {/* Generic comment thread — applies to the request as a whole, distinct
            from the per-row threads in the table below. Visible to the approver
            and (read-only) the board member alike, and carries every round of
            reject → revise → resubmit. A draft typed here is only added when
            Approve/Reject is clicked — same one-commit-point rule as the
            per-row threads. */}
        <div className="px-6 py-4 bg-gray-50/60 border-b border-gray-100">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Comments on this request
          </label>
          <CommentThread
            comments={genericComments}
            readOnly={readOnly}
            draft={genericDraft}
            onDraftChange={readOnly ? undefined : onGenericDraftChange}
            placeholder="Add an overall note for this request…"
          />
        </div>
      </div>

      <HierarchyRequestTable
        groups={groups}
        subjectAreas={subjectAreas}
        onRowClick={onRowClick}
        onEntityClick={onEntityClick}
        comments={itemComments}
        drafts={itemDrafts ?? {}}
        onDraftChange={onItemDraftChange ?? (() => {})}
        readOnly={readOnly}
      />
    </div>
  );
}
