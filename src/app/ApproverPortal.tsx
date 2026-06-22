import { useState, useMemo } from 'react';
import { BookOpen, CheckSquare, GitBranch, LayoutList, LogOut, Bell, Check, Search, Play, Rows3, Table2 } from 'lucide-react';
import { SubjectArea, Entity, DataItem, ChangeRequest } from './types';
import { TreeView } from './components/TreeView';
import { TableView } from './components/TableView';
import { SearchBar } from './components/SearchBar';
import { EntityModal } from './components/modals/EntityModal';
import { DataItemModal } from './components/modals/DataItemModal';
import { AdvancedSearchModal } from './components/modals/AdvancedSearchModal';
import { RequestDetailModal } from './components/modals/RequestDetailModal';
import { RequestGroupList } from './components/shared/RequestGroupList';
import { HierarchyRequestTable } from './components/shared/HierarchyRequestTable';
import { FocusModeView } from './components/FocusModeView';
import { RejectDialog } from './components/shared/RejectDialog';
import { countDataItems, countMatches, findEntityById } from './lib/catalog';
import { TypeLegend } from './lib/badges';
import { groupRequestsBySubjectArea } from './lib/requestGroups';
import { ApproveButton, RejectButton } from './components/ui/ActionButton';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { toast } from 'sonner';

type Tab = 'home' | 'requests';
type HomeView = 'tree' | 'table';
type RequestsView = 'card' | 'table';

type ModalState =
  | { type: 'entity'; entity: Entity; subjectArea: SubjectArea }
  | { type: 'dataItem'; dataItem: DataItem; entity: Entity; subjectArea: SubjectArea }
  | { type: 'advancedSearch' }
  | { type: 'requestDetail'; request: ChangeRequest }
  | null;

interface ApproverPortalProps {
  subjectAreas: SubjectArea[];
  requests: ChangeRequest[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string, reason: string) => void;
  onLeave: () => void;
}

