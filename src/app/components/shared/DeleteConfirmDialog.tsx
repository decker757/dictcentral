// Confirmation dialog for requesting a DELETE of an entity or data item from
// the catalog detail modal (EntityModal/DataItemModal's "Delete" button).
// Confirming here doesn't delete anything directly — it submits a delete
// REQUEST that still has to go through the normal review pipeline, same as
// a create or edit (see useCatalog).
//
// Carries the same two mode-specific, mutually-exclusive sections as
// CreateModal/EditModal:
// - mode='dgo': a compulsory "Staff Approver" picker — the one-stage
//   peer-DGO pipeline (see useCatalog's RequestOpts/pipeline). Confirm is
//   disabled until someone other than the current DGO is picked.
// - mode='board': an optional "Reroute to Another HOD" checkbox; if
//   checked, an HOD picker and a required rationale comment appear, and
//   Confirm is disabled until both are filled in.

import { useState } from 'react';
import { Route } from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '../ui/alert-dialog';
import { DGO_DIRECTORY, HOD_DIRECTORY, CURRENT_DGO } from '../../lib/constants';
import { RequestOpts } from '../../hooks/useCatalog';

interface DeleteConfirmDialogProps {
  open: boolean;
  /** Name of the entity/data item about to be deleted, shown in the prompt. */
  recordName?: string;
  /** 'entity' shows an extra warning about cascading data items. */
  recordType?: 'entity' | 'dataitem';
  /** Number of data items that would also be removed if this entity is deleted. */
  childCount?: number;
  /** Which extra section to show — see file header. Defaults to 'board' (no extra section
   * unless a reroute is actually checked); HOD never opens this dialog at all. */
  mode?: 'board' | 'dgo';
  onClose: () => void;
  onConfirm: (opts?: RequestOpts) => void;
}

export function DeleteConfirmDialog({
  open, recordName, recordType, childCount, mode = 'board', onClose, onConfirm,
}: DeleteConfirmDialogProps) {
  const [staffApprover, setStaffApprover] = useState('');
  const [rerouteChecked, setRerouteChecked] = useState(false);
  const [rerouteHod, setRerouteHod] = useState('');
  const [rerouteComment, setRerouteComment] = useState('');

  const resetAndClose = () => {
    setStaffApprover(''); setRerouteChecked(false); setRerouteHod(''); setRerouteComment('');
    onClose();
  };

  const canConfirm = mode === 'dgo'
    ? staffApprover.trim() !== ''
    : !rerouteChecked || (rerouteHod.trim() !== '' && rerouteComment.trim() !== '');

  const handleConfirm = () => {
    if (!canConfirm) return;
    const opts: RequestOpts = mode === 'dgo'
      ? { staffApprover }
      : rerouteChecked ? { rerouteHod, rerouteComment: rerouteComment.trim() } : {};
    onConfirm(opts);
    resetAndClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={o => { if (!o) resetAndClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Request deletion of {recordName ?? 'this record'}?</AlertDialogTitle>
          <AlertDialogDescription>
            {mode === 'dgo'
              ? 'This submits a delete request — the record stays in the catalog until the peer DGO you select below approves it.'
              : 'This submits a delete request for DGO review, followed by HOD approval — the record stays in the catalog until both stages approve it.'}
            {recordType === 'entity' && childCount !== undefined && childCount > 0 && (
              <> This entity has {childCount} data item{childCount !== 1 ? 's' : ''}, which will be removed along with it once approved.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {mode === 'dgo' && (
          <div className="py-1">
            <label className="text-[10px] uppercase tracking-wide text-gray-500 block mb-1">Staff Approver (required) *</label>
            <select
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              value={staffApprover}
              onChange={e => setStaffApprover(e.target.value)}
            >
              <option value="">— Select another DGO to approve this request —</option>
              {DGO_DIRECTORY.filter(d => d.name !== CURRENT_DGO).map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              One-stage peer review — once they approve, this is applied immediately (no HOD review).
            </p>
          </div>
        )}

        {mode === 'board' && (
          <div className="py-1">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={rerouteChecked}
                onChange={e => setRerouteChecked(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
              />
              <Route className="w-4 h-4 text-blue-500" /> Re-route to Another HOD
            </label>
            {rerouteChecked && (
              <div className="mt-3 flex flex-col gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-gray-500 block mb-1">Reroute to HOD *</label>
                  <select
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    value={rerouteHod}
                    onChange={e => setRerouteHod(e.target.value)}
                  >
                    <option value="">— Select HOD —</option>
                    {HOD_DIRECTORY.map(h => <option key={h.name} value={h.name}>{h.name}{h.department ? ` — ${h.department}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-gray-500 block mb-1">Reason for reroute *</label>
                  <textarea
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
                    rows={2}
                    placeholder="e.g. HOD is on leave until next week"
                    value={rerouteComment}
                    onChange={e => setRerouteComment(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={resetAndClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm}
            onClick={e => { e.preventDefault(); handleConfirm(); }}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Delete Request
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
