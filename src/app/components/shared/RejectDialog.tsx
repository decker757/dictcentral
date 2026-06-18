// Shared rejection dialog (reason + cascade warning), used by the Approver
// queue (single / bulk) and Focus Mode. Owns its own reason state.

import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '../ui/alert-dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface RejectDialogProps {
  open: boolean;
  count?: number;
  cascadeWarning?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function RejectDialog({
  open, count = 1, cascadeWarning, placeholder, autoFocus, onClose, onConfirm,
}: RejectDialogProps) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);

  const plural = count !== 1 ? 's' : '';

  return (
    <AlertDialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Request{plural}</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide a reason for rejecting the selected request{plural}.
            This reason will be visible to the board member who submitted it.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {cascadeWarning && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-sm text-red-800 flex items-start gap-2 my-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{cascadeWarning}</span>
          </div>
        )}

        <div className="grid gap-2 py-2">
          <Label htmlFor="reject-reason" className="text-sm font-medium text-gray-700">
            Rejection Reason <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="reject-reason"
            autoFocus={autoFocus}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={placeholder ?? 'E.g., Field length must be 100 per guidelines.'}
            className="min-h-[100px]"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={e => { e.preventDefault(); if (reason.trim()) onConfirm(reason.trim()); }}
            disabled={!reason.trim()}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          >
            Confirm Rejection
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
