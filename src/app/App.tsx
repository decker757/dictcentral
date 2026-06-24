import { useState, useMemo } from 'react';
import { BookOpen, Plus, LayoutList, GitBranch, Edit2, LogOut, ClipboardList } from 'lucide-react';
import { SubjectArea, Entity, DataItem, ChangeRequest, RecordAttributes } from './types';
import { LandingPage } from './LandingPage';
import { ApproverPortal } from './ApproverPortal';
import { TreeView } from './components/TreeView';
import { TableView } from './components/TableView';
import { SearchBar } from './components/SearchBar';
import { EntityModal } from './components/modals/EntityModal';
import { DataItemModal } from './components/modals/DataItemModal';
import { AdvancedSearchModal } from './components/modals/AdvancedSearchModal';
import { CreateModal } from './components/modals/CreateModal';
import { EditModal } from './components/modals/EditModal';
import { RequestDetailModal } from './components/modals/RequestDetailModal';
import { BoardRequestCard } from './components/BoardRequestCard';
import { SubmissionDetailView } from './components/SubmissionDetailView';
import { ReviseSubmissionView } from './components/ReviseSubmissionView';
import { useCatalog } from './hooks/useCatalog';
import { countEntities, countDataItems, countMatches, findEntityById } from './lib/catalog';
import { CURRENT_BOARD_MEMBER } from './lib/constants';
import { TypeLegend } from './lib/badges';
import { groupRequestsByBatch, Submission } from './lib/submissions';
import { buildSubmissionCsv, downloadTextFile } from './lib/exportCsv';
import { Toaster } from 'sonner';

type Role = 'selection' | 'board' | 'approver';
type Tab = 'tree' | 'table';

type ModalState =
  | { type: 'entity'; entity: Entity; subjectArea: SubjectArea; readOnly?: boolean }
  | { type: 'dataItem'; dataItem: DataItem; entity: Entity; subjectArea: SubjectArea; readOnly?: boolean }
  | { type: 'advancedSearch' }
  | { type: 'create' }
  | { type: 'edit' }
  | { type: 'requestDetail'; request: ChangeRequest }
  | null;

