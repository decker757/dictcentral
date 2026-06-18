// Small segmented toggle (the "Via Form / Via Excel" and "Data Item / Entity"
// switches shared by the Create and Edit modals).

import { ReactNode } from 'react';

interface SegOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Tailwind classes for the active segment (e.g. "bg-blue-600 text-white"). */
  activeClass: string;
}

export function Segmented<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegOption<T>[];
}) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3.5 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${
            value === o.value ? o.activeClass : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}
