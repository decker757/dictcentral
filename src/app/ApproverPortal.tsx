// The DGO (Data Governance Officer) portal — STAGE 1 of the two-stage review
// pipeline. Composition of the same shared pieces every portal uses
// (PortalHeader/Footer, CatalogBrowser, CatalogRecordModals), PLUS the two
// hooks BoardPortal also uses for its own tabs: useMyRequests (a DGO is a
// requester too — self-approval prevention keeps their own pending
// submission out of the queue below, tracked here instead) and
// useReviewQueue (shared with HODPortal — see that hook for what it owns).
// On top of those shared pieces, this file adds what's DGO-specific:
// "Validate Fields" (soft-warning panel, lib/validation.ts) and the
// "Approve & Forward to HOD" framing, since a DGO's approval here never
// commits anything to the catalog by itself — only an HOD's approval does
// (see useCatalog.approveDgo).

import { useState, useMemo } from 'react';
import { Plus, Edit2, LogOut, ClipboardList, Bell } from 'lucide-react';
import { SubjectArea, Entity, DataItem, ChangeRequest, Comment, RecordAttributes } from './types';
import { PortalHeader, PortalHeaderTab } from './components/PortalHeader';
import { PortalFooter } from './components/PortalFooter';
import { CatalogBrowser } from './components/CatalogBrowser';
import { MyRequestsPanel } from './components/MyRequestsPanel';
import { ReviewQueueList } from './components/ReviewQueueList';
import { ReviewQueueBulkBar } from './components/ReviewQueueBulkBar';
import { CatalogRecordModals } from './components/shared/CatalogRecordModals';
import { SubmissionDetailView } from './components/SubmissionDetailView';
import { FocusModeView } from './components/FocusModeView';
import { ValidateFieldsModal } from './components/modals/ValidateFieldsModal';
import { RejectDialog } from './components/shared/RejectDialog';
import { useCatalogModals } from './hooks/useCatalogModals';
import { useMyRequests } from './hooks/useMyRequests';
import { useReviewQueue } from './hooks/useReviewQueue';
import { RequestOpts } from './hooks/useCatalog';
import { CURRENT_DGO } from './lib/constants';
import { groupRequestsByBatch, Submission } from './lib/submissions';

type Tab = 'home' | 'myRequests' | 'requests';

interface ApproverPortalProps {
  subjectAreas: SubjectArea[];
  requests: ChangeRequest[];
  onApproveDgo: (batchId: string) => void;
  onReject: (batchId: string, reason: string) => void;
  onLeave: () => void;
  itemComments: Record<string, Comment[]>;
  onAddItemComment: (requestId: string, text: string) => void;
  batchComments: Record<string, Comment[]>;
  onAddBatchComment: (batchId: string, text: string) => void;
  onSubmitCreateEntity: (subjectAreaId: string, entity: Entity, opts?: RequestOpts) => void;
  onSubmitCreateDataItem: (entityId: string, dataItem: DataItem, opts?: RequestOpts) => void;
  onSubmitEditEntity: (entityId: string, updates: Partial<Entity>, opts?: RequestOpts) => void;
  onSubmitEditDataItem: (dataItemId: string, updates: Partial<DataItem>, opts?: RequestOpts) => void;
  onSubmitDeleteEntity: (entityId: string, opts?: RequestOpts) => void;
  onSubmitDeleteDataItem: (dataItemId: string, opts?: RequestOpts) => void;
  onReviseAndResubmit: (batchId: string, drafts: Record<string, Partial<RecordAttributes>>) => void;
  onWithdraw: (batchId: string) => void;
}