export function ApproverPortal({
  subjectAreas, requests, onApprove, onReject, onLeave,
}: ApproverPortalProps) {
  const [tab, setTab] = useState<Tab>('home');
  const [homeView, setHomeView] = useState<HomeView>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [reqFilter, setReqFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // List controls
  const [listSearch, setListSearch] = useState('');
  const [listTypeFilter, setListTypeFilter] = useState<'all' | 'create' | 'edit'>('all');
  const [listSaFilter, setListSaFilter] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Requests tab: hierarchical Excel-style table (default) vs the grouped card view.
  const [reqViewMode, setReqViewMode] = useState<RequestsView>('table');

  // Focus mode
  const [focusMode, setFocusMode] = useState(false);
  const [focusQueueIds, setFocusQueueIds] = useState<string[]>([]);

  // Reject dialog state (which requests are being rejected; reason lives in RejectDialog)
  const [rejectingIds, setRejectingIds] = useState<string[] | null>(null);

  const pending = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved');
  const rejected = requests.filter(r => r.status === 'rejected');

  const displayRequests = useMemo(() => {
    if (reqFilter === 'approved') return approved;
    if (reqFilter === 'rejected') return rejected;
    return pending;
  }, [reqFilter, pending, approved, rejected]);

  // Apply list search + type + subject-area filters
  const filteredDisplayRequests = useMemo(() => {
    const term = listSearch.toLowerCase().trim();
    return displayRequests.filter(r => {
      const name = (r.proposedData as Entity | DataItem).name.toLowerCase();
      if (term && !name.includes(term)) return false;
      if (listTypeFilter !== 'all' && r.type !== listTypeFilter) return false;
      if (listSaFilter && r.subjectAreaName !== listSaFilter) return false;
      return true;
    });
  }, [displayRequests, listSearch, listTypeFilter, listSaFilter]);

  // Hierarchical table view groups by subject area → parent entity → child
  // data items (same grouping the card view uses), computed once below.

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
  /** Hierarchy table's "unchanged entity" context row only has the Entity, not its SubjectArea — resolve it. */
  const handleHierarchyEntityClick = (entity: Entity) => {
    const found = findEntityById(subjectAreas, entity.id);
    if (found) openEntity(found.entity, found.subjectArea);
  };

  // ── Hierarchy & Guards ────────────────────────────────────────

  const isParentPendingNew = (req: ChangeRequest) => {
    if (req.type !== 'create' || req.recordType !== 'dataitem') return false;
    return requests.some(r =>
      r.type === 'create' &&
      r.recordType === 'entity' &&
      r.status === 'pending' &&
      r.proposedData.id === req.parentEntityId
    );
  };

  const getPendingChildrenCount = (entityId: string) => {
    return requests.filter(r =>
      r.status === 'pending' &&
      r.type === 'create' &&
      r.recordType === 'dataitem' &&
      r.parentEntityId === entityId
    ).length;
  };

  // Group by subject area → entity → nested data items (shared with the board's My Requests).
  const subjectAreaGroups = useMemo(() => groupRequestsBySubjectArea(filteredDisplayRequests), [filteredDisplayRequests]);

  // Flat, in-order list of pending request ids for Focus Mode (skips context headers)
  const orderedPendingIds = useMemo(() => {
    const ids: string[] = [];
    for (const sa of subjectAreaGroups) {
      for (const block of sa.blocks) {
        if (block.kind === 'entityRequest' && block.request.status === 'pending') ids.push(block.request.id);
        for (const c of block.children) if (c.status === 'pending') ids.push(c.id);
      }
    }
    return ids;
  }, [subjectAreaGroups]);

  // ── Selections (respect active filters) ───────────────────────

  const allDisplayPendingIds = filteredDisplayRequests.filter(r => r.status === 'pending').map(r => r.id);
  const allSelected = allDisplayPendingIds.length > 0 && allDisplayPendingIds.every(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allDisplayPendingIds));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Group-level "select all" (e.g. every data item under one unchanged
  // entity, or every row in one table): if every id in the group is already
  // selected, clear just those; otherwise add all of them to the selection.
  const toggleSelectMany = (ids: string[]) => {
    if (ids.length === 0) return;
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const toggleGroup = (name: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // ── Approvals & Rejections ────────────────────────────────────

  const handleSingleApprove = (id: string) => {
    onApprove(id);
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleBulkApprove = () => {
    const ids = Array.from(selectedIds);
    const toApprove = ids.map(id => requests.find(r => r.id === id)).filter(Boolean) as ChangeRequest[];

    // Approve entities before their data items so the guard passes.
    toApprove.sort((a, b) => {
      if (a.recordType === 'entity' && b.recordType !== 'entity') return -1;
      if (b.recordType === 'entity' && a.recordType !== 'entity') return 1;
      return 0;
    });

    for (const req of toApprove) {
      if (isParentPendingNew(req)) {
        const parentInBatch = toApprove.some(r => r.recordType === 'entity' && r.proposedData.id === req.parentEntityId);
        if (!parentInBatch) {
          toast.warning(`Skipped "${(req.proposedData as DataItem).name}" — approve its parent entity first.`);
          continue;
        }
      }
      onApprove(req.id);
    }

    setSelectedIds(new Set());
  };

  const handleOpenRejectDialog = (ids: string[]) => setRejectingIds(ids);

  const confirmReject = (reason: string) => {
    if (!rejectingIds) return;
    rejectingIds.forEach(id => onReject(id, reason));
    setRejectingIds(null);
    setSelectedIds(new Set());
  };

  const getCascadeWarning = () => {
    if (!rejectingIds) return null;
    const reqs = rejectingIds.map(id => requests.find(r => r.id === id)).filter(Boolean) as ChangeRequest[];
    const entityReqs = reqs.filter(r => r.type === 'create' && r.recordType === 'entity');

    let totalChildren = 0;
    let entityName = '';
    for (const er of entityReqs) {
      const childrenCount = getPendingChildrenCount(er.proposedData.id);
      if (childrenCount > 0) { totalChildren += childrenCount; entityName = (er.proposedData as Entity).name; }
    }

    if (totalChildren > 0) {
      const nameStr = entityReqs.length === 1 ? `'${entityName}'` : 'these entities';
      return `Rejecting ${nameStr} will also reject ${totalChildren} pending child data-item request(s) so no orphans are left.`;
    }
    return null;
  };

  // ── Focus mode ────────────────────────────────────────────────

  const enterFocusMode = () => {
    if (orderedPendingIds.length === 0) return;
    setFocusQueueIds(orderedPendingIds);
    setFocusMode(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex items-center justify-between h-14 gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-gray-900 tracking-tight">DictCentral</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200 flex-shrink-0">
                  <CheckSquare className="w-3 h-3 inline mr-1" />Approver
                </span>
              </div>
            </div>

            {/* Main tabs */}
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
                onClick={() => setTab('requests')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors relative ${
                  tab === 'requests' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                Requests
                {pending.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pending.length}
                  </span>
                )}
              </button>
            </div>

            {/* Right */}
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
                {/* Tree / Table toggle — inline with the section it controls */}
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Change Requests</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Review, approve, or reject pending change requests from board members
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span><span className="font-semibold text-amber-600">{pending.length}</span> pending</span>
                <span><span className="font-semibold text-emerald-600">{approved.length}</span> approved</span>
                <span><span className="font-semibold text-red-600">{rejected.length}</span> rejected</span>
              </div>
            </div>

            {focusMode ? (
              <FocusModeView
                queueIds={focusQueueIds}
                requests={requests}
                onApprove={onApprove}
                onReject={onReject}
                onExit={() => setFocusMode(false)}
                isParentPendingNew={isParentPendingNew}
              />
            ) : (
              <>
                {/* Filter pills + view toggle + Review button */}
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
                        {f === 'pending' && pending.length > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                            {pending.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Card / Table — table is the Excel-style scalable default */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setReqViewMode('card')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          reqViewMode === 'card' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Rows3 className="w-3.5 h-3.5" /> Card
                      </button>
                      <button
                        onClick={() => setReqViewMode('table')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          reqViewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Table2 className="w-3.5 h-3.5" /> Table
                      </button>
                    </div>

                    <button
                      onClick={enterFocusMode}
                      disabled={allDisplayPendingIds.length === 0}
                      className="inline-flex items-center justify-center gap-2 h-9 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      <Play className="w-4 h-4" /> Review Pending
                    </button>
                  </div>
                </div>

                {/* Search + type + subject-area filters + select all */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      value={listSearch}
                      onChange={e => setListSearch(e.target.value)}
                      placeholder="Search requests by record name…"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <select
                    value={listTypeFilter}
                    onChange={e => setListTypeFilter(e.target.value as 'all' | 'create' | 'edit')}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                  >
                    <option value="all">All types</option>
                    <option value="create">Create</option>
                    <option value="edit">Edit</option>
                  </select>
                  <select
                    value={listSaFilter}
                    onChange={e => setListSaFilter(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                  >
                    <option value="">All subject areas</option>
                    {subjectAreaNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>

                  {allDisplayPendingIds.length > 0 && (
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
                        Select all {allDisplayPendingIds.length} pending
                      </label>
                    </div>
                  )}
                </div>

                {filteredDisplayRequests.length === 0 && (
                  <div className="text-center py-20 text-gray-400">
                    <Bell className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    <div className="text-sm font-medium">No matching requests</div>
                    <div className="text-xs mt-1">
                      {reqFilter === 'pending'
                        ? 'All caught up — no pending requests to review'
                        : 'Try adjusting your search or filters'}
                    </div>
                  </div>
                )}

                {filteredDisplayRequests.length > 0 && reqViewMode === 'table' && (
                  <HierarchyRequestTable
                    groups={subjectAreaGroups}
                    subjectAreas={subjectAreas}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onSelectMany={toggleSelectMany}
                    onApprove={handleSingleApprove}
                    onReject={(id) => handleOpenRejectDialog([id])}
                    onRowClick={(req) => setModal({ type: 'requestDetail', request: req })}
                    onEntityClick={handleHierarchyEntityClick}
                    isParentPendingNew={isParentPendingNew}
                  />
                )}

                {filteredDisplayRequests.length > 0 && reqViewMode === 'card' && (
                  <RequestGroupList
                    groups={subjectAreaGroups}
                    subjectAreas={subjectAreas}
                    collapsedGroups={collapsedGroups}
                    onToggleGroup={toggleGroup}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onSelectMany={toggleSelectMany}
                    isParentPendingNew={isParentPendingNew}
                    onApprove={handleSingleApprove}
                    onReject={(id) => handleOpenRejectDialog([id])}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Sticky Bottom Action Bar */}
      {selectedIds.size > 0 && tab === 'requests' && !focusMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 animate-in slide-in-from-bottom-2">
          <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-700">
              {selectedIds.size} selected request(s)
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Clear
              </button>
              <RejectButton size="md" variant="solid" onClick={() => handleOpenRejectDialog(Array.from(selectedIds))}>
                Reject Selected
              </RejectButton>
              <ApproveButton size="md" onClick={handleBulkApprove}>
                Approve Selected
              </ApproveButton>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <RejectDialog
        open={rejectingIds !== null}
        count={rejectingIds?.length ?? 1}
        cascadeWarning={getCascadeWarning()}
        onClose={() => setRejectingIds(null)}
        onConfirm={confirmReject}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-auto relative z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between text-xs text-gray-400">
          <span>DictCentral · Approver Portal</span>
          <button onClick={onLeave} className="hover:text-gray-600 transition-colors flex items-center gap-1">
            <LogOut className="w-3 h-3" /> Switch role
          </button>
        </div>
      </footer>

      {/* Modals — read-only */}
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
