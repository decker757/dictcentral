// The HOD (Head of Department) portal — STAGE 2, the FINAL approval stage.
// Composition of the shared pieces every portal uses (PortalHeader/Footer,
// CatalogBrowser, CatalogRecordModals) plus useReviewQueue, shared with
// ApproverPortal (DGO) — see that hook for what it owns. HOD-specific
// behavior layered on top: the Catalog tab is read-only (no mutation
// handlers passed into useCatalogModals, and every open call forces
// `readOnly: true`), the review queue is scoped to requests a DGO has
// already approved, SubmissionCards/SubmissionDetailView/FocusModeView all
// get `showDgoReviewer`/`disableItemComments` so an HOD sees who submitted
// AND which DGO approved a request but never sees per-item comments or a
// Validate Fields button (DGO-only). Approving here is what actually
// commits a request's data into the catalog (see useCatalog.approveHod).

import { useState, useMemo } from 'react';
import { LogOut, Bell } from 'lucide-react';
import { SubjectArea, Entity, DataItem, ChangeRequest, Comment } from './types';
import { PortalHeader, PortalHeaderTab } from './components/PortalHeader';
import { PortalFooter } from './components/PortalFooter';
import { CatalogBrowser } from './components/CatalogBrowser';
import { ReviewQueueList } from './components/ReviewQueueList';
import { ReviewQueueBulkBar } from './components/ReviewQueueBulkBar';
import { CatalogRecordModals } from './components/shared/CatalogRecordModals';
import { SubmissionDetailView } from './components/SubmissionDetailView';
import { FocusModeView } from './components/FocusModeView';
import { RejectDialog } from './components/shared/RejectDialog';
import { useCatalogModals } from './hooks/useCatalogModals';
import { useReviewQueue } from './hooks/useReviewQueue';
import { groupRequestsByBatch, Submission } from './lib/submissions';

type Tab = 'home' | 'requests';

interface HODPortalProps {
  subjectAreas: SubjectArea[];
  requests: ChangeRequest[];
  onApproveHod: (batchId: string) => void;
  onReject: (batchId: string, reason: string) => void;
  onLeave: () => void;
  itemComments: Record<string, Comment[]>;
  batchComments: Record<string, Comment[]>;
  onAddBatchComment: (batchId: string, text: string) => void;
}

export function HODPortal({
  subjectAreas, requests, onApproveHod, onReject, onLeave,
  itemComments, batchComments, onAddBatchComment,
}: HODPortalProps) {
  const [tab, setTab] = useState<Tab>('home');

  // No mutation handlers — HODs can't create/edit/delete from the Catalog tab at all.
  const modals = useCatalogModals(subjectAreas);
  // Catalog tab: TreeView/TableView already know both Entity and SubjectArea.
  const openEntityReadOnly = (entity: Entity, subjectArea: SubjectArea) => modals.openEntity(entity, subjectArea, true);
  const openDataItemReadOnly = (dataItem: DataItem, entity: Entity, subjectArea: SubjectArea) =>
    modals.openDataItem(dataItem, entity, subjectArea, true);
  // Review-table / Focus Mode context rows only carry the Entity — resolve its SubjectArea first.
  const openEntityByIdReadOnly = (entity: Entity) => modals.openEntityById(entity, true);

  const allSubmissions = useMemo(() => groupRequestsByBatch(requests), [requests]);

  // An HOD only ever deals with requests that have already cleared DGO
  // review — anything still sitting at the DGO stage simply isn't theirs yet.
  const hodScopedSubmissions = useMemo(
    () => allSubmissions.filter(s => !!s.dgoReviewedBy),
    [allSubmissions],
  );
  const pendingSubmissions = hodScopedSubmissions.filter(s => s.status === 'pending' && s.stage === 'hod');
  const approvedSubmissions = hodScopedSubmissions.filter(s => s.status === 'approved');
  const rejectedSubmissions = hodScopedSubmissions.filter(s => s.status === 'rejected');

  const reviewQueue = useReviewQueue({
    requests, pendingSubmissions, approvedSubmissions, rejectedSubmissions,
    onApprove: onApproveHod, onReject,
    // HODs never comment on individual items — only onAddBatchComment is wired.
    onAddBatchComment,
    extraSearchText: s => s.dgoReviewedBy ?? '',
  });

  const openSubmission: Submission | undefined = reviewQueue.openBatchId
    ? allSubmissions.find(s => s.batchId === reviewQueue.openBatchId)
    : undefined;

  const switchTab = (next: Tab) => {
    setTab(next);
    reviewQueue.openDetail(null);
    reviewQueue.exitFocusMode();
  };

  const tabs: PortalHeaderTab<Tab>[] = [
    { key: 'home', label: 'Catalog' },
    {
      key: 'requests', label: 'Requests', icon: <Bell className="w-3.5 h-3.5" />,
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
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Leave
          </button>
        }
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-5 flex flex-col gap-5">
        {tab === 'home' && (
          <CatalogBrowser
            subjectAreas={subjectAreas}
            onEntityClick={openEntityReadOnly}
            onDataItemClick={openDataItemReadOnly}
            onAdvancedSearch={modals.openAdvancedSearch}
            readOnly
          />
        )}

        {tab === 'requests' && (
          <div className="flex flex-col gap-5 pb-12">
            {!openSubmission && !reviewQueue.focusMode && (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Change Requests</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Final approval — requests already approved by a DGO; approving here commits the change to the catalog
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
                onEntityClick={openEntityByIdReadOnly}
                onRowClick={modals.openRequestDetail}
                itemComments={itemComments}
                onAddItemComment={() => {}}
                batchComments={batchComments}
                onAddBatchComment={onAddBatchComment}
                isBatchBlocked={reviewQueue.isBatchBlocked}
                disableItemComments
              />
            ) : openSubmission ? (
              <SubmissionDetailView
                submission={openSubmission}
                subjectAreas={subjectAreas}
                onBack={() => reviewQueue.openDetail(null)}
                onApprove={() => reviewQueue.handleApproveOpen(openSubmission.batchId)}
                onReject={() => reviewQueue.handleRejectOpen(openSubmission.batchId)}
                onEntityClick={openEntityByIdReadOnly}
                onRowClick={modals.openRequestDetail}
                itemComments={itemComments}
                genericComments={batchComments[openSubmission.batchId] ?? []}
                genericDraft={reviewQueue.openGenericDraft}
                onGenericDraftChange={reviewQueue.setOpenGenericDraft}
                blocked={reviewQueue.isBatchBlocked(openSubmission.batchId)}
                disableItemComments
              />
            ) : (
              <ReviewQueueList
                queue={reviewQueue}
                pendingCount={pendingSubmissions.length}
                searchPlaceholder="Search requests by requester, DGO, or record name…"
                showDgoReviewer
                emptyPendingMessage="All caught up — no requests awaiting final approval"
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

      <PortalFooter label="HOD Portal" />

      <CatalogRecordModals subjectAreas={subjectAreas} modals={modals} />
    </div>
  );
}
