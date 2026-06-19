import { useState, useMemo } from 'react';
import { BookOpen, CheckSquare, GitBranch, LayoutList, LogOut, Bell, Check, Search, Play, ChevronDown, ChevronRight } from 'lucide-react';
import { SubjectArea, Entity, DataItem, ChangeRequest } from './types';
import { TreeView } from './components/TreeView';
import { TableView } from './components/TableView';
import { SearchBar } from './components/SearchBar';
import { EntityModal } from './components/modals/EntityModal';
import { DataItemModal } from './components/modals/DataItemModal';
import { AdvancedSearchModal } from './components/modals/AdvancedSearchModal';
import { RequestCard, EntityViewCard } from './components/RequestCard';
import { FocusModeView } from './components/FocusModeView';
import { RejectDialog } from './components/shared/RejectDialog';
import { countDataItems, countMatches } from './lib/catalog';
import { RecordTypeIcon } from './lib/badges';
import { ApproveButton, RejectButton } from './components/ui/ActionButton';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { toast } from 'sonner';

type Tab = 'home' | 'requests';
type HomeView = 'tree' | 'table';

type ModalState =
  | { type: 'entity'; entity: Entity; subjectArea: SubjectArea }
  | { type: 'dataItem'; dataItem: DataItem; entity: Entity; subjectArea: SubjectArea }
  | { type: 'advancedSearch' }
  | null;

