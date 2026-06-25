// Confirmation dialog for the board member's "Reroute to Another HOD" action
// from My Requests, while a request is pending (either review stage — see
// SubmissionDetailView's `onReroute`). Same HOD-select + required-comment
// shape as the Create/Edit/Delete views' reroute section (see
// CreateModal/EditModal/DeleteConfirmDialog), just surfaced as its own
// dialog since there's no surrounding form here.

import { useState } from 'react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '../ui/alert-dialog';
import { HOD_DIRECTORY } from '../../lib/constants';

interface RerouteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (hodName: string, comment: string) => void;
}

export function RerouteDialog({ open, onClose, onConfirm }: RerouteDialogProps) {
  const [hodName, setHodName] = useState('');
  const [comment, setComment] = useState('');

  const handleClose = () => { setHodName(''); setComment(''); onClose(); };
  const canConfirm = hodName.trim() !== '' && comment.trim() !== '';

  return (
    <AlertDialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reroute to Another HOD</AlertDialogTitle>
          <AlertDialogDescription>
            If your usual HOD isn't around to approve this request, pick another one to take it
            over instead. A comment explaining why is required — it'll be visible to every
            reviewer on this request.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3 py-1">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-gray-500 block mb-1">Reroute to HOD *</label>
            <select
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              value={hodName}
              onChange={e => setHodName(e.target.value)}
            >
              <option value="">— Select HOD —</option>
              {HOD_DIRECTORY.map(h => (
                <option key={h.name} value={h.name}>{h.name}{h.department ? ` — ${h.department}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-gray-500 block mb-1">Reason for reroute *</label>
            <textarea
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
              rows={3}
              placeholder="e.g. HOD is on leave until next week"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm}
            onClick={e => {
              e.preventDefault();
              if (!canConfirm) return;
              onConfirm(hodName, comment.trim());
              handleClose();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reroute Request
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
