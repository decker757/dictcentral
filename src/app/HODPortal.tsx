// The HOD (Head of Department) portal — STAGE 2, the FINAL approval stage.
// An HOD only ever sees requests a DGO has already approved (dgoReviewedBy
// set) — their queue is requests currently at the 'hod' stage. Approving
// here is what actually commits the request's data into the catalog (see
// useCatalog.approveHod). HODs have a read-only Catalog tab (they cannot
// request to create/edit/delete entities or data items) and, unlike DGOs,
// can't comment on individual entities/data items in the review table —
// only the generic, whole-request comment — and don't need a "Validate
// Fields" button (a DGO already did that). The Requests list and detail
// view both surface who submitted the request AND which DGO approved it.

import { useState, useMemo } from 'react';
import { BookOpen, GitBranch, LayoutList, LogOut, Bell, Check, Search, Play } from 'lucide-react';
import { SubjectArea, Entity, DataItem, ChangeRequest, Comment } from './types';
import { TreeView } from './components/TreeView';
import { TableView } from './components/TableView';
import { SearchBar } from './components/SearchBar';
import { EntityModal } from './components/modals/EntityModal';
import { DataItemModal } from './components/modals/DataItemModal';
import { AdvancedSearchModal } from './components/modals/AdvancedSearchModal';
import { SubmissionCard } from './components/SubmissionCard';
import { SubmissionDetailView } from './components/SubmissionDetailView';
import { FocusModeView } from './components/FocusModeView';
import { RequestDetailModal } from './components/modals/RequestDetailModal';
import { RejectDialog } from './components/shared/RejectDialog';
import { countDataItems, countMatches, findEntityById } from './lib/catalog';
import { TypeLegend } from './lib/badges';
import { groupRequestsByBatch, Submission } from './lib/submissions';
import { ApproveButton, RejectButton } from './components/ui/ActionButton';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

type Tab = 'home' | 'requests';
type HomeView = 'tree' | 'table';