// A block groups data-item requests under their entity. The entity is either a
// pending request (actionable) or an existing entity shown as a context header.
type EntityBlock =
  | { kind: 'entityRequest'; request: ChangeRequest; children: ChangeRequest[] }
  | { kind: 'existingEntity'; entityName: string; children: ChangeRequest[] };

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

  // Group by subject area → then by entity. Every data item nests under its entity:
  // either an entity request (actionable) or an existing-entity context header.
  const subjectAreaGroups = useMemo(() => {
    const saOrder: string[] = [];
    const saMap = new Map<string, ChangeRequest[]>();
    for (const r of filteredDisplayRequests) {
      if (!saMap.has(r.subjectAreaName)) { saMap.set(r.subjectAreaName, []); saOrder.push(r.subjectAreaName); }
      saMap.get(r.subjectAreaName)!.push(r);
    }

    return saOrder.map(saName => {
      const reqs = saMap.get(saName)!;
      const entityReqs = reqs.filter(r => r.recordType === 'entity');
      const dataReqs = reqs.filter(r => r.recordType === 'dataitem');
      const blocks: EntityBlock[] = [];
      const consumed = new Set<string>();

      // Entity requests (actionable) with their child data-item requests
      for (const er of entityReqs) {
        const children = dataReqs.filter(d => d.parentEntityId === er.proposedData.id);
        children.forEach(c => consumed.add(c.id));
        blocks.push({ kind: 'entityRequest', request: er, children });
      }

      // Remaining data items belong to existing (unchanged) entities → context header
      const existingOrder: string[] = [];
      const existingMap = new Map<string, ChangeRequest[]>();
      for (const d of dataReqs) {
        if (consumed.has(d.id)) continue;
        const key = d.parentEntityName || 'Unassigned';
        if (!existingMap.has(key)) { existingMap.set(key, []); existingOrder.push(key); }
        existingMap.get(key)!.push(d);
      }
      for (const key of existingOrder) {
        blocks.push({ kind: 'existingEntity', entityName: key, children: existingMap.get(key)! });
      }

      return { name: saName, blocks, total: reqs.length, pendingCount: reqs.filter(r => r.status === 'pending').length };
    });
  }, [filteredDisplayRequests]);

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

  const renderRequestCard = (item: { request: ChangeRequest; isNested: boolean }) => {
    const r = item.request;
    const disableApprove = isParentPendingNew(r);
    const disableTooltip = disableApprove
      ? `Approve the parent entity '${r.parentEntityName}' first.`
      : undefined;
    return (
      <RequestCard
        request={r}
        isNested={item.isNested}
        selected={selectedIds.has(r.id)}
        onToggleSelect={toggleSelect}
        disableApprove={disableApprove}
        disableApproveTooltip={disableTooltip}
        onApprove={() => handleSingleApprove(r.id)}
        onReject={() => handleOpenRejectDialog([r.id])}
      />
    );
  };

  const renderChildRail = (children: ChangeRequest[], caption?: string) => (
    <div className="ml-5 mt-1.5 pl-5 border-l-2 border-gray-200 flex flex-col gap-1.5">
      {caption && <div className="text-[11px] text-gray-400 pl-0.5 -mb-0.5">{caption}</div>}
      {children.map(child => (
        <div key={child.id} className="relative">
          <span className="absolute -left-5 top-[1.65rem] w-4 h-px bg-gray-200" aria-hidden="true" />
          {renderRequestCard({ request: child, isNested: true })}
        </div>
      ))}
    </div>
  );

  const renderBlock = (block: EntityBlock) => {
    if (block.kind === 'entityRequest') {
      if (block.children.length === 0) {
        return <div key={block.request.id}>{renderRequestCard({ request: block.request, isNested: false })}</div>;
      }
      const n = block.children.length;
      const caption = block.request.type === 'create'
        ? `${n} data item${n !== 1 ? 's' : ''} in this new entity · approve the entity first`
        : `${n} data item${n !== 1 ? 's' : ''} in this entity`;
      return (
        <div key={block.request.id} className="flex flex-col">
          {renderRequestCard({ request: block.request, isNested: false })}
          {renderChildRail(block.children, caption)}
        </div>
      );
    }

    // Existing (unchanged) entity — read-only context card that expands into the
    // same field-grid format as a request, so the approver can cross-reference.
    const n = block.children.length;
    const parentId = block.children[0]?.parentEntityId;
    let entity: Entity | undefined;
    if (parentId) {
      for (const s of subjectAreas) {
        const e = s.entities.find(e => e.id === parentId);
        if (e) { entity = e; break; }
      }
    }
    return (
      <div key={`ee-${block.entityName}`} className="flex flex-col">
        {entity ? (
          <EntityViewCard entity={entity} childCount={n} />
        ) : (
          <div className="border border-gray-200 rounded-xl bg-gray-50/60 px-5 py-2.5 flex items-center gap-3">
            <RecordTypeIcon type="entity" size="md" muted />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-700">{block.entityName}</span>
                <span className="text-xs font-medium text-gray-400">Entity · unchanged</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {n} data item change{n !== 1 ? 's' : ''} below · no entity approval needed
              </div>
            </div>
          </div>
        )}
        {renderChildRail(block.children)}
      </div>
    );
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
                Home
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
              {/* Tree / Table toggle — inline with the section it controls */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
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
                {/* Filter pills + Review button */}
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

                  <button
                    onClick={enterFocusMode}
                    disabled={allDisplayPendingIds.length === 0}
                    className="inline-flex items-center justify-center gap-2 h-9 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    <Play className="w-4 h-4" /> Review Pending
                  </button>
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

                {/* Grouped list — each subject area is a titled card (mirrors the Data Hierarchy) */}
                <div className="flex flex-col gap-5">
                  {subjectAreaGroups.map(group => {
                    const collapsed = collapsedGroups.has(group.name);
                    return (
                      <div key={group.name} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                        <button
                          onClick={() => toggleGroup(group.name)}
                          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors text-left group"
                        >
                          {/* Subject area = blue (matches the Data Hierarchy tree) */}
                          <RecordTypeIcon type="subjectArea" size="md" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{group.name}</span>
                              {group.pendingCount > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-amber-50 text-amber-700 border-amber-200">
                                  {group.pendingCount} pending
                                </span>
                              )}
                            </div>
                            {/* Second line only when it adds info beyond the pending badge */}
                            {group.total - group.pendingCount > 0 && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {group.total - group.pendingCount} resolved
                              </div>
                            )}
                          </div>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${collapsed ? '-rotate-90' : ''}`} />
                        </button>

                        {!collapsed && (
                          <div className="border-t border-gray-100 p-4 bg-gray-50/40 flex flex-col gap-3">
                            {group.blocks.map(block => renderBlock(block))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
    </div>
  );
}