export function ApproverPortal({
  subjectAreas, requests, onApproveDgo, onReject, onLeave,
  itemComments, onAddItemComment, batchComments, onAddBatchComment,
  onSubmitCreateEntity, onSubmitCreateDataItem, onSubmitEditEntity, onSubmitEditDataItem,
  onSubmitDeleteEntity, onSubmitDeleteDataItem, onReviseAndResubmit, onWithdraw,
}: ApproverPortalProps) {
  const [tab, setTab] = useState<Tab>('home');
  const [validatingBatchId, setValidatingBatchId] = useState<string | null>(null);

  const modals = useCatalogModals(subjectAreas, {
    onSubmitCreateEntity, onSubmitCreateDataItem, onSubmitEditEntity, onSubmitEditDataItem,
    onSubmitDeleteEntity, onSubmitDeleteDataItem,
  }, 'dgo');

  const myRequests = useMyRequests({
    requests, submittedBy: CURRENT_DGO, itemComments, batchComments,
    onReviseAndResubmit, onWithdraw,
  });

  const allSubmissions = useMemo(() => groupRequestsByBatch(requests), [requests]);

  // ── Self-approval prevention ─────────────────────────────────────
  // A DGO can submit their own create/edit/delete requests from the catalog,
  // but must never see (let alone act on) their own request while it's
  // sitting at the DGO stage — it's routed to "another DGO" instead (and
  // tracked, meanwhile, in the My Requests tab above). Once a DGO's own
  // request has moved past the DGO stage (or resolved), there's no
  // self-approval risk left, so it's fine to keep it visible here too.
  const visibleSubmissions = useMemo(
    () => allSubmissions.filter(s => !(s.submittedBy === CURRENT_DGO && s.stage === 'dgo' && s.status === 'pending')),
    [allSubmissions],
  );
  const pendingSubmissions = visibleSubmissions.filter(s => s.status === 'pending' && s.stage === 'dgo');
  // "Approved" here means "approved BY ME" — forwarded to HOD (or since fully
  // resolved by HOD) — not just any submission with status 'approved'.
  const approvedSubmissions = visibleSubmissions.filter(s => s.dgoReviewedBy === CURRENT_DGO);
  const rejectedSubmissions = visibleSubmissions.filter(s => s.status === 'rejected');

  const reviewQueue = useReviewQueue({
    requests, pendingSubmissions, approvedSubmissions, rejectedSubmissions,
    onApprove: onApproveDgo, onReject, onAddItemComment, onAddBatchComment,
  });

  const openSubmission: Submission | undefined = reviewQueue.openBatchId
    ? allSubmissions.find(s => s.batchId === reviewQueue.openBatchId)
    : undefined;
  const validatingSubmission: Submission | undefined = validatingBatchId
    ? allSubmissions.find(s => s.batchId === validatingBatchId)
    : undefined;

  const switchTab = (next: Tab) => {
    setTab(next);
    reviewQueue.openDetail(null);
    myRequests.openRequest(null);
    reviewQueue.exitFocusMode();
  };

  const tabs: PortalHeaderTab<Tab>[] = [
    { key: 'home', label: 'Catalog' },
    {
      key: 'myRequests', label: 'My Requests', icon: <ClipboardList className="w-3.5 h-3.5" />,
      badge: { count: myRequests.pendingCount, variant: 'inline' },
    },
    {
      key: 'requests', label: 'Review Requests', icon: <Bell className="w-3.5 h-3.5" />,
      badge: { count: pendingSubmissions.length, variant: 'corner' },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative pb-20">
      <PortalHeader
        activeTab={tab}
        onTabChange={switchTab}
        tabs={tabs}
        actions={
          <>
            <button
              onClick={modals.openEditModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors shadow-sm"
            >
              <Edit2 className="w-4 h-4 text-orange-500" /> Edit
            </button>
            <button
              onClick={modals.openCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Create
            </button>
            <button
              onClick={onLeave}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" /> Leave
            </button>
          </>
        }
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-5 flex flex-col gap-5">
        {tab === 'home' && (
          <CatalogBrowser
            subjectAreas={subjectAreas}
            onEntityClick={modals.openEntity}
            onDataItemClick={modals.openDataItem}
            onAdvancedSearch={modals.openAdvancedSearch}
          />
        )}

        {tab === 'myRequests' && (
          <MyRequestsPanel
            subjectAreas={subjectAreas}
            myRequests={myRequests}
            itemComments={itemComments}
            batchComments={batchComments}
            onEntityClick={entity => modals.openEntityById(entity, true)}
            onRowClick={modals.openRequestDetail}
          />
        )}

        {tab === 'requests' && (
          <div className="flex flex-col gap-5 pb-12">
            {!openSubmission && !reviewQueue.focusMode && (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Review Requests</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    DGO review — each request bundles every entity/data-item change submitted together; approving forwards it to an HOD for final approval
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span><span className="font-semibold text-amber-600">{pendingSubmissions.length}</span> pending</span>
                  <span><span className="font-semibold text-emerald-600">{approvedSubmissions.length}</span> approved</span>
                  <span><span className="font-semibold text-red-600">{rejectedSubmissions.length}</span> rejected</span>
                </div>
              </div>
            )}

            {reviewQueue.focusMode ? (
              <FocusModeView
                queueIds={reviewQueue.focusQueueIds}
                requests={requests}
                subjectAreas={subjectAreas}
                onApprove={reviewQueue.handleApprove}
                onReject={onReject}
                onExit={reviewQueue.exitFocusMode}
                onEntityClick={modals.openEntityById}
                onRowClick={modals.openRequestDetail}
                itemComments={itemComments}
                onAddItemComment={onAddItemComment}
                batchComments={batchComments}
                onAddBatchComment={onAddBatchComment}
                isBatchBlocked={reviewQueue.isBatchBlocked}
                approveLabel={s => s.pipeline === 'one-stage' ? 'Approve & Apply' : 'Approve & Forward to HOD'}
              />
            ) : openSubmission ? (
              <SubmissionDetailView
                submission={openSubmission}
                subjectAreas={subjectAreas}
                onBack={() => reviewQueue.openDetail(null)}
                onApprove={() => reviewQueue.handleApproveOpen(openSubmission.batchId)}
                onReject={() => reviewQueue.handleRejectOpen(openSubmission.batchId)}
                onValidate={() => setValidatingBatchId(openSubmission.batchId)}
                approveLabel={openSubmission.pipeline === 'one-stage' ? 'Approve & Apply' : 'Approve & Forward to HOD'}
                onEntityClick={modals.openEntityById}
                onRowClick={modals.openRequestDetail}
                itemComments={itemComments}
                genericComments={batchComments[openSubmission.batchId] ?? []}
                itemDrafts={reviewQueue.openItemDrafts}
                onItemDraftChange={(requestId, text) => reviewQueue.setOpenItemDrafts(prev => ({ ...prev, [requestId]: text }))}
                genericDraft={reviewQueue.openGenericDraft}
                onGenericDraftChange={reviewQueue.setOpenGenericDraft}
                blocked={reviewQueue.isBatchBlocked(openSubmission.batchId)}
              />
            ) : (
              <ReviewQueueList
                queue={reviewQueue}
                pendingCount={pendingSubmissions.length}
                searchPlaceholder="Search requests by requester or record name…"
              />
            )}
          </div>
        )}
      </main>

      {reviewQueue.selectedBatchIds.size > 0 && tab === 'requests' && !reviewQueue.focusMode && !reviewQueue.openBatchId && (
        <ReviewQueueBulkBar
          count={reviewQueue.selectedBatchIds.size}
          onClear={reviewQueue.clearSelection}
          onRejectSelected={() => reviewQueue.openRejectDialog(Array.from(reviewQueue.selectedBatchIds))}
          onApproveSelected={reviewQueue.handleBulkApprove}
        />
      )}

      <RejectDialog
        open={reviewQueue.rejectingBatchIds !== null}
        count={reviewQueue.rejectingBatchIds?.length ?? 1}
        onClose={reviewQueue.closeRejectDialog}
        onConfirm={reviewQueue.confirmReject}
      />

      <PortalFooter label="DGO Portal" />

      <CatalogRecordModals subjectAreas={subjectAreas} modals={modals} />

      {validatingSubmission && (
        <ValidateFieldsModal items={validatingSubmission.items} onClose={() => setValidatingBatchId(null)} />
      )}
    </div>
  );
}
