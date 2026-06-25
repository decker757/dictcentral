// The "My Requests" tab body — filter pills, list of BoardRequestCards, and
// either the read-only SubmissionDetailView (with Export/Edit & Resubmit/
// Withdraw) or ReviseSubmissionView when actively revising a rejected one.
// Includes the WithdrawDialog itself, so a consuming portal doesn't need to
// wire it up separately. Shared by BoardPortal and ApproverPortal — see
// hooks/useMyRequests.

import { ClipboardList } from 'lucide-react';
import { SubjectArea, Entity, ChangeRequest, Comment } from '../types';
import { BoardRequestCard } from './BoardRequestCard';
import { SubmissionDetailView } from './SubmissionDetailView';
import { ReviseSubmissionView } from './ReviseSubmissionView';
import { WithdrawDialog } from './shared/WithdrawDialog';
import { MyRequests } from '../hooks/useMyRequests';

interface MyRequestsPanelProps {
  subjectAreas: SubjectArea[];
  myRequests: MyRequests;
  itemComments: Record<string, Comment[]>;
  batchComments: Record<string, Comment[]>;
  onEntityClick: (entity: Entity) => void;
  onRowClick: (request: ChangeRequest) => void;
}

export function MyRequestsPanel({
  subjectAreas, myRequests, itemComments, batchComments, onEntityClick, onRowClick,
}: MyRequestsPanelProps) {
  const {
    filter, setFilter, pendingCount, approvedCount, rejectedCount, filteredSubmissions,
    openRequest, openSubmission, revisingBatchId, cancelRevising, startRevising, resubmit,
    exportSubmission, withdrawingBatchId, requestWithdraw, cancelWithdraw, confirmWithdraw,
  } = myRequests;

  return (
    <div className="flex flex-col gap-5 pb-12">
      {!openSubmission && (
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">My Requests</h2>
            <p className="text-xs text-gray-500 mt-0.5">Track the status of the changes you submitted for approval</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 flex-shrink-0">
            <span><span className="font-semibold text-amber-600">{pendingCount}</span> pending</span>
            <span><span className="font-semibold text-emerald-600">{approvedCount}</span> approved</span>
            <span><span className="font-semibold text-red-600">{rejectedCount}</span> rejected</span>
          </div>
        </div>
      )}

      {openSubmission ? (
        revisingBatchId === openSubmission.batchId ? (
          <ReviseSubmissionView
            submission={openSubmission}
            subjectAreas={subjectAreas}
            itemComments={itemComments}
            genericComments={batchComments[openSubmission.batchId] ?? []}
            onBack={cancelRevising}
            onResubmit={drafts => resubmit(openSubmission.batchId, drafts)}
          />
        ) : (
          <SubmissionDetailView
            submission={openSubmission}
            subjectAreas={subjectAreas}
            onBack={() => openRequest(null)}
            onEntityClick={onEntityClick}
            onRowClick={onRowClick}
            itemComments={itemComments}
            genericComments={batchComments[openSubmission.batchId] ?? []}
            readOnly
            onExport={openSubmission.status !== 'approved' ? () => exportSubmission(openSubmission) : undefined}
            onEdit={openSubmission.status === 'rejected' ? () => startRevising(openSubmission.batchId) : undefined}
            onWithdraw={openSubmission.status === 'pending' ? () => requestWithdraw(openSubmission.batchId) : undefined}
          />
        )
      ) : (
        <>
          <div className="flex items-center gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {f}
                {f === 'pending' && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <div className="text-sm font-medium capitalize">{filter === 'all' ? 'No requests yet' : `No ${filter} requests`}</div>
              <div className="text-xs mt-1">
                {filter === 'pending'
                  ? 'Nothing awaiting approval — use Create or Edit to submit a change'
                  : filter === 'all'
                    ? 'Use Create or Edit to submit your first change'
                    : `You have no ${filter} requests yet`}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredSubmissions.map(submission => (
                <BoardRequestCard key={submission.batchId} submission={submission} onOpen={() => openRequest(submission.batchId)} />
              ))}
            </div>
          )}
        </>
      )}

      <WithdrawDialog open={withdrawingBatchId !== null} onClose={cancelWithdraw} onConfirm={confirmWithdraw} />
    </div>
  );
}
