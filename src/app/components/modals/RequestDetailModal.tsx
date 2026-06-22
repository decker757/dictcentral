// Consolidated detail view for a single entity/data-item request — opened by
// clicking any row in RequestTable (or any RequestCard, if wired up later).
// Reuses the same diff machinery as the card view (getRequestDiff + DiffGrid)
// so "all attributes, current values, pending changes, previous values" is
// just the existing Full View / Changes Only grid, plus a metadata strip with
// submitter/subject-area/status context — everything in one screen, no
// further navigation required.

import { useState } from 'react';
import { Layers2 } from 'lucide-react';
import { ChangeRequest, Entity, DataItem } from '../../types';
import { Modal, ModalHeader } from '../ui/Modal';
import { OperationBadge, RecordTypeIcon } from '../../lib/badges';
import { getRequestDiff, DiffGrid } from '../shared/DiffGrid';
import { formatSubmittedAt } from '../../lib/format';

const STATUS_BADGE: Record<ChangeRequest['status'], string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-600 border-red-200',
};

export function RequestDetailModal({ request, onClose }: { request: ChangeRequest; onClose: () => void }) {
  const diff = getRequestDiff(request);
  const [viewMode, setViewMode] = useState<'full' | 'changes'>(diff.isCreate ? 'full' : 'changes');
  const name = (request.proposedData as Entity | DataItem).name;

  return (
    <Modal onClose={onClose} maxWidth="max-w-3xl">
      <ModalHeader
        icon={<RecordTypeIcon type={diff.isEntity ? 'entity' : 'dataitem'} size="sm" boxless />}
        iconWrapClass={diff.isEntity ? 'bg-purple-100' : 'bg-green-100'}
        title={name}
        subtitle={diff.isEntity ? 'Entity' : 'Data item'}
        onClose={onClose}
      >
        <OperationBadge operation={request.type} />
        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${STATUS_BADGE[request.status]}`}>
          {request.status}
        </span>
      </ModalHeader>

      <div className="overflow-y-auto flex-1">
        {/* Metadata — subject area, parent entity, submitter, timing, all in one place */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/60 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Subject Area</div>
            <div className="text-gray-700 text-sm font-medium truncate">{request.subjectAreaName}</div>
          </div>
          {request.parentEntityName && (
            <div>
              <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Parent Entity</div>
              <div className="text-gray-700 text-sm font-medium truncate">{request.parentEntityName}</div>
            </div>
          )}
          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Submitted By</div>
            <div className="text-gray-700 text-sm font-medium truncate">{request.submittedBy || 'Unknown'}</div>
          </div>
          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Submitted At</div>
            <div className="text-gray-700 text-sm font-medium truncate">{formatSubmittedAt(request.submittedAt)}</div>
          </div>
        </div>

        {request.rejectionReason && (
          <div className="px-6 py-2.5 bg-red-50 border-b border-red-100 text-xs text-red-700">
            <span className="font-semibold">Rejection Reason:</span> {request.rejectionReason}
          </div>
        )}

        {/* View toggle + change summary — same pattern as RequestCard's expanded body */}
        <div className="px-6 py-2.5 border-b border-gray-100 bg-white flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {!diff.isCreate && (
              <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white text-xs">
                <button
                  onClick={() => setViewMode('full')}
                  className={`px-3 py-1.5 font-medium transition-colors ${viewMode === 'full' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Full View
                </button>
                <button
                  onClick={() => setViewMode('changes')}
                  className={`px-3 py-1.5 font-medium transition-colors ${viewMode === 'changes' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Changes Only
                </button>
              </div>
            )}
            {!diff.isCreate && diff.changedSet.size > 0 && (
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-amber-600">{diff.changedSet.size}</span> field{diff.changedSet.size !== 1 ? 's' : ''} changed
              </span>
            )}
            {diff.isCreate && (
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                <Layers2 className="w-3.5 h-3.5 text-emerald-500" />
                All fields are new
              </span>
            )}
          </div>
        </div>

        <DiffGrid diff={diff} mode={viewMode} />
      </div>
    </Modal>
  );
}
