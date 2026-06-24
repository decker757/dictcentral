// Confirmation dialog for the board member's "Withdraw" action. Unlike
// RejectDialog there's no reason to capture — withdrawing just removes the
// request (every item in the batch) from both the board member's "My
// Requests" and the approver's queue. Only ever shown for a pending request.

import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '../ui/alert-dialog';

interface WithdrawDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function WithdrawDialog({ open, onClose, onConfirm }: WithdrawDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw this request?</AlertDialogTitle>
          <AlertDialogDescription>
            This request will be removed from your request list and from the approver's review
            queue. You'll need to resubmit it from scratch if you change your mind.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={e => { e.preventDefault(); onConfirm(); }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Withdraw Request
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
