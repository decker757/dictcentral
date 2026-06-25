// State + derived data + actions for a "My Requests" tab — the requester's
// own view of what they've submitted (one card per batchId), reused
// identically by BoardPortal and ApproverPortal (a DGO is also a requester
// for their own create/edit/delete submissions — see ApproverPortal's
// self-approval-prevention notes). Renders nothing itself — see
// components/MyRequestsPanel.tsx for the shared JSX that consumes this.
//
// `onReroute` is Board-only — DGOs submit via the one-stage peer-review
// pipeline (see useCatalog), which has no HOD involvement at all, so
// rerouting to an HOD makes no sense there. Omit it and the panel simply
// won't render a Reroute button/dialog.

import { useState, useMemo } from 'react';
import { ChangeRequest, Comment, RecordAttributes } from '../types';
import { groupRequestsByBatch, Submission } from '../lib/submissions';
import { buildSubmissionCsv, downloadTextFile } from '../lib/exportCsv';

export type MyRequestFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface UseMyRequestsOptions {
  requests: ChangeRequest[];
  submittedBy: string;
  itemComments: Record<string, Comment[]>;
  batchComments: Record<string, Comment[]>;
  onReviseAndResubmit: (batchId: string, drafts: Record<string, Partial<RecordAttributes>>) => void;
  onWithdraw: (batchId: string) => void;
  /** Board only — see file header. */
  onReroute?: (batchId: string, hodName: string, comment: string) => void;
}

export function useMyRequests({
  requests, submittedBy, itemComments, batchComments, onReviseAndResubmit, onWithdraw, onReroute,
}: UseMyRequestsOptions) {
  const [filter, setFilter] = useState<MyRequestFilter>('all');
  const [openBatchId, setOpenBatchId] = useState<string | null>(null);
  const [revisingBatchId, setRevisingBatchId] = useState<string | null>(null);
  const [withdrawingBatchId, setWithdrawingBatchId] = useState<string | null>(null);
  const [reroutingBatchId, setReroutingBatchId] = useState<string | null>(null);

  const myRequests = useMemo(() => requests.filter(r => r.submittedBy === submittedBy), [requests, submittedBy]);
  const allSubmissions = useMemo(() => groupRequestsByBatch(myRequests), [myRequests]);
  const pendingCount = allSubmissions.filter(s => s.status === 'pending').length;
  const approvedCount = allSubmissions.filter(s => s.status === 'approved').length;
  const rejectedCount = allSubmissions.filter(s => s.status === 'rejected').length;
  const filteredSubmissions = useMemo(
    () => filter === 'all' ? allSubmissions : allSubmissions.filter(s => s.status === filter),
    [allSubmissions, filter],
  );

  /** Open a request: always lands on the read-only detail view, never mid-revise. */
  const openRequest = (batchId: string | null) => { setOpenBatchId(batchId); setRevisingBatchId(null); };
  const openSubmission: Submission | undefined = openBatchId
    ? allSubmissions.find(s => s.batchId === openBatchId)
    : undefined;

  const exportSubmission = (submission: Submission) => {
    const csv = buildSubmissionCsv(submission.items, itemComments, batchComments[submission.batchId] ?? []);
    downloadTextFile(`request-${submission.batchId}.csv`, csv);
  };

  const startRevising = (batchId: string) => setRevisingBatchId(batchId);
  const cancelRevising = () => setRevisingBatchId(null);
  const resubmit = (batchId: string, drafts: Record<string, Partial<RecordAttributes>>) => {
    onReviseAndResubmit(batchId, drafts);
    setRevisingBatchId(null);
    setOpenBatchId(null);
    setFilter('pending');
  };

  const requestWithdraw = (batchId: string) => setWithdrawingBatchId(batchId);
  const cancelWithdraw = () => setWithdrawingBatchId(null);
  const confirmWithdraw = () => {
    if (!withdrawingBatchId) return;
    onWithdraw(withdrawingBatchId);
    if (openBatchId === withdrawingBatchId) openRequest(null);
    setWithdrawingBatchId(null);
  };

  const requestReroute = (batchId: string) => setReroutingBatchId(batchId);
  const cancelReroute = () => setReroutingBatchId(null);
  const confirmReroute = (hodName: string, comment: string) => {
    if (!reroutingBatchId) return;
    onReroute?.(reroutingBatchId, hodName, comment);
    setReroutingBatchId(null);
  };

  return {
    filter, setFilter,
    pendingCount, approvedCount, rejectedCount, filteredSubmissions,
    openRequest, openSubmission,
    revisingBatchId, startRevising, cancelRevising, resubmit,
    exportSubmission,
    withdrawingBatchId, requestWithdraw, cancelWithdraw, confirmWithdraw,
    rerouteEnabled: !!onReroute,
    reroutingBatchId, requestReroute, cancelReroute, confirmReroute,
  };
}

export type MyRequests = ReturnType<typeof useMyRequests>;
