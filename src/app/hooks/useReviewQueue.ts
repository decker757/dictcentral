// Shared mechanics for a request REVIEW queue — used by both ApproverPortal
// (DGO, stage 'dgo') and HODPortal (stage 'hod'). Each portal computes its
// own pending/approved/rejected Submission arrays (the two roles scope and
// label these differently — see ApproverPortal's "approved BY ME" note and
// HODPortal's dgoReviewedBy scoping) and hands them to this hook, which then
// owns everything else common to reviewing a queue: list filters (search/
// type/subject-area), bulk selection, the open-detail-view comment drafts
// (with one-commit-point flushing on Approve/Reject), Focus Mode, and the
// reject dialog. See components/ReviewQueueList.tsx for the shared JSX.

import { useState, useMemo } from 'react';
import { ChangeRequest, Entity, DataItem } from '../types';
import { Submission } from '../lib/submissions';
import { isBatchBlocked as isBatchBlockedPure } from '../lib/catalog';

export type ReviewFilter = 'pending' | 'approved' | 'rejected';
export type TypeFilter = 'all' | 'create' | 'edit' | 'delete';

interface UseReviewQueueOptions {
  requests: ChangeRequest[];
  pendingSubmissions: Submission[];
  approvedSubmissions: Submission[];
  rejectedSubmissions: Submission[];
  onApprove: (batchId: string) => void;
  onReject: (batchId: string, reason: string) => void;
  /** Omit for a role that can't comment per-item (HOD) — drafts simply never flush anywhere. */
  onAddItemComment?: (requestId: string, text: string) => void;
  onAddBatchComment?: (batchId: string, text: string) => void;
  /** Extra free-text a submission can match against besides submittedBy (HOD's search also
   * matches the DGO who approved it). */
  extraSearchText?: (submission: Submission) => string;
}