type ModalState =
  | { type: 'entity'; entity: Entity; subjectArea: SubjectArea }
  | { type: 'dataItem'; dataItem: DataItem; entity: Entity; subjectArea: SubjectArea }
  | { type: 'advancedSearch' }
  | { type: 'requestDetail'; request: ChangeRequest }
  | null;

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
  const [homeView, setHomeView] = useState<HomeView>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [reqFilter, setReqFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const [openBatchId, setOpenBatchId] = useState<string | null>(null);
  // HOD only ever uses the GENERIC draft — no per-item commenting.
  const [openGenericDraft, setOpenGenericDraft] = useState('');

  const openSubmissionView = (batchId: string | null) => {
    setOpenBatchId(batchId);
    setOpenGenericDraft('');
  };

  const flushOpenDrafts = (batchId: string) => {
    if (openGenericDraft.trim()) onAddBatchComment(batchId, openGenericDraft);
    setOpenGenericDraft('');
  };

  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());

  const [listSearch, setListSearch] = useState('');
  const [listTypeFilter, setListTypeFilter] = useState<'all' | 'create' | 'edit' | 'delete'>('all');
  const [listSaFilter, setListSaFilter] = useState('');

  const [focusMode, setFocusMode] = useState(false);
  const [focusQueueIds, setFocusQueueIds] = useState<string[]>([]);

  const [rejectingBatchIds, setRejectingBatchIds] = useState<string[] | null>(null);

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

  const displaySubmissions = useMemo(() => {
    if (reqFilter === 'approved') return approvedSubmissions;
    if (reqFilter === 'rejected') return rejectedSubmissions;
    return pendingSubmissions;
  }, [reqFilter, pendingSubmissions, approvedSubmissions, rejectedSubmissions]);

  const filteredSubmissions = useMemo(() => {
    const term = listSearch.toLowerCase().trim();
    return displaySubmissions.filter(s => {
      if (term) {
        const nameMatch = s.items.some(r => (r.proposedData as Entity | DataItem).name.toLowerCase().includes(term));
        const byMatch = s.submittedBy.toLowerCase().includes(term) || (s.dgoReviewedBy ?? '').toLowerCase().includes(term);
        if (!nameMatch && !byMatch) return false;
      }
      if (listTypeFilter !== 'all' && !s.items.some(r => r.type === listTypeFilter)) return false;
      if (listSaFilter && !s.subjectAreaNames.includes(listSaFilter)) return false;
      return true;
    });
  }, [displaySubmissions, listSearch, listTypeFilter, listSaFilter]);

  const subjectAreaNames = useMemo(
    () => Array.from(new Set(requests.map(r => r.subjectAreaName))),
    [requests]
  );

  const totalDataItems = countDataItems(subjectAreas);
  const treeMatchCount = useMemo(() => countMatches(subjectAreas, searchQuery), [subjectAreas, searchQuery]);

  const openEntity = (entity: Entity, subjectArea: SubjectArea) =>
    setModal({ type: 'entity', entity, subjectArea });
  const openDataItem = (dataItem: DataItem, entity: Entity, subjectArea: SubjectArea) =>
    setModal({ type: 'dataItem', dataItem, entity, subjectArea });
  const handleHierarchyEntityClick = (entity: Entity) => {
    const found = findEntityById(subjectAreas, entity.id);
    if (found) openEntity(found.entity, found.subjectArea);
  };
  const openRequestDetail = (request: ChangeRequest) => setModal({ type: 'requestDetail', request });

  // Same cross-request dependency guard as the DGO queue — a request can
  // depend on an entity that's itself still pending elsewhere.
  const isBatchBlocked = (batchId: string) => {
    const items = requests.filter(r => r.batchId === batchId);
    return items.some(req => {
      if (!(req.type === 'create' && req.recordType === 'dataitem')) return false;
      return requests.some(r =>
        r.batchId !== batchId &&
        r.type === 'create' && r.recordType === 'entity' && r.status === 'pending' &&
        r.proposedData.id === req.parentEntityId
      );
    });
  };

  const orderedPendingBatchIds = useMemo(() => pendingSubmissions.map(s => s.batchId), [pendingSubmissions]);

  const allDisplayPendingBatchIds = filteredSubmissions.filter(s => s.status === 'pending').map(s => s.batchId);
  const allSelected = allDisplayPendingBatchIds.length > 0 && allDisplayPendingBatchIds.every(id => selectedBatchIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) setSelectedBatchIds(new Set());
    else setSelectedBatchIds(new Set(allDisplayPendingBatchIds));
  };

  const toggleSelect = (batchId: string) => {
    const next = new Set(selectedBatchIds);
    if (next.has(batchId)) next.delete(batchId);
    else next.add(batchId);
    setSelectedBatchIds(next);
  };

  const handleApprove = (batchId: string) => {
    onApproveHod(batchId);
    setSelectedBatchIds(prev => { const n = new Set(prev); n.delete(batchId); return n; });
    if (openBatchId === batchId) openSubmissionView(null);
  };

  const handleApproveOpen = (batchId: string) => {
    flushOpenDrafts(batchId);
    handleApprove(batchId);
  };

  const handleBulkApprove = () => {
    const ids = Array.from(selectedBatchIds);
    const ordered = [...ids].sort((a, b) => (isBatchBlocked(a) ? 1 : 0) - (isBatchBlocked(b) ? 1 : 0));
    for (const id of ordered) {
      if (isBatchBlocked(id)) continue;
      onApproveHod(id);
    }
    setSelectedBatchIds(new Set());
  };

  const handleOpenRejectDialog = (batchIds: string[]) => setRejectingBatchIds(batchIds);

  const handleRejectOpen = (batchId: string) => {
    flushOpenDrafts(batchId);
    handleOpenRejectDialog([batchId]);
  };

  const confirmReject = (reason: string) => {
    if (!rejectingBatchIds) return;
    rejectingBatchIds.forEach(id => onReject(id, reason));
    setRejectingBatchIds(null);
    setSelectedBatchIds(new Set());
    if (rejectingBatchIds.includes(openBatchId ?? '')) openSubmissionView(null);
  };

  const enterFocusMode = () => {
    if (orderedPendingBatchIds.length === 0) return;
    setFocusQueueIds(orderedPendingBatchIds);
    setFocusMode(true);
  };

  const openSubmission: Submission | undefined = openBatchId
    ? allSubmissions.find(s => s.batchId === openBatchId)
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex items-center justify-between h-14 gap-4">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-gray-900 tracking-tight">DictCentral</span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
              <button
                onClick={() => setTab('home')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === 'home' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Catalog
              </button>
              <button
                onClick={() => { setTab('requests'); openSubmissionView(null); setFocusMode(false); }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors relative ${
                  tab === 'requests' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                Requests
                {pendingSubmissions.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendingSubmissions.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onLeave}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" /> Leave
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-5 flex flex-col gap-5">
        {tab === 'home' && (
          <>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onAdvancedSearch={() => setModal({ type: 'advancedSearch' })}
              resultCount={searchQuery.trim() ? treeMatchCount : undefined}
              totalCount={totalDataItems}
            />

            <div className="-mb-2 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-700">
                  {homeView === 'tree' ? 'Data Hierarchy' : 'All Data Items'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {homeView === 'tree'
                    ? 'Read-only view · Expand an entity to browse its data items · click Details or a data item for full metadata'
                    : 'Read-only view · Click any row to inspect its full metadata'}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {homeView === 'tree' && <TypeLegend className="hidden lg:flex" />}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setHomeView('tree')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      homeView === 'tree' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <GitBranch className="w-3.5 h-3.5" /> Tree
                  </button>
                  <button
                    onClick={() => setHomeView('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      homeView === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <LayoutList className="w-3.5 h-3.5" /> Table
                  </button>
                </div>
              </div>
            </div>

            {homeView === 'tree' && (
              <TreeView
                subjectAreas={subjectAreas}
                searchQuery={searchQuery}
                onEntityClick={openEntity}
                onDataItemClick={openDataItem}
              />
            )}
            {homeView === 'table' && (
              <TableView
                subjectAreas={subjectAreas}
                searchQuery={searchQuery}
                onDataItemClick={openDataItem}
                onEntityClick={openEntity}
              />
            )}
          </>
        )}

        {tab === 'requests' && (
          <div className="flex flex-col gap-5 pb-12">
            {!openBatchId && !focusMode && (
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

            {focusMode ? (
              <FocusModeView
                queueIds={focusQueueIds}
                requests={requests}
                subjectAreas={subjectAreas}
                onApprove={handleApprove}
                onReject={onReject}
                onExit={() => setFocusMode(false)}
                onEntityClick={handleHierarchyEntityClick}
                onRowClick={openRequestDetail}
                itemComments={itemComments}
                onAddItemComment={() => {}}
                batchComments={batchComments}
                onAddBatchComment={onAddBatchComment}
                isBatchBlocked={isBatchBlocked}
                disableItemComments
              />
            ) : openSubmission ? (
              <SubmissionDetailView
                submission={openSubmission}
                subjectAreas={subjectAreas}
                onBack={() => openSubmissionView(null)}
                onApprove={() => handleApproveOpen(openSubmission.batchId)}
                onReject={() => handleRejectOpen(openSubmission.batchId)}
                onEntityClick={handleHierarchyEntityClick}
                onRowClick={openRequestDetail}
                itemComments={itemComments}
                genericComments={batchComments[openSubmission.batchId] ?? []}
                genericDraft={openGenericDraft}
                onGenericDraftChange={setOpenGenericDraft}
                blocked={isBatchBlocked(openSubmission.batchId)}
                disableItemComments
              />
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    {(['pending', 'approved', 'rejected'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setReqFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                          reqFilter === f
                            ? 'bg-gray-900 text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {f}
                        {f === 'pending' && pendingSubmissions.length > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                            {pendingSubmissions.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={enterFocusMode}
                    disabled={orderedPendingBatchIds.length === 0}
                    className="inline-flex items-center justify-center gap-2 h-9 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    <Play className="w-4 h-4" /> Review Pending
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      value={listSearch}
                      onChange={e => setListSearch(e.target.value)}
                      placeholder="Search requests by requester, DGO, or record name…"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <select
                    value={listTypeFilter}
                    onChange={e => setListTypeFilter(e.target.value as 'all' | 'create' | 'edit' | 'delete')}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                  >
                    <option value="all">All types</option>
                    <option value="create">Create</option>
                    <option value="edit">Edit</option>
                    <option value="delete">Delete</option>
                  </select>
                  <select
                    value={listSaFilter}
                    onChange={e => setListSaFilter(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                  >
                    <option value="">All subject areas</option>
                    {subjectAreaNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>

                  {allDisplayPendingBatchIds.length > 0 && (
                    <div className="flex items-center gap-2 ml-auto">
                      <CheckboxPrimitive.Root
                        id="select-all-pending"
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        className="w-4 h-4 rounded border border-gray-300 bg-white flex items-center justify-center data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      >
                        <CheckboxPrimitive.Indicator>
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </CheckboxPrimitive.Indicator>
                      </CheckboxPrimitive.Root>
                      <label htmlFor="select-all-pending" className="text-sm font-medium text-gray-700 cursor-pointer whitespace-nowrap">
                        Select all {allDisplayPendingBatchIds.length} pending
                      </label>
                    </div>
                  )}
                </div>

                {filteredSubmissions.length === 0 && (
                  <div className="text-center py-20 text-gray-400">
                    <Bell className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    <div className="text-sm font-medium">No matching requests</div>
                    <div className="text-xs mt-1">
                      {reqFilter === 'pending'
                        ? 'All caught up — no requests awaiting final approval'
                        : 'Try adjusting your search or filters'}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2.5">
                  {filteredSubmissions.map(submission => (
                    <SubmissionCard
                      key={submission.batchId}
                      submission={submission}
                      onOpen={() => openSubmissionView(submission.batchId)}
                      selected={selectedBatchIds.has(submission.batchId)}
                      onToggleSelect={() => toggleSelect(submission.batchId)}
                      showDgoReviewer
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Sticky Bottom Action Bar */}
      {selectedBatchIds.size > 0 && tab === 'requests' && !focusMode && !openBatchId && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 animate-in slide-in-from-bottom-2">
          <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-700">
              {selectedBatchIds.size} selected request(s)
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedBatchIds(new Set())}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Clear
              </button>
              <RejectButton size="md" variant="solid" onClick={() => handleOpenRejectDialog(Array.from(selectedBatchIds))}>
                Reject Selected
              </RejectButton>
              <ApproveButton size="md" onClick={handleBulkApprove}>
                Approve Selected
              </ApproveButton>
            </div>
          </div>
        </div>
      )}

      <RejectDialog
        open={rejectingBatchIds !== null}
        count={rejectingBatchIds?.length ?? 1}
        onClose={() => setRejectingBatchIds(null)}
        onConfirm={confirmReject}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-auto relative z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-3 text-xs text-gray-400">
          <span>DictCentral · HOD Portal</span>
        </div>
      </footer>

      {/* Modals — read-only: HODs cannot request to create/edit/delete catalog records */}
      {modal?.type === 'entity' && (
        <EntityModal
          entity={modal.entity}
          subjectArea={modal.subjectArea}
          onClose={() => setModal(null)}
          onDataItemClick={(di, e, sa) => setModal({ type: 'dataItem', dataItem: di, entity: e, subjectArea: sa })}
          onUpdate={() => {}}
          readOnly
        />
      )}
      {modal?.type === 'dataItem' && (
        <DataItemModal
          dataItem={modal.dataItem}
          entity={modal.entity}
          subjectArea={modal.subjectArea}
          onClose={() => setModal(null)}
          onEntityClick={(e, sa) => setModal({ type: 'entity', entity: e, subjectArea: sa })}
          onUpdate={() => {}}
          readOnly
        />
      )}
      {modal?.type === 'advancedSearch' && (
        <AdvancedSearchModal
          subjectAreas={subjectAreas}
          onClose={() => setModal(null)}
          onDataItemClick={(di, e, sa) => { setModal(null); setTimeout(() => openDataItem(di, e, sa), 50); }}
          onEntityClick={(e, sa) => { setModal(null); setTimeout(() => openEntity(e, sa), 50); }}
          initialFilters={searchQuery ? { businessName: searchQuery } : undefined}
        />
      )}
      {modal?.type === 'requestDetail' && (
        <RequestDetailModal
          request={modal.request}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
