// Icon + label + value cell for the read-only metadata grids in the
// Entity and Data Item detail modals (was duplicated as `MetaCell` / `Cell`).

import { ReactNode } from 'react';

export function MetaCell({
  icon, label, value, mono, wide,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`flex items-start gap-1.5 min-w-0 ${wide ? 'col-span-2' : ''}`}>
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
        <div className={`text-gray-800 mt-0.5 break-words ${mono ? 'font-mono text-xs' : 'text-sm font-medium'}`}>{value}</div>
      </div>
    </div>
  );
}