export default function App() {
  const [role, setRole] = useState<Role>('selection');
  const {
    subjectAreas, requests,
    submitCreateEntity, submitCreateDataItem, submitEditEntity, submitEditDataItem,
    approve, reject, reviseAndResubmit,
    itemComments, addItemComment, batchComments, addBatchComment,
  } = useCatalog();
  const [activeTab, setActiveTab] = useState<Tab>('tree');
  const [boardTab, setBoardTab] = useState<'catalog' | 'requests'>('catalog');
  const [myReqFilter, setMyReqFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [openBoardBatchId, setOpenBoardBatchId] = useState<string | null>(null);
  const [revisingBatchId, setRevisingBatchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState<ModalState>(null);

  // Board submissions close the active modal after queuing the request.
  const handleCreateEntity = (saId: string, entity: Entity) => { submitCreateEntity(saId, entity); setModal(null); };
  const handleCreateDataItem = (entityId: string, di: DataItem) => { submitCreateDataItem(entityId, di); setModal(null); };
  const handleEditEntity = (entityId: string, updates: Partial<Entity>) => { submitEditEntity(entityId, updates); setModal(null); };
  const handleEditDataItem = (diId: string, updates: Partial<DataItem>) => { submitEditDataItem(diId, updates); setModal(null); };

  // ── Modal openers ────────────────────────────────────────────
  const openEntity = (entity: Entity, subjectArea: SubjectArea) =>
    setModal({ type: 'entity', entity, subjectArea });
  const openDataItem = (dataItem: DataItem, entity: Entity, subjectArea: SubjectArea) =>
    setModal({ type: 'dataItem', dataItem, entity, subjectArea });
  /** My Requests' table only has the Entity for an unchanged-entity context row — resolve its SubjectArea and open read-only (this is a history view, not an edit entry point). */
  const handleHierarchyEntityClick = (entity: Entity) => {
    const found = findEntityById(subjectAreas, entity.id);
    if (found) setModal({ type: 'entity', entity: found.entity, subjectArea: found.subjectArea, readOnly: true });
  };
  const openRequestDetail = (request: ChangeRequest) => setModal({ type: 'requestDetail', request });

  // ── Stats ────────────────────────────────────────────────────
  const totalEntities = countEntities(subjectAreas);
  const totalDataItems = countDataItems(subjectAreas);
  // Board members track *their own* submissions, not the global queue —
  // grouped into requests (one card per batchId), same unit the approver acts on.
  const myRequests = useMemo(() => requests.filter(r => r.submittedBy === CURRENT_BOARD_MEMBER), [requests]);
  const myAllSubmissions = useMemo(() => groupRequestsByBatch(myRequests), [myRequests]);
  const myPendingCount = myAllSubmissions.filter(s => s.status === 'pending').length;
  const myApprovedCount = myAllSubmissions.filter(s => s.status === 'approved').length;
  const myRejectedCount = myAllSubmissions.filter(s => s.status === 'rejected').length;
  const myFilteredSubmissions = useMemo(
    () => myAllSubmissions.filter(s => s.status === myReqFilter),
    [myAllSubmissions, myReqFilter],
  );
  const openBoardSubmission: Submission | undefined = openBoardBatchId
    ? myAllSubmissions.find(s => s.batchId === openBoardBatchId)
    : undefined;
  const handleExportSubmission = (submission: Submission) => {
    const csv = buildSubmissionCsv(submission.items, itemComments, batchComments[submission.batchId] ?? []);
    downloadTextFile(`request-${submission.batchId}.csv`, csv);
  };
  /** Open a board request: always lands on the read-only detail view, never mid-revise. */
  const openBoardRequest = (batchId: string | null) => { setOpenBoardBatchId(batchId); setRevisingBatchId(null); };
  const handleResubmit = (batchId: string, drafts: Record<string, Partial<RecordAttributes>>) => {
    reviseAndResubmit(batchId, drafts);
    setRevisingBatchId(null);
    setOpenBoardBatchId(null);
    setMyReqFilter('pending');
  };
  const treeMatchCount = useMemo(() => countMatches(subjectAreas, searchQuery), [subjectAreas, searchQuery]);

  // ── Role routing ─────────────────────────────────────────────
  if (role === 'selection') {
    return <LandingPage onSelectRole={r => setRole(r)} />;
  }

  if (role === 'approver') {
    return (
      <>
        <ApproverPortal
          subjectAreas={subjectAreas}
          requests={requests}
          onApprove={approve}
          onReject={reject}
          onLeave={() => setRole('selection')}
          itemComments={itemComments}
          onAddItemComment={addItemComment}
          batchComments={batchComments}
          onAddBatchComment={addBatchComment}
        />
        <Toaster richColors position="bottom-right" />
      </>
    );
  }

  // ── Board Member Portal ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                  Board Member
                </span>
              </div>
            </div>

            {/* Portal tabs — Catalog browse vs the member's own submitted requests */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
              <button
                onClick={() => setBoardTab('catalog')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  boardTab === 'catalog' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Catalog
              </button>
              <button
                onClick={() => setBoardTab('requests')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  boardTab === 'requests' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" /> My Requests
                {myPendingCount > 0 && (
                  <span className="w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{myPendingCount}</span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden xl:flex items-center gap-4 text-xs text-gray-500 mr-1">
                <span><span className="font-semibold text-gray-800">{subjectAreas.length}</span> Areas</span>
                <span><span className="font-semibold text-gray-800">{totalEntities}</span> Entities</span>
                <span><span className="font-semibold text-gray-800">{totalDataItems}</span> Data Items</span>
              </div>
              <button
                onClick={() => setModal({ type: 'edit' })}
                className="flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors shadow-sm"
              >
                <Edit2 className="w-4 h-4 text-orange-500" /> Edit
              </button>
              <button
                onClick={() => setModal({ type: 'create' })}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Create
              </button>
              <button
                onClick={() => setRole('selection')}
                className="flex items-center gap-1.5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Switch role"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Approval notice banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2">
        <div className="max-w-[1600px] mx-auto text-xs text-amber-700 flex items-center gap-2">
          <span className="w-3 h-3 bg-amber-500 rounded-full flex-shrink-0" />
          Your create and edit submissions are sent for approval before going live. Changes will appear in the catalog once an approver reviews them.
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-5 flex flex-col gap-5">
        {boardTab === 'catalog' && (
          <>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onAdvancedSearch={() => setModal({ type: 'advancedSearch' })}
              resultCount={searchQuery.trim() ? treeMatchCount : undefined}
              totalCount={totalDataItems}
            />

            <div className="flex items-center justify-between -mb-2 gap-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-700">
                  {activeTab === 'tree' ? 'Data Hierarchy' : 'All Data Items'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeTab === 'tree'
                    ? 'Click an Entity or Data Item to view details'
                    : 'Sorted by last updated · Click any row for details · Entity link opens entity view'}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {activeTab === 'tree' && <TypeLegend className="hidden lg:flex" />}
                {/* Tree / Table toggle — inline with the section it controls */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('tree')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'tree' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <GitBranch className="w-3.5 h-3.5" /> Tree View
                  </button>
                  <button
                    onClick={() => setActiveTab('table')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <LayoutList className="w-3.5 h-3.5" /> Table View
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'tree' && (
              <TreeView
                subjectAreas={subjectAreas}
                searchQuery={searchQuery}
                onEntityClick={openEntity}
                onDataItemClick={openDataItem}
              />
            )}
            {activeTab === 'table' && (
              <TableView
                subjectAreas={subjectAreas}
                searchQuery={searchQuery}
                onDataItemClick={openDataItem}
                onEntityClick={openEntity}
              />
            )}
          </>
        )}

        {boardTab === 'requests' && (
          <div className="flex flex-col gap-5 pb-12">
            {!openBoardSubmission && (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900">My Requests</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Track the status of the changes you submitted for approval</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 flex-shrink-0">
                  <span><span className="font-semibold text-amber-600">{myPendingCount}</span> pending</span>
                  <span><span className="font-semibold text-emerald-600">{myApprovedCount}</span> approved</span>
                  <span><span className="font-semibold text-red-600">{myRejectedCount}</span> rejected</span>
                </div>
              </div>
            )}

            {openBoardSubmission ? (
              revisingBatchId === openBoardSubmission.batchId ? (
                <ReviseSubmissionView
                  submission={openBoardSubmission}
                  subjectAreas={subjectAreas}
                  itemComments={itemComments}
                  genericComments={batchComments[openBoardSubmission.batchId] ?? []}
                  onBack={() => setRevisingBatchId(null)}
                  onResubmit={drafts => handleResubmit(openBoardSubmission.batchId, drafts)}
                />
              ) : (
                <SubmissionDetailView
                  submission={openBoardSubmission}
                  subjectAreas={subjectAreas}
                  onBack={() => openBoardRequest(null)}
                  onEntityClick={handleHierarchyEntityClick}
                  onRowClick={openRequestDetail}
                  itemComments={itemComments}
                  genericComments={batchComments[openBoardSubmission.batchId] ?? []}
                  readOnly
                  onExport={() => handleExportSubmission(openBoardSubmission)}
                  onEdit={openBoardSubmission.status === 'rejected' ? () => setRevisingBatchId(openBoardSubmission.batchId) : undefined}
                />
              )
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {(['pending', 'approved', 'rejected'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setMyReqFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                        myReqFilter === f
                          ? 'bg-gray-900 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {f}
                      {f === 'pending' && myPendingCount > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">{myPendingCount}</span>
                      )}
                    </button>
                  ))}
                </div>

                {myFilteredSubmissions.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    <div className="text-sm font-medium capitalize">No {myReqFilter} requests</div>
                    <div className="text-xs mt-1">
                      {myReqFilter === 'pending'
                        ? 'Nothing awaiting approval — use Create or Edit to submit a change'
                        : `You have no ${myReqFilter} requests yet`}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {myFilteredSubmissions.map(submission => (
                      <BoardRequestCard
                        key={submission.batchId}
                        submission={submission}
                        onOpen={() => openBoardRequest(submission.batchId)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between text-xs text-gray-400">
          <span>DictCentral · Board Member Portal</span>
          <button onClick={() => setRole('selection')} className="hover:text-gray-600 transition-colors flex items-center gap-1">
            <LogOut className="w-3 h-3" /> Switch role
          </button>
        </div>
      </footer>

      {/* Modals */}
      {modal?.type === 'entity' && (
        <EntityModal
          entity={modal.entity}
          subjectArea={modal.subjectArea}
          onClose={() => setModal(null)}
          onDataItemClick={(di, e, sa) => setModal({ type: 'dataItem', dataItem: di, entity: e, subjectArea: sa, readOnly: modal.readOnly })}
          onUpdate={modal.readOnly ? () => {} : handleEditEntity}
          readOnly={modal.readOnly}
        />
      )}
      {modal?.type === 'dataItem' && (
        <DataItemModal
          dataItem={modal.dataItem}
          entity={modal.entity}
          subjectArea={modal.subjectArea}
          onClose={() => setModal(null)}
          onEntityClick={(e, sa) => setModal({ type: 'entity', entity: e, subjectArea: sa, readOnly: modal.readOnly })}
          onUpdate={modal.readOnly ? () => {} : handleEditDataItem}
          readOnly={modal.readOnly}
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
      {modal?.type === 'create' && (
        <CreateModal
          subjectAreas={subjectAreas}
          onClose={() => setModal(null)}
          onCreateEntity={handleCreateEntity}
          onCreateDataItem={handleCreateDataItem}
        />
      )}
      {modal?.type === 'edit' && (
        <EditModal
          subjectAreas={subjectAreas}
          onClose={() => setModal(null)}
          onUpdateEntity={handleEditEntity}
          onUpdateDataItem={handleEditDataItem}
        />
      )}
      {modal?.type === 'requestDetail' && (
        <RequestDetailModal
          request={modal.request}
          onClose={() => setModal(null)}
        />
      )}

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
