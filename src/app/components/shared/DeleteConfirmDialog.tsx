// Confirmation dialog for requesting a DELETE of an entity or data item from
// the catalog detail modal (EntityModal/DataItemModal's "Delete" button).
// Confirming here doesn't delete anything directly — it submits a delete
// REQUEST that still has to go through the normal DGO → HOD review pipeline,
// same as a create or edit. Mirrors WithdrawDialog's shape (no reason field
// needed) but with copy specific to "this submits a request", not "this
// removes it now".

import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '../ui/alert-dialog';

interface DeleteConfirmDialogProps {
  open: boolean;
  /** Name of the entity/data item about to be deleted, shown in the prompt. */
  recordName?: string;
  /** 'entity' shows an extra warning about cascading data items. */
  recordType?: 'entity' | 'dataitem';
  /** Number of data items that would also be removed if this entity is deleted. */
  childCount?: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  open, recordName, recordType, childCount, onClose, onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Deletion of {recordName ?? 'this record'}?</AlertDialogTitle>
          <AlertDialogDescription>
            This submits a delete request — the record will stay in the catalog until the request is approved.
            {recordType === 'entity' && childCount !== undefined && childCount > 0 && (
              <> This entity has {childCount} data item{childCount !== 1 ? 's' : ''}, which will be removed along with it once approved.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={e => { e.preventDefault(); onConfirm(); }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Submit Delete Request
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