export function useReviewQueue({
  requests, pendingSubmissions, approvedSubmissions, rejectedSubmissions,
  onApprove, onReject, onAddItemComment, onAddBatchComment, extraSearchText,
}: UseReviewQueueOptions) {
  const [reqFilter, setReqFilter] = useState<ReviewFilter>('pending');
  const [openBatchId, setOpenBatchId] = useState<string | null>(null);
  const [openItemDrafts, setOpenItemDrafts] = useState<Record<string, string>>({});
  const [openGenericDraft, setOpenGenericDraft] = useState('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  const [listSearch, setListSearch] = useState('');
  const [listTypeFilter, setListTypeFilter] = useState<TypeFilter>('all');
  const [listSaFilter, setListSaFilter] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [focusQueueIds, setFocusQueueIds] = useState<string[]>([]);
  const [rejectingBatchIds, setRejectingBatchIds] = useState<string[] | null>(null);

  /** Open one request's detail view (or close, with null) — always clears its drafts, so
   * nothing typed for one request can leak into another. */
  const openDetail = (batchId: string | null) => {
    setOpenBatchId(batchId);
    setOpenItemDrafts({});
    setOpenGenericDraft('');
  };

  /** The single commit point for comments: called right before Approve/Reject acts. */
  const flushOpenDrafts = (batchId: string) => {
    Object.entries(openItemDrafts).forEach(([requestId, text]) => {
      if (text.trim()) onAddItemComment?.(requestId, text);
    });
    if (openGenericDraft.trim()) onAddBatchComment?.(batchId, openGenericDraft);
    setOpenItemDrafts({});
    setOpenGenericDraft('');
  };

  const displaySubmissions = useMemo(() => {
    if (reqFilter === 'approved') return approvedSubmissions;
    if (reqFilter === 'rejected') return rejectedSubmissions;
    return pendingSubmissions;
  }, [reqFilter, pendingSubmissions, approvedSubmissions, rejectedSubmissions]);

  // A submission matches if ANY of its items match — these filters narrow down WHICH
  // requests to show, not which rows inside a request.
  const filteredSubmissions = useMemo(() => {
    const term = listSearch.toLowerCase().trim();
    return displaySubmissions.filter(s => {
      if (term) {
        const nameMatch = s.items.some(r => (r.proposedData as Entity | DataItem).name.toLowerCase().includes(term));
        const byMatch = s.submittedBy.toLowerCase().includes(term)
          || (extraSearchText?.(s) ?? '').toLowerCase().includes(term);
        if (!nameMatch && !byMatch) return false;
      }
      if (listTypeFilter !== 'all' && !s.items.some(r => r.type === listTypeFilter)) return false;
      if (listSaFilter && !s.subjectAreaNames.includes(listSaFilter)) return false;
      return true;
    });
  }, [displaySubmissions, listSearch, listTypeFilter, listSaFilter, extraSearchText]);

  const subjectAreaNames = useMemo(
    () => Array.from(new Set(requests.map(r => r.subjectAreaName))),
    [requests],
  );

  const isBatchBlocked = (batchId: string) => isBatchBlockedPure(requests, batchId);
  const orderedPendingBatchIds = useMemo(() => pendingSubmissions.map(s => s.batchId), [pendingSubmissions]);

  const allDisplayPendingBatchIds = filteredSubmissions.filter(s => s.status === 'pending').map(s => s.batchId);
  const allSelected = allDisplayPendingBatchIds.length > 0 && allDisplayPendingBatchIds.every(id => selectedBatchIds.has(id));

  const toggleSelectAll = () => setSelectedBatchIds(allSelected ? new Set() : new Set(allDisplayPendingBatchIds));
  const toggleSelect = (batchId: string) => {
    setSelectedBatchIds(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId); else next.add(batchId);
      return next;
    });
  };
  const clearSelection = () => setSelectedBatchIds(new Set());

  const handleApprove = (batchId: string) => {
    onApprove(batchId);
    setSelectedBatchIds(prev => { const n = new Set(prev); n.delete(batchId); return n; });
    if (openBatchId === batchId) openDetail(null);
  };
  /** Approve from the open detail view: flush its drafts first (one commit point). */
  const handleApproveOpen = (batchId: string) => { flushOpenDrafts(batchId); handleApprove(batchId); };
  const handleBulkApprove = () => {
    const ids = Array.from(selectedBatchIds);
    // Approve requests that don't depend on another pending request first.
    const ordered = [...ids].sort((a, b) => (isBatchBlocked(a) ? 1 : 0) - (isBatchBlocked(b) ? 1 : 0));
    for (const id of ordered) {
      if (isBatchBlocked(id)) continue; // still blocked even after earlier approvals in this batch
      onApprove(id);
    }
    clearSelection();
  };

  const openRejectDialog = (batchIds: string[]) => setRejectingBatchIds(batchIds);
  /** Reject from the open detail view: flush its drafts first (one commit point), then open the dialog. */
  const handleRejectOpen = (batchId: string) => { flushOpenDrafts(batchId); openRejectDialog([batchId]); };
  const closeRejectDialog = () => setRejectingBatchIds(null);
  const confirmReject = (reason: string) => {
    if (!rejectingBatchIds) return;
    rejectingBatchIds.forEach(id => onReject(id, reason));
    setRejectingBatchIds(null);
    clearSelection();
    if (rejectingBatchIds.includes(openBatchId ?? '')) openDetail(null);
  };

  const enterFocusMode = () => {
    if (orderedPendingBatchIds.length === 0) return;
    setFocusQueueIds(orderedPendingBatchIds);
    setFocusMode(true);
  };
  const exitFocusMode = () => setFocusMode(false);

  return {
    reqFilter, setReqFilter,
    openBatchId, openDetail,
    openItemDrafts, setOpenItemDrafts, openGenericDraft, setOpenGenericDraft,
    listSearch, setListSearch, listTypeFilter, setListTypeFilter, listSaFilter, setListSaFilter,
    subjectAreaNames, filteredSubmissions,
    selectedBatchIds, toggleSelect, toggleSelectAll, allSelected, allDisplayPendingBatchIds, clearSelection,
    isBatchBlocked, orderedPendingBatchIds,
    handleApprove, handleApproveOpen, handleBulkApprove,
    rejectingBatchIds, openRejectDialog, handleRejectOpen, closeRejectDialog, confirmReject,
    focusMode, focusQueueIds, enterFocusMode, exitFocusMode,
  };
}

export type ReviewQueue = ReturnType<typeof useReviewQueue>;
