// The sticky bottom bar that appears once one or more requests are selected
// in a review queue — "N selected", Clear, Reject Selected, Approve
// Selected. Identical between ApproverPortal (DGO) and HODPortal.

import { ApproveButton, RejectButton } from './ui/ActionButton';

interface ReviewQueueBulkBarProps {
  count: number;
  onClear: () => void;
  onRejectSelected: () => void;
  onApproveSelected: () => void;
}

export function ReviewQueueBulkBar({ count, onClear, onRejectSelected, onApproveSelected }: ReviewQueueBulkBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 animate-in slide-in-from-bottom-2">
      <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-700">{count} selected request(s)</div>
        <div className="flex items-center gap-3">
          <button onClick={onClear} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Clear
          </button>
          <RejectButton size="md" variant="solid" onClick={onRejectSelected}>Reject Selected</RejectButton>
          <ApproveButton size="md" onClick={onApproveSelected}>Approve Selected</ApproveButton>
        </div>
      </div>
    </div>
  );
}
