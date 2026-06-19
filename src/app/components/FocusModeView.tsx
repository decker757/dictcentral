import { useState, useEffect } from 'react';
import {
  ChevronLeft, SkipForward, X, Clock, CheckCheck, Info,
} from 'lucide-react';
import { ChangeRequest, Entity, DataItem } from '../types';
import { formatSubmittedAt } from '../lib/format';
import { DiffGrid, getRequestDiff } from './shared/DiffGrid';
import { RejectDialog } from './shared/RejectDialog';
import { RecordTypeIcon, OperationBadge } from '../lib/badges';
import { ApproveButton, RejectButton } from './ui/ActionButton';

interface FocusModeViewProps {
  /** Frozen snapshot of pending request IDs captured when focus mode was entered. */
  queueIds: string[];
  /** Live requests, looked up by id for display (status reflects approvals/rejections). */
  requests: ChangeRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onExit: () => void;
  isParentPendingNew: (req: ChangeRequest) => boolean;
}

export function FocusModeView({
  queueIds, requests, onApprove, onReject, onExit, isParentPendingNew,
}: FocusModeViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rejectOpen, setRejectOpen] = useState(false);

  const total = queueIds.length;
  const done = currentIndex >= total;
  const current = !done ? requests.find(r => r.id === queueIds[currentIndex]) : undefined;

  const disableApprove = current ? isParentPendingNew(current) : false;

  // Cascade children count for the current (new entity) request
  const childCount = current && current.type === 'create' && current.recordType === 'entity'
    ? requests.filter(r =>
        r.status === 'pending' && r.type === 'create' && r.recordType === 'dataitem' &&
        r.parentEntityId === current.proposedData.id
      ).length
    : 0;

  const advance = () => setCurrentIndex(i => i + 1);

  const approveCurrent = () => {
    if (!current || disableApprove || current.status !== 'pending') return;
    onApprove(current.id);
    advance();
  };

  const confirmReject = (reason: string) => {
    if (!current || current.status !== 'pending') return;
    onReject(current.id, reason);
    setRejectOpen(false);
    advance();
  };

  const openReject = () => { if (current && current.status === 'pending') setRejectOpen(true); };

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
  }, [rejectOpen, current, disableApprove]);

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

  const diff = getRequestDiff(current);
  const { isCreate, isEntity, changedSet } = diff;
  const progress = total > 0 ? Math.round((currentIndex / total) * 100) : 0;
  const alreadyResolved = current.status !== 'pending';

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-gray-700">
              Reviewing {currentIndex + 1} of {total}
            </span>
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" /> Exit review
            </button>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Focus card */}
      <div className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <RecordTypeIcon type={isEntity ? 'entity' : 'dataitem'} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-gray-400">{isEntity ? 'Entity' : 'Data item'}</span>
                <OperationBadge operation={isCreate ? 'create' : 'edit'} />
                {alreadyResolved && (
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${current.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
                    {current.status}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-0.5">
                {(current.proposedData as Entity | DataItem).name}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2 flex-wrap">
            <span>{current.subjectAreaName}</span>
            {current.recordType === 'dataitem' && current.parentEntityName && (
              <>
                <span className="text-gray-300">·</span>
                <span>in <span className="font-medium text-gray-600">{current.parentEntityName}</span></span>
              </>
            )}
            <span className="text-gray-300">·</span>
            <span>by <span className="font-medium text-gray-600">{current.submittedBy || 'Unknown'}</span></span>
            <span className="text-gray-300">·</span>
            <Clock className="w-3 h-3" />
            <span>{formatSubmittedAt(current.submittedAt)}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {isCreate ? 'All fields are new' : `${changedSet.size} field${changedSet.size !== 1 ? 's' : ''} changed`}
          </span>
        </div>

        {/* Diff grid (scrollable) */}
        <DiffGrid diff={diff} mode="changes" className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[44vh] overflow-y-auto" />

        {disableApprove && (
          <div className="px-6 py-2.5 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            Approve the parent entity '{current.parentEntityName}' first — it must exist before this data item.
          </div>
        )}

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50">
          <RejectButton size="lg" variant="solid" onClick={openReject} disabled={alreadyResolved} />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={advance}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Skip <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <ApproveButton size="lg" onClick={approveCurrent} locked={disableApprove} disabled={alreadyResolved} />
        </div>
      </div>

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
        count={1}
        autoFocus
        placeholder="E.g., Classification must follow the HIPAA guideline."
        cascadeWarning={childCount > 0
          ? `Rejecting '${(current.proposedData as Entity).name}' will also reject its ${childCount} pending child data-item request${childCount !== 1 ? 's' : ''} so no orphans are left.`
          : null}
        onClose={() => setRejectOpen(false)}
        onConfirm={confirmReject}
      />
    </div>
  );
}
