// Inline hard-error / soft-warning banner for the Create/Edit forms — shown
// after clicking "Validate Fields" (see CreateModal/EditModal's `validated`
// state). Hard errors (red) block submission; soft warnings (amber) are
// advisory only and never block — see lib/validation.ts.

import { XCircle, AlertTriangle } from 'lucide-react';
import { FieldError, SoftWarning } from '../../lib/validation';

export function ValidationSummary({ errors, warnings }: { errors: FieldError[]; warnings: SoftWarning[] }) {
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div className="col-span-2 flex flex-col gap-2">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <div className="font-semibold mb-1 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> Fix the following before continuing:
          </div>
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map(e => <li key={e.field}>{e.message}</li>)}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          <div className="font-semibold mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> Soft warnings (won't block submission):
          </div>
          <ul className="list-disc list-inside space-y-0.5">
            {warnings.map(w => <li key={w.field}>{w.message}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
