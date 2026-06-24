// Focus mode — review pending REQUESTS one at a time, keyboard-driven.
// A "request" here is a whole batch (every entity/data-item submitted
// together); approving or rejecting acts on all of it at once, same as the
// regular detail view. This view is just SubmissionDetailView's content
// wrapped in next/prev/skip/exit navigation chrome.

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, SkipForward, X, CheckCheck } from 'lucide-react';
import { ChangeRequest, Comment, Entity, SubjectArea } from '../types';
import { groupRequestsByBatch } from '../lib/submissions';
import { SubmissionDetailView } from './SubmissionDetailView';
import { RejectDialog } from './shared/RejectDialog';

interface FocusModeViewProps {
  /** Frozen snapshot of pending batchIds captured when focus mode was entered. */
  queueIds: string[];
  /** Live requests, looked up by batchId for display (status reflects approvals/rejections). */
  requests: ChangeRequest[];
  subjectAreas: SubjectArea[];
  onApprove: (batchId: string) => void;
  onReject: (batchId: string, reason: string) => void;
  onExit: () => void;
  onEntityClick?: (entity: Entity) => void;
  onRowClick?: (req: ChangeRequest) => void;
  itemComments: Record<string, Comment[]>;
  onAddItemComment: (requestId: string, text: string) => void;
  batchComments: Record<string, Comment[]>;
  onAddBatchComment: (batchId: string, text: string) => void;
  isBatchBlocked: (batchId: string) => boolean;
}

export function FocusModeView({
  queueIds, requests, subjectAreas, onApprove, onReject, onExit, onEntityClick, onRowClick,
  itemComments, onAddItemComment, batchComments, onAddBatchComment, isBatchBlocked,
}: FocusModeViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rejectOpen, setRejectOpen] = useState(false);

  // Unsent drafts for the CURRENT item — one commit point (Approve/Reject),
  // reachable from both the SubmissionDetailView buttons and the A/R keyboard
  // shortcuts, so neither path can skip flushing them. Reset whenever the
  // current request changes (advance/prev/skip) so drafts never leak onto
  // the next request in the queue.
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});
  const [genericDraft, setGenericDraft] = useState('');

  const total = queueIds.length;
  const done = currentIndex >= total;

  const submissions = useMemo(() => groupRequestsByBatch(requests), [requests]);
  const currentBatchId = !done ? queueIds[currentIndex] : undefined;
  const current = currentBatchId ? submissions.find(s => s.batchId === currentBatchId) : undefined;

  const blocked = current ? isBatchBlocked(current.batchId) : false;

  useEffect(() => {
    setItemDrafts({});
    setGenericDraft('');
  }, [currentBatchId]);

  const flushDrafts = () => {
    if (!current) return;
    Object.entries(itemDrafts).forEach(([requestId, text]) => {
      if (text.trim()) onAddItemComment(requestId, text);
    });
    if (genericDraft.trim()) onAddBatchComment(current.batchId, genericDraft);
    setItemDrafts({});
    setGenericDraft('');
  };

  const advance = () => setCurrentIndex(i => i + 1);

  const approveCurrent = () => {
    if (!current || blocked || current.status !== 'pending') return;
    flushDrafts();
    onApprove(current.batchId);
    advance();
  };

  const confirmReject = (reason: string) => {
    if (!current || current.status !== 'pending') return;
    onReject(current.batchId, reason);
    setRejectOpen(false);
    advance();
  };

  // Comments are flushed the moment the approver decides to reject (i.e. on
  // opening the dialog) — same commit point as Approve, before the reason
  // is even typed.
  const openReject = () => {
    if (!current || current.status !== 'pending') return;
    flushDrafts();
    setRejectOpen(true);
  };

  // ── Keyboard shortcuts (ignore when typing or dialog open) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (rejectOpen) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === 'a') { e.preventDefault(); approveCurrent(); }
      else if (k === 'r') { e.preventDefault(); openReject(); }
      else if (k === 's' || e.key === 'ArrowRight') { e.preventDefault(); advance(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setCurrentIndex(i => Math.max(0, i - 1)); }
      else if (e.key === 'Escape') { e.preventDefault(); onExit(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // Drafts are included so the handler's closure (via approveCurrent/openReject)
    // always flushes the LATEST typed text, not whatever was current when the
    // listener was last attached.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejectOpen, current, blocked, itemDrafts, genericDraft]);

  // ── All caught up ──
  if (done || !current) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="p-4 bg-emerald-50 rounded-2xl mb-4">
          <CheckCheck className="w-10 h-10 text-emerald-500" />
        </div>
        <div className="text-lg font-semibold text-gray-900">All caught up</div>
        <div className="text-sm text-gray-500 mt-1">
          You reviewed {total} request{total !== 1 ? 's' : ''} in this session.
        </div>
        <button
          onClick={onExit}
          className="mt-6 flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to list
        </button>
      </div>
    );
  }

  const progress = total > 0 ? Math.round((currentIndex / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-gray-700">
            Reviewing {currentIndex + 1} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={advance}
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Skip <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" /> Exit review
            </button>
          </div>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <SubmissionDetailView
        submission={current}
        subjectAreas={subjectAreas}
        onBack={onExit}
        onApprove={approveCurrent}
        onReject={openReject}
        onEntityClick={onEntityClick}
        onRowClick={onRowClick}
        itemComments={itemComments}
        genericComments={batchComments[current.batchId] ?? []}
        itemDrafts={itemDrafts}
        onItemDraftChange={(requestId, text) => setItemDrafts(prev => ({ ...prev, [requestId]: text }))}
        genericDraft={genericDraft}
        onGenericDraftChange={setGenericDraft}
        blocked={blocked}
        blockedReason={`Approve the request this depends on first.`}
      />

      {/* Keyboard hint */}
      <div className="text-center text-[11px] text-gray-400">
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">A</kbd> approve ·{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">R</kbd> reject ·{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">S</kbd> / <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">→</kbd> skip ·{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">←</kbd> prev ·{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">Esc</kbd> exit
      </div>

      <RejectDialog
        open={rejectOpen}
        count={current.items.length}
        autoFocus
        placeholder="E.g., Classification must follow the HIPAA guideline."
        onClose={() => setRejectOpen(false)}
        onConfirm={confirmReject}
      />
    </div>
  );
}
