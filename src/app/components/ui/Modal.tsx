// Shared modal scaffolding. Replaces the `fixed inset-0 … backdrop … panel …
// header/close` block that was copy-pasted into all 5 modals.

import { ReactNode } from 'react';
import { X } from 'lucide-react';

export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      aria-label="Close"
    >
      <X className="w-5 h-5" />
    </button>
  );
}

export function Modal({
  onClose,
  maxWidth = 'max-w-2xl',
  children,
}: {
  onClose: () => void;
  maxWidth?: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden`}>
        {children}
      </div>
    </div>
  );
}

/** The simple icon + title + subtitle + close header (Create / Edit / Advanced Search). */
export function ModalHeader({
  icon,
  iconWrapClass,
  title,
  subtitle,
  onClose,
  children,
}: {
  icon: ReactNode;
  iconWrapClass: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg ${iconWrapClass}`}>{icon}</div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        {children}
      </div>
      <CloseButton onClose={onClose} />
    </div>
  );
}
