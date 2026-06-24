// "Validate Fields" panel for the DGO review stage — surfaces soft warnings
// (see lib/validation.ts) across every item in the open submission. These
// never block anything (the board member already passed hard required-field
// validation to even get here) — this is purely advisory, helping a DGO spot
// rows that might need a closer look or a comment before forwarding to HOD.

import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal, ModalHeader } from '../ui/Modal';
import { ChangeRequest, Entity, DataItem } from '../../types';
import { getSubmissionWarnings } from '../../lib/validation';
import { RecordTypeIcon } from '../../lib/badges';

export function ValidateFieldsModal({
  items, onClose,
}: {
  items: ChangeRequest[];
  onClose: () => void;
}) {
  const results = getSubmissionWarnings(items);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  return (
    <Modal onClose={onClose} maxWidth="max-w-xl">
      <ModalHeader
        icon={<ShieldCheck className="w-5 h-5 text-purple-600" />}
        iconWrapClass="bg-purple-50"
        title="Validate Fields"
        subtitle="Soft warnings — advisory only, won't block approval"
        onClose={onClose}
      />

      <div className="overflow-y-auto flex-1 px-6 py-5">
        {results.length === 0 ? (
          <div className="flex flex-col items-center text-center py-10 text-gray-500">
            <CheckCircle2 className="w-9 h-9 text-emerald-500 mb-3" />
            <div className="text-sm font-medium text-gray-700">No soft warnings found</div>
            <div className="text-xs text-gray-400 mt-1">Every item in this request looks complete.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-xs text-gray-500">
              <span className="font-semibold text-amber-600">{totalWarnings}</span> warning{totalWarnings !== 1 ? 's' : ''} across{' '}
              <span className="font-semibold text-gray-700">{results.length}</span> item{results.length !== 1 ? 's' : ''}
            </div>
            {results.map(({ request, warnings }) => {
              const name = (request.proposedData as Entity | DataItem).name;
              return (
                <div key={request.id} className="border border-amber-200 bg-amber-50/60 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <RecordTypeIcon type={request.recordType} size="xs" boxless />
                    <span className="text-sm font-semibold text-gray-800">{name}</span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {warnings.map(w => (
                      <li key={w.field} className="flex items-start gap-1.5 text-xs text-amber-800">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500" />
                        <span>{w.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex justify-end flex-shrink-0 bg-gray-50">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">
          Close
        </button>
      </div>
    </Modal>
  );
}
